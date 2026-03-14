package com.agentic.restaurant.orders.clients

import org.springframework.beans.factory.annotation.Value
import org.springframework.http.HttpEntity
import org.springframework.http.HttpHeaders
import org.springframework.http.MediaType
import org.springframework.stereotype.Component
import org.springframework.web.client.RestTemplate

@Component
class AuthValidationClient(
    @Value("\${app.auth.users-service-base-url}") private val usersServiceBaseUrl: String,
    @Value("\${app.auth.users-service-token}") private val usersServiceToken: String,
) {
    private val restTemplate = RestTemplate()

    fun validateBearerToken(bearerToken: String): TokenValidationResult {
        val headers = HttpHeaders()
        headers.contentType = MediaType.APPLICATION_JSON
        headers["X-Service-Token"] = usersServiceToken

        val request = HttpEntity(mapOf("token" to bearerToken), headers)

        return try {
            val response = restTemplate.postForEntity(
                "$usersServiceBaseUrl/api/v1/internal/auth/validate",
                request,
                Map::class.java,
            )
            val body = response.body ?: return TokenValidationResult(valid = false)
            val valid = body["valid"] as? Boolean ?: false
            val userId = (body["userId"] as? Number)?.toLong()
            val clientType = body["clientType"] as? String
            val displayName = body["displayName"] as? String
            TokenValidationResult(valid = valid, userId = userId, clientType = clientType, displayName = displayName)
        } catch (_: Exception) {
            TokenValidationResult(valid = false)
        }
    }
}
