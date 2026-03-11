package com.agentic.restaurant.orders.api

import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.validation.annotation.Validated
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestHeader
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import com.agentic.restaurant.orders.application.OrderSubmissionResult
import com.agentic.restaurant.orders.application.OrderSubmissionService
import java.util.UUID

@RestController
@Validated
@RequestMapping("/api/v1/orders")
class OrdersController(
    private val orderSubmissionService: OrderSubmissionService,
) {

    @PutMapping("/{requestId}")
    fun submitOrder(
        @RequestHeader("Authorization", required = false) authorizationHeader: String?,
        @org.springframework.web.bind.annotation.PathVariable requestId: UUID,
        @Valid @RequestBody request: SubmitOrderRequest,
    ): ResponseEntity<Any> {
        val bearerToken = extractBearerToken(authorizationHeader) ?: return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build()

        return when (val result = orderSubmissionService.submitOrder(requestId, request, bearerToken)) {
            is OrderSubmissionResult.Accepted -> ResponseEntity.ok(result.response)
            OrderSubmissionResult.InvalidToken -> ResponseEntity.status(HttpStatus.UNAUTHORIZED).build()
            OrderSubmissionResult.UserMismatch -> ResponseEntity.status(HttpStatus.FORBIDDEN).build()
            is OrderSubmissionResult.BadRequest -> ResponseEntity.badRequest().body(mapOf("error" to result.message))
        }
    }

    private fun extractBearerToken(authorizationHeader: String?): String? {
        if (authorizationHeader.isNullOrBlank()) {
            return null
        }
        if (!authorizationHeader.startsWith("Bearer ", ignoreCase = true)) {
            return null
        }

        val token = authorizationHeader.substringAfter(" ").trim()
        return token.ifBlank { null }
    }
}
