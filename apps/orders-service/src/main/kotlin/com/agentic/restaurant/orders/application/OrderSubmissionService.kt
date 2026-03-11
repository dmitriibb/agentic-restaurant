package com.agentic.restaurant.orders.application

import com.agentic.restaurant.orders.api.SubmitOrderRequest
import com.agentic.restaurant.orders.api.SubmitOrderResponse
import com.agentic.restaurant.orders.clients.AuthValidationClient
import com.agentic.restaurant.orders.clients.MenuLookupClient
import com.agentic.restaurant.orders.persistence.OrderLineSnapshot
import com.agentic.restaurant.orders.persistence.OrderPersistence
import org.springframework.dao.DuplicateKeyException
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.math.BigDecimal
import java.math.RoundingMode
import java.util.UUID

sealed interface OrderSubmissionResult {
    data class Accepted(val response: SubmitOrderResponse) : OrderSubmissionResult
    data object InvalidToken : OrderSubmissionResult
    data object UserMismatch : OrderSubmissionResult
    data class BadRequest(val message: String) : OrderSubmissionResult
}

@Service
class OrderSubmissionService(
    private val authValidationClient: AuthValidationClient,
    private val menuLookupClient: MenuLookupClient,
    private val orderPersistence: OrderPersistence,
) {

    @Transactional
    fun submitOrder(requestId: UUID, request: SubmitOrderRequest, bearerToken: String): OrderSubmissionResult {
        val tokenValidation = authValidationClient.validateBearerToken(bearerToken)
        if (!tokenValidation.valid || tokenValidation.userId == null) {
            return OrderSubmissionResult.InvalidToken
        }

        if (tokenValidation.userId != request.userId) {
            return OrderSubmissionResult.UserMismatch
        }

        if (request.items.isEmpty()) {
            return OrderSubmissionResult.BadRequest("Order must contain at least one line")
        }

        if (request.items.any { it.quantity < 1 }) {
            return OrderSubmissionResult.BadRequest("Order line quantity must be greater than zero")
        }

        val existingOrder = orderPersistence.findOrderByUserIdAndRequestId(request.userId, requestId.toString())
        if (existingOrder != null) {
            return OrderSubmissionResult.Accepted(existingOrder.toResponse())
        }

        val itemIds = request.items.map { it.itemId }.distinct()
        val menuResolution = menuLookupClient.resolveMenuItems(itemIds)
        if (menuResolution.missingItemIds.isNotEmpty()) {
            return OrderSubmissionResult.BadRequest("Unknown menu item ids: ${menuResolution.missingItemIds.joinToString(",")}")
        }

        val resolvedById = menuResolution.items.associateBy { it.id }
        val lineSnapshots = request.items.map { line ->
            val menuItem = resolvedById[line.itemId]
                ?: return OrderSubmissionResult.BadRequest("Unknown menu item id: ${line.itemId}")
            val unitPrice = scale(BigDecimal.valueOf(menuItem.price))
            val lineTotal = scale(unitPrice.multiply(BigDecimal.valueOf(line.quantity.toLong())))
            OrderLineSnapshot(
                menuItemId = line.itemId,
                menuItemName = menuItem.name,
                unitPrice = unitPrice,
                quantity = line.quantity,
                lineTotal = lineTotal,
            )
        }

        val orderTotal = scale(lineSnapshots.fold(BigDecimal.ZERO) { acc, line -> acc + line.lineTotal })

        val createdOrder = try {
            orderPersistence.createOrder(
                requestId = requestId.toString(),
                userId = request.userId,
                status = "ACCEPTED",
                totalAmount = orderTotal,
                lineSnapshots = lineSnapshots,
            )
        } catch (_: DuplicateKeyException) {
            // Handles races between repeated requests with the same request id.
            orderPersistence.findOrderByUserIdAndRequestId(request.userId, requestId.toString())
                ?: return OrderSubmissionResult.BadRequest("Order already exists but could not be loaded")
        }

        return OrderSubmissionResult.Accepted(createdOrder.toResponse())
    }

    private fun scale(value: BigDecimal): BigDecimal = value.setScale(2, RoundingMode.HALF_UP)
}

private fun com.agentic.restaurant.orders.persistence.StoredOrder.toResponse(): SubmitOrderResponse {
    return SubmitOrderResponse(
        orderId = id,
        requestId = requestId,
        status = status,
        totalAmount = totalAmount.toDouble(),
    )
}
