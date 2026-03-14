package com.agentic.restaurant.orders.application

import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.boot.context.event.ApplicationReadyEvent
import org.springframework.context.event.EventListener
import org.springframework.http.HttpEntity
import org.springframework.http.HttpHeaders
import org.springframework.http.MediaType
import org.springframework.stereotype.Component
import org.springframework.web.client.RestTemplate
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicReference

@Component
class StartupAuthClient(
    @Value("\${app.auth.users-service-base-url}") private val usersServiceBaseUrl: String,
    @Value("\${app.auth.application-name}") private val applicationName: String,
    @Value("\${app.auth.application-secret}") private val applicationSecret: String,
    @Value("\${app.auth.token-refresh-factor:0.8}") private val tokenRefreshFactor: Double,
) {
    private val log = LoggerFactory.getLogger(StartupAuthClient::class.java)
    private val restTemplate = RestTemplate()
    private val currentToken = AtomicReference<String>()
    private val scheduler = Executors.newSingleThreadScheduledExecutor { r ->
        Thread(r, "startup-auth-refresh").apply { isDaemon = true }
    }

    companion object {
        private const val MAX_BACKOFF_SECONDS = 30L
    }

    @EventListener(ApplicationReadyEvent::class)
    fun acquireTokenOnStartup() {
        scheduler.execute { acquireTokenWithRetry(1L) }
    }

    fun getToken(): String? = currentToken.get()

    private fun acquireTokenWithRetry(backoffSeconds: Long) {
        try {
            val result = requestToken()
            if (result != null) {
                currentToken.set(result.accessToken)
                log.info("Acquired application JWT for '{}' (expires in {}s)", applicationName, result.expiresInSeconds)
                val refreshDelay = (result.expiresInSeconds * tokenRefreshFactor).toLong()
                scheduler.schedule({ acquireTokenWithRetry(1L) }, refreshDelay, TimeUnit.SECONDS)
                return
            }
        } catch (ex: Exception) {
            log.warn("Failed to acquire application token for '{}': {}", applicationName, ex.message)
        }

        val nextBackoff = minOf(backoffSeconds * 2, MAX_BACKOFF_SECONDS)
        log.info("Retrying application token acquisition in {}s", backoffSeconds)
        scheduler.schedule({ acquireTokenWithRetry(nextBackoff) }, backoffSeconds, TimeUnit.SECONDS)
    }

    @Suppress("UNCHECKED_CAST")
    private fun requestToken(): TokenResult? {
        val headers = HttpHeaders().apply {
            contentType = MediaType.APPLICATION_JSON
        }
        val body = mapOf(
            "applicationName" to applicationName,
            "applicationSecret" to applicationSecret,
        )
        val request = HttpEntity(body, headers)
        val response = restTemplate.postForEntity(
            "$usersServiceBaseUrl/api/v1/auth/applications/token",
            request,
            Map::class.java,
        )

        val responseBody = response.body as? Map<String, Any> ?: return null
        val accessToken = responseBody["accessToken"] as? String ?: return null
        val expiresIn = (responseBody["expiresInSeconds"] as? Number)?.toLong() ?: return null

        return TokenResult(accessToken, expiresIn)
    }

    private data class TokenResult(val accessToken: String, val expiresInSeconds: Long)
}
