package com.agentic.restaurant.users.api

import com.agentic.restaurant.users.application.ApplicationTokenResult
import com.agentic.restaurant.users.application.AuthService
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.validation.annotation.Validated
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestHeader
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@Validated
@RequestMapping("/api/v1")
class AuthController(
    private val authService: AuthService,
) {

    @PostMapping("/auth/login")
    fun login(@Valid @RequestBody request: LoginRequest): ResponseEntity<LoginResponse> {
        val loginResponse = authService.login(request.login, request.password) ?: return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build()
        return ResponseEntity.ok(loginResponse)
    }

    @PostMapping("/auth/applications/token")
    fun acquireApplicationToken(@Valid @RequestBody request: ApplicationTokenRequest): ResponseEntity<ApplicationTokenResponse> {
        return when (val result = authService.acquireApplicationToken(request.applicationName, request.applicationSecret)) {
            is ApplicationTokenResult.Success -> ResponseEntity.ok(result.response)
            is ApplicationTokenResult.Unauthorized -> ResponseEntity.status(HttpStatus.UNAUTHORIZED).build()
            is ApplicationTokenResult.Forbidden -> ResponseEntity.status(HttpStatus.FORBIDDEN).build()
            is ApplicationTokenResult.PoolExhausted -> ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).build()
        }
    }

    @PostMapping("/internal/auth/validate")
    fun validateToken(
        @RequestHeader("X-Service-Token", required = false) serviceToken: String?,
        @Valid @RequestBody request: ValidateTokenRequest,
    ): ResponseEntity<ValidateTokenResponse> {
        if (!authService.hasValidServiceToken(serviceToken)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build()
        }
        return ResponseEntity.ok(authService.validateToken(request.token))
    }
}
