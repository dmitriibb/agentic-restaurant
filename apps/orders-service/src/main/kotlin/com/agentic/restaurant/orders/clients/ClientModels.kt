package com.agentic.restaurant.orders.clients

data class TokenValidationResult(
    val valid: Boolean,
    val userId: Long? = null,
    val clientType: String? = null,
    val displayName: String? = null,
)

data class MenuResolutionResult(
    val items: List<ResolvedMenuItem>,
    val missingItemIds: List<Long>,
)

data class ResolvedMenuItem(
    val id: Long,
    val name: String,
    val price: Double,
)
