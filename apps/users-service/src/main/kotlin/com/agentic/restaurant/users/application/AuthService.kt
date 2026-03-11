package com.agentic.restaurant.users.application

import com.agentic.restaurant.users.api.LoginResponse
import com.agentic.restaurant.users.api.UserSummary
import com.agentic.restaurant.users.api.ValidateTokenResponse
import com.agentic.restaurant.users.domain.UserStatus
import com.agentic.restaurant.users.persistence.UserRepository
import com.agentic.restaurant.users.security.JwtParseResult
import com.agentic.restaurant.users.security.JwtTokenService
import com.agentic.restaurant.users.security.PasswordHasher
import java.time.Instant
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service

@Service
class AuthService(
    private val userRepository: UserRepository,
    private val passwordHasher: PasswordHasher,
    private val jwtTokenService: JwtTokenService,
    @Value("\${app.security.jwt-expiration-seconds:3600}") private val jwtExpirationSeconds: Long,
    @Value("\${app.security.internal-service-token}") private val internalServiceToken: String,
) {

    fun login(login: String, password: String): LoginResponse? {
        val user = userRepository.findByLogin(login) ?: return null
        if (user.status != UserStatus.ACTIVE) {
            return null
        }
        if (!passwordHasher.verify(password, user.passwordHash)) {
            return null
        }

        val token = jwtTokenService.issueToken(user)
        return LoginResponse(
            accessToken = token,
            expiresInSeconds = jwtExpirationSeconds,
            user = UserSummary(
                id = user.id,
                login = user.login,
            ),
        )
    }

    fun validateToken(token: String): ValidateTokenResponse {
        return when (val parseResult = jwtTokenService.parse(token)) {
            is JwtParseResult.Invalid -> ValidateTokenResponse(valid = false)
            is JwtParseResult.Expired -> ValidateTokenResponse(valid = false)
            is JwtParseResult.Valid -> {
                val userId = parseResult.claims.subject.toLongOrNull() ?: return ValidateTokenResponse(valid = false)
                val user = userRepository.findById(userId)
                if (user == null || user.status != UserStatus.ACTIVE) {
                    return ValidateTokenResponse(valid = false)
                }
                @Suppress("UNCHECKED_CAST")
                val roles = parseResult.claims["roles"] as? List<String> ?: emptyList()
                val login = parseResult.claims["login"] as? String ?: user.login
                val expiresAt = parseResult.claims.expiration?.toInstant() ?: Instant.EPOCH
                ValidateTokenResponse(
                    valid = true,
                    userId = userId,
                    login = login,
                    roles = roles,
                    expiresAt = expiresAt,
                )
            }
        }
    }

    fun hasValidServiceToken(requestToken: String?): Boolean = requestToken == internalServiceToken
}
