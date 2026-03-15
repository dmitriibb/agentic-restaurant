package com.agentic.restaurant.orders.persistence

import java.math.BigDecimal
import java.time.Instant

data class OrderLineSnapshot(
    val lineNumber: Int,
    val menuItemId: Long,
    val menuItemName: String,
    val unitPrice: BigDecimal,
    val quantity: Int,
    val lineTotal: BigDecimal,
)

data class StoredOrder(
    val id: Long,
    val requestId: String,
    val userId: Long,
    val status: String,
    val totalAmount: BigDecimal,
    val createdAt: Instant,
    val userDisplayName: String? = null,
)

data class OutboxEvent(
    val eventId: String,
    val aggregateType: String,
    val aggregateId: Long,
    val eventType: String,
    val routingKey: String,
    val producer: String,
    val correlationId: String,
    val occurredAt: Instant,
    val payloadJson: String,
)

data class PendingOutboxEvent(
    val eventId: String,
    val routingKey: String,
    val payloadJson: String,
)
