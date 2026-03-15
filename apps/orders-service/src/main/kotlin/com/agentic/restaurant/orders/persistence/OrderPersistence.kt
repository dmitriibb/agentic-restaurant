package com.agentic.restaurant.orders.persistence

import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.jdbc.core.RowMapper
import org.springframework.jdbc.support.GeneratedKeyHolder
import org.springframework.stereotype.Repository
import org.springframework.transaction.annotation.Transactional
import java.math.BigDecimal
import java.sql.Timestamp
import java.sql.Types
import java.time.Instant

@Repository
class OrderPersistence(
    private val jdbcTemplate: JdbcTemplate,
) {

    private val orderRowMapper = RowMapper<StoredOrder> { rs, _ ->
        StoredOrder(
            id = rs.getLong("id"),
            requestId = rs.getString("external_request_id"),
            userId = rs.getLong("user_id"),
            status = rs.getString("status"),
            totalAmount = rs.getBigDecimal("total_amount"),
            createdAt = rs.getTimestamp("created_at").toInstant(),
            userDisplayName = rs.getString("user_display_name"),
        )
    }

    fun findOrderByUserIdAndRequestId(userId: Long, requestId: String): StoredOrder? {
        return jdbcTemplate.query(
            """
            SELECT id, external_request_id, user_id, status, total_amount, created_at, user_display_name
            FROM orders
            WHERE user_id = ? AND external_request_id = ?
            """.trimIndent(),
            orderRowMapper,
            userId,
            requestId,
        ).firstOrNull()
    }

    @Transactional
    fun createOrder(
        requestId: String,
        userId: Long,
        status: String,
        totalAmount: BigDecimal,
        lineSnapshots: List<OrderLineSnapshot>,
        userDisplayName: String? = null,
    ): StoredOrder {
        val keyHolder = GeneratedKeyHolder()
        jdbcTemplate.update(
            { connection ->
                val statement = connection.prepareStatement(
                    """
                    INSERT INTO orders (external_request_id, user_id, status, total_amount, user_display_name)
                    VALUES (?, ?, ?, ?, ?)
                    """.trimIndent(),
                    arrayOf("id"),
                )
                statement.setString(1, requestId)
                statement.setLong(2, userId)
                statement.setString(3, status)
                statement.setBigDecimal(4, totalAmount)
                if (userDisplayName != null) {
                    statement.setString(5, userDisplayName)
                } else {
                    statement.setNull(5, Types.VARCHAR)
                }
                statement
            },
            keyHolder,
        )

        val orderId = keyHolder.key?.toLong()
            ?: error("Could not read generated order id")

        batchInsertOrderLines(orderId, lineSnapshots)

        return StoredOrder(
            id = orderId,
            requestId = requestId,
            userId = userId,
            status = status,
            totalAmount = totalAmount,
            createdAt = findCreatedAt(orderId),
            userDisplayName = userDisplayName,
        )
    }

    private fun batchInsertOrderLines(orderId: Long, lineSnapshots: List<OrderLineSnapshot>) {
        jdbcTemplate.batchUpdate(
            """
            INSERT INTO order_lines (order_id, line_number, menu_item_id, menu_item_name, unit_price, quantity, line_total)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """.trimIndent(),
            lineSnapshots,
            lineSnapshots.size,
        ) { ps, line ->
            ps.setLong(1, orderId)
            ps.setInt(2, line.lineNumber)
            ps.setLong(3, line.menuItemId)
            ps.setString(4, line.menuItemName)
            ps.setBigDecimal(5, line.unitPrice)
            ps.setInt(6, line.quantity)
            ps.setBigDecimal(7, line.lineTotal)
        }
    }

    private fun batchInsertOutboxEvents(outboxEvents: List<OutboxEvent>) {
        if (outboxEvents.isEmpty()) {
            return
        }
        jdbcTemplate.batchUpdate(
            """
            INSERT INTO order_outbox_events (
                event_id,
                aggregate_type,
                aggregate_id,
                event_type,
                routing_key,
                producer,
                correlation_id,
                occurred_at,
                payload_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """.trimIndent(),
            outboxEvents,
            outboxEvents.size,
        ) { ps, event ->
            ps.setString(1, event.eventId)
            ps.setString(2, event.aggregateType)
            ps.setLong(3, event.aggregateId)
            ps.setString(4, event.eventType)
            ps.setString(5, event.routingKey)
            ps.setString(6, event.producer)
            ps.setString(7, event.correlationId)
            ps.setTimestamp(8, Timestamp.from(event.occurredAt))
            ps.setString(9, event.payloadJson)
        }
    }

    fun insertOutboxEvents(outboxEvents: List<OutboxEvent>) {
        batchInsertOutboxEvents(outboxEvents)
    }

    fun findUnpublishedOutboxEvents(limit: Int): List<PendingOutboxEvent> {
        return jdbcTemplate.query(
            """
            SELECT event_id, routing_key, payload_json
            FROM order_outbox_events
            WHERE published_at IS NULL
            ORDER BY created_at ASC
            LIMIT ?
            """.trimIndent(),
            { rs, _ ->
                PendingOutboxEvent(
                    eventId = rs.getString("event_id"),
                    routingKey = rs.getString("routing_key"),
                    payloadJson = rs.getString("payload_json"),
                )
            },
            limit,
        )
    }

    fun markOutboxEventPublished(eventId: String) {
        jdbcTemplate.update(
            """
            UPDATE order_outbox_events
            SET published_at = CURRENT_TIMESTAMP
            WHERE event_id = ? AND published_at IS NULL
            """.trimIndent(),
            eventId,
        )
    }

    private fun findCreatedAt(orderId: Long): Instant {
        return jdbcTemplate.queryForObject(
            "SELECT created_at FROM orders WHERE id = ?",
            arrayOf(orderId),
            intArrayOf(Types.BIGINT),
        ) { rs, _ ->
            (rs.getObject(1) as Timestamp).toInstant()
        } ?: Instant.now()
    }
}
