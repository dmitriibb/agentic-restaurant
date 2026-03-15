package com.agentic.restaurant.orders.application

import com.agentic.restaurant.orders.persistence.OrderLineSnapshot
import com.agentic.restaurant.orders.persistence.OutboxEvent
import com.fasterxml.jackson.databind.ObjectMapper
import java.time.Instant
import java.util.UUID

data class ProductionItemRequestedEventEnvelope(
    val eventId: String,
    val eventType: String,
    val occurredAt: Instant,
    val producer: String,
    val correlationId: String,
    val payload: ProductionItemRequestedPayload,
)

data class ProductionItemRequestedPayload(
    val orderId: Long,
    val requestId: String,
    val userId: Long,
    val userDisplayName: String?,
    val lineNumber: Int,
    val unitSequence: Int,
    val totalItemCount: Int,
    val menuItemId: Long,
    val menuItemName: String,
    val stationKey: String,
    val createdAt: Instant,
)

fun buildProductionItemRequestedOutboxEvents(
    objectMapper: ObjectMapper,
    orderId: Long,
    requestId: String,
    userId: Long,
    userDisplayName: String?,
    lineSnapshots: List<OrderLineSnapshot>,
    occurredAt: Instant,
    routingKey: String,
    producer: String = "orders-service",
    stationKey: String = "kitchen",
): List<OutboxEvent> {
    val totalItemCount = lineSnapshots.sumOf { it.quantity }
    return lineSnapshots.flatMap { line ->
        (1..line.quantity).map { unitSequence ->
            val eventId = UUID.randomUUID().toString()
            val payload = ProductionItemRequestedPayload(
                orderId = orderId,
                requestId = requestId,
                userId = userId,
                userDisplayName = userDisplayName,
                lineNumber = line.lineNumber,
                unitSequence = unitSequence,
                totalItemCount = totalItemCount,
                menuItemId = line.menuItemId,
                menuItemName = line.menuItemName,
                stationKey = stationKey,
                createdAt = occurredAt,
            )
            val envelope = ProductionItemRequestedEventEnvelope(
                eventId = eventId,
                eventType = "production.item.requested.v1",
                occurredAt = occurredAt,
                producer = producer,
                correlationId = requestId,
                payload = payload,
            )
            OutboxEvent(
                eventId = eventId,
                aggregateType = "order",
                aggregateId = orderId,
                eventType = envelope.eventType,
                routingKey = routingKey,
                producer = producer,
                correlationId = requestId,
                occurredAt = occurredAt,
                payloadJson = objectMapper.writeValueAsString(envelope),
            )
        }
    }
}
