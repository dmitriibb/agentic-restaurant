package com.agentic.restaurant.users.api

import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size
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
    val displayName: String? = null,
    val clientType: String? = null,
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

// Application token DTOs

data class ApplicationTokenRequest(
    @field:NotBlank
    val applicationName: String,
    @field:NotBlank
    val applicationSecret: String,
)

data class ApplicationTokenResponse(
    val accessToken: String,
    val tokenType: String = "Bearer",
    val expiresInSeconds: Long,
    val user: UserSummary,
)

// Guest user DTOs

data class CreateGuestRequest(
    @field:NotBlank
    @field:Size(max = 100)
    val displayName: String,
)

data class CreateGuestResponse(
    val accessToken: String,
    val tokenType: String = "Bearer",
    val expiresInSeconds: Long,
    val user: UserSummary,
)
