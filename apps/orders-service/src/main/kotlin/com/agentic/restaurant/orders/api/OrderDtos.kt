package com.agentic.restaurant.orders.api

import jakarta.validation.Valid
import jakarta.validation.constraints.Min
import jakarta.validation.constraints.NotEmpty
import jakarta.validation.constraints.NotNull
import jakarta.validation.constraints.Positive

/**
 * Contract-facing DTOs for order submission.
 */
data class SubmitOrderRequest(
    @field:NotNull
    @field:Positive
    val userId: Long,
    @field:NotEmpty
    val items: List<@Valid OrderLineRequest>,
)

data class OrderLineRequest(
    @field:NotNull
    @field:Positive
    val itemId: Long,
    @field:NotNull
    @field:Min(1)
    val quantity: Int,
)

data class SubmitOrderResponse(
    val orderId: Long,
    val requestId: String,
    val status: String,
    val totalAmount: Double,
)
