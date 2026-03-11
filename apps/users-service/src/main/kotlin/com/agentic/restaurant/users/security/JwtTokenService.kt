package com.agentic.restaurant.users.security

import com.agentic.restaurant.users.domain.UserAccount
import io.jsonwebtoken.Claims
import io.jsonwebtoken.ExpiredJwtException
import io.jsonwebtoken.Jwts
import io.jsonwebtoken.security.Keys
import java.nio.charset.StandardCharsets
import java.time.Instant
import java.time.temporal.ChronoUnit
import java.util.Date
import javax.crypto.SecretKey
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Component

@Component
class JwtTokenService(
    @Value("\${app.security.jwt-secret}") jwtSecret: String,
    @Value("\${app.security.jwt-expiration-seconds:3600}") private val expirationSeconds: Long,
) {
    private val signingKey: SecretKey = Keys.hmacShaKeyFor(jwtSecret.toByteArray(StandardCharsets.UTF_8))

    fun issueToken(user: UserAccount, now: Instant = Instant.now()): String =
        Jwts.builder()
            .subject(user.id.toString())
            .claim("login", user.login)
            .claim("roles", user.roles)
            .issuedAt(Date.from(now))
            .expiration(Date.from(now.plus(expirationSeconds, ChronoUnit.SECONDS)))
            .signWith(signingKey)
            .compact()

    fun issueExpiredToken(user: UserAccount, now: Instant = Instant.now()): String =
        Jwts.builder()
            .subject(user.id.toString())
            .claim("login", user.login)
            .claim("roles", user.roles)
            .issuedAt(Date.from(now.minusSeconds(3700)))
            .expiration(Date.from(now.minusSeconds(100)))
            .signWith(signingKey)
            .compact()

    fun parse(token: String): JwtParseResult =
        try {
            val claims = Jwts.parser()
                .verifyWith(signingKey)
                .build()
                .parseSignedClaims(token)
                .payload
            JwtParseResult.Valid(claims)
        } catch (_: ExpiredJwtException) {
            JwtParseResult.Expired
        } catch (_: Exception) {
            JwtParseResult.Invalid
        }
}

sealed interface JwtParseResult {
    data class Valid(val claims: Claims) : JwtParseResult
    data object Expired : JwtParseResult
    data object Invalid : JwtParseResult
}
