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
        )
    }

    fun findOrderByUserIdAndRequestId(userId: Long, requestId: String): StoredOrder? {
        return jdbcTemplate.query(
            """
            SELECT id, external_request_id, user_id, status, total_amount, created_at
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
    ): StoredOrder {
        val keyHolder = GeneratedKeyHolder()
        jdbcTemplate.update(
            { connection ->
                val statement = connection.prepareStatement(
                    """
                    INSERT INTO orders (external_request_id, user_id, status, total_amount)
                    VALUES (?, ?, ?, ?)
                    """.trimIndent(),
                    arrayOf("id"),
                )
                statement.setString(1, requestId)
                statement.setLong(2, userId)
                statement.setString(3, status)
                statement.setBigDecimal(4, totalAmount)
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
        )
    }

    private fun batchInsertOrderLines(orderId: Long, lineSnapshots: List<OrderLineSnapshot>) {
        jdbcTemplate.batchUpdate(
            """
            INSERT INTO order_lines (order_id, menu_item_id, menu_item_name, unit_price, quantity, line_total)
            VALUES (?, ?, ?, ?, ?, ?)
            """.trimIndent(),
            lineSnapshots,
            lineSnapshots.size,
        ) { ps, line ->
            ps.setLong(1, orderId)
            ps.setLong(2, line.menuItemId)
            ps.setString(3, line.menuItemName)
            ps.setBigDecimal(4, line.unitPrice)
            ps.setInt(5, line.quantity)
            ps.setBigDecimal(6, line.lineTotal)
        }
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
