package com.agentic.restaurant.orders.persistence

import java.math.BigDecimal
import java.time.Instant

data class OrderLineSnapshot(
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
