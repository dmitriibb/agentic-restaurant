package com.agentic.restaurant.users.application

import com.agentic.restaurant.users.api.ApplicationTokenResponse
import com.agentic.restaurant.users.api.LoginResponse
import com.agentic.restaurant.users.api.UserSummary
import com.agentic.restaurant.users.api.ValidateTokenResponse
import com.agentic.restaurant.users.domain.ApplicationStatus
import com.agentic.restaurant.users.domain.ClientType
import com.agentic.restaurant.users.domain.UserAccount
import com.agentic.restaurant.users.domain.UserStatus
import com.agentic.restaurant.users.persistence.ApplicationRepository
import com.agentic.restaurant.users.persistence.UserRepository
import com.agentic.restaurant.users.security.JwtParseResult
import com.agentic.restaurant.users.security.JwtTokenService
import com.agentic.restaurant.users.security.PasswordHasher
import java.time.Instant
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

sealed class ApplicationTokenResult {
    data class Success(val response: ApplicationTokenResponse) : ApplicationTokenResult()
    data object Unauthorized : ApplicationTokenResult()
    data object Forbidden : ApplicationTokenResult()
    data object PoolExhausted : ApplicationTokenResult()
}

@Service
class AuthService(
    private val userRepository: UserRepository,
    private val applicationRepository: ApplicationRepository,
    private val passwordHasher: PasswordHasher,
    private val jwtTokenService: JwtTokenService,
    @Value("\${app.security.jwt-expiration-seconds:3600}") private val jwtExpirationSeconds: Long,
    @Value("\${app.security.internal-service-token}") private val internalServiceToken: String,
    @Value("\${app.security.application-inactive-threshold-minutes:10}") private val applicationInactiveThresholdMinutes: Int,
) {

    fun login(login: String, password: String): LoginResponse? {
        val user = userRepository.findByLogin(login) ?: return null
        if (user.status != UserStatus.ACTIVE) {
            return null
        }
        if (user.passwordHash == null || !passwordHasher.verify(password, user.passwordHash)) {
            return null
        }

        val token = jwtTokenService.issueToken(user)
        return LoginResponse(
            accessToken = token,
            expiresInSeconds = jwtExpirationSeconds,
            user = UserSummary(
                id = user.id,
                login = user.login,
                clientType = user.clientType.name,
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

    @Transactional
    fun acquireApplicationToken(applicationName: String, applicationSecret: String): ApplicationTokenResult {
        val application = applicationRepository.findByApplicationName(applicationName)
            ?: return ApplicationTokenResult.Unauthorized

        if (!passwordHasher.verify(applicationSecret, application.secretHash)) {
            return ApplicationTokenResult.Unauthorized
        }

        if (application.status != ApplicationStatus.ACTIVE) {
            return ApplicationTokenResult.Forbidden
        }

        // Try to find an available (inactive) pool user
        val existingPoolUser = userRepository.findAvailablePoolUser(
            applicationId = application.id,
            inactiveThresholdMinutes = applicationInactiveThresholdMinutes,
        )

        val poolUser: UserAccount = if (existingPoolUser != null) {
            // Reclaim the inactive pool user
            userRepository.updateLastActiveAt(existingPoolUser.id)
            existingPoolUser
        } else {
            // No available pool user; check if we can create a new one
            val currentPoolSize = userRepository.countByApplicationId(application.id)
            if (currentPoolSize >= application.maxPoolSize) {
                return ApplicationTokenResult.PoolExhausted
            }

            val sequenceNumber = currentPoolSize + 1
            val newUser = UserAccount(
                id = 0,
                login = "app-${applicationName}-$sequenceNumber",
                passwordHash = null,
                status = UserStatus.ACTIVE,
                roles = listOf("SERVICE"),
                clientType = ClientType.APPLICATION,
                displayName = null,
                applicationId = application.id,
                lastActiveAt = null,
            )
            userRepository.createUser(newUser)
        }

        val token = jwtTokenService.issueToken(poolUser)
        return ApplicationTokenResult.Success(
            ApplicationTokenResponse(
                accessToken = token,
                expiresInSeconds = jwtExpirationSeconds,
                user = UserSummary(
                    id = poolUser.id,
                    login = poolUser.login,
                    clientType = poolUser.clientType.name,
                ),
            ),
        )
    }

    fun hasValidServiceToken(requestToken: String?): Boolean = requestToken == internalServiceToken
}
