package com.agentic.restaurant.users.api

import jakarta.validation.constraints.NotBlank
import java.time.Instant

data class LoginRequest(
    @field:NotBlank
    val login: String,
    @field:NotBlank
    val password: String,
)

data class LoginResponse(
    val accessToken: String,
    val tokenType: String = "Bearer",
    val expiresInSeconds: Long,
    val user: UserSummary,
)

data class UserSummary(
    val id: Long,
    val login: String,
)

data class ValidateTokenRequest(
    @field:NotBlank
    val token: String,
)

data class ValidateTokenResponse(
    val valid: Boolean,
    val userId: Long? = null,
    val login: String? = null,
    val roles: List<String> = emptyList(),
    val expiresAt: Instant? = null,
)
