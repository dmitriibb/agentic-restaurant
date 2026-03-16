package com.agentic.restaurant.users

import com.agentic.restaurant.users.api.ValidateTokenRequest
import com.agentic.restaurant.users.api.ValidateTokenResponse
import com.agentic.restaurant.users.application.GuestArchivalJob
import com.agentic.restaurant.users.persistence.UserRepository
import com.agentic.restaurant.users.security.JwtTokenService
import com.agentic.restaurant.users.security.PasswordHasher
import io.jsonwebtoken.Jwts
import io.jsonwebtoken.security.Keys
import java.nio.charset.StandardCharsets
import java.time.Instant
import java.time.temporal.ChronoUnit
import java.util.Date
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.test.web.client.TestRestTemplate
import org.springframework.http.HttpEntity
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.test.context.ActiveProfiles

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("integration")
class UsersServiceApplicationTests {

    @Autowired
    lateinit var jdbcTemplate: JdbcTemplate

    @Autowired
    lateinit var restTemplate: TestRestTemplate

    @Autowired
    lateinit var jwtTokenService: JwtTokenService

    @Autowired
    lateinit var userRepository: UserRepository

    @Autowired
    lateinit var passwordHasher: PasswordHasher

    @Autowired
    lateinit var guestArchivalJob: GuestArchivalJob

    @Test
    fun `liquibase seeds admin user and applications`() {
        val usersCount = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM users WHERE id IN (1006, 1007, 1008)",
            java.lang.Integer::class.java,
        )
        assertThat(usersCount).isEqualTo(3)

        val applicationsCount = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM applications",
            java.lang.Integer::class.java,
        )
        assertThat(applicationsCount).isEqualTo(5)
    }

    @Test
    fun `admin user has correct client_type and display_name after migration`() {
        val clientType = jdbcTemplate.queryForObject(
            "SELECT client_type FROM users WHERE id = 1006",
            String::class.java,
        )
        assertThat(clientType).isEqualTo("REGISTERED_USER")

        val displayName = jdbcTemplate.queryForObject(
            "SELECT display_name FROM users WHERE id = 1006",
            String::class.java,
        )
        assertThat(displayName).isEqualTo("admin")
    }

    @Test
    fun `demo users are removed after migration`() {
        val demoCount = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM users WHERE id IN (1001, 1002, 1003, 1004, 1005)",
            java.lang.Integer::class.java,
        )
        assertThat(demoCount).isEqualTo(0)
    }

    @Test
    fun `password_hash column is nullable`() {
        // Verify we can insert a user with NULL password_hash (guest user scenario)
        jdbcTemplate.update(
            "INSERT INTO users (login, password_hash, status, roles, client_type, display_name) VALUES (?, NULL, 'ACTIVE', 'CUSTOMER', 'GUEST_USER', ?)",
            "test-guest-nullable",
            "Test Guest",
        )
        val user = userRepository.findByLogin("test-guest-nullable")
        assertThat(user).isNotNull
        assertThat(user!!.passwordHash).isNull()
        // Clean up
        jdbcTemplate.update("DELETE FROM users WHERE login = ?", "test-guest-nullable")
    }

    @Test
    fun `applications table has seeded records`() {
        val apps = jdbcTemplate.queryForList(
            "SELECT application_name, status, max_pool_size FROM applications ORDER BY id",
        )
        assertThat(apps).hasSize(5)
        assertThat(apps[0]["application_name"]).isEqualTo("orders-client")
        assertThat(apps[0]["status"]).isEqualTo("ACTIVE")
        assertThat(apps[0]["max_pool_size"]).isEqualTo(30)
        assertThat(apps[1]["application_name"]).isEqualTo("menu-service")
        assertThat(apps[2]["application_name"]).isEqualTo("orders-service")
        assertThat(apps[3]["application_name"]).isEqualTo("production-service")
        assertThat(apps[4]["application_name"]).isEqualTo("staff-client-display")
    }

    @Test
    fun `application token endpoint issues token for staff display application`() {
        val request = mapOf(
            "applicationName" to "staff-client-display",
            "applicationSecret" to "staff-client-display-secret",
        )

        val response = restTemplate.postForEntity("/api/v1/auth/applications/token", request, Map::class.java)

        assertThat(response.statusCode).isEqualTo(HttpStatus.OK)
        assertThat(response.body?.get("accessToken")).isInstanceOf(String::class.java)
        assertThat(response.body?.get("expiresInSeconds")).isEqualTo(3600)

        @Suppress("UNCHECKED_CAST")
        val user = response.body?.get("user") as Map<String, Any>
        assertThat(user["clientType"]).isEqualTo("APPLICATION")
    }

    @Test
    fun `login endpoint authenticates admin default credentials`() {
        val request = mapOf(
            "login" to "admin",
            "password" to "admin",
        )

        val response = restTemplate.postForEntity("/api/v1/auth/login", request, Map::class.java)

        assertThat(response.statusCode).isEqualTo(HttpStatus.OK)
        assertThat(response.body?.get("accessToken")).isInstanceOf(String::class.java)
        assertThat(response.body?.get("expiresInSeconds")).isEqualTo(3600)
        @Suppress("UNCHECKED_CAST")
        val user = response.body?.get("user") as Map<String, Any>
        assertThat(user["login"]).isEqualTo("admin")
        assertThat(user["clientType"]).isEqualTo("REGISTERED_USER")
        assertThat(user["displayName"]).isEqualTo("admin")
    }

    @Test
    fun `login endpoint rejects invalid credentials`() {
        val request = mapOf(
            "login" to "admin",
            "password" to "wrong-password",
        )

        val response = restTemplate.postForEntity("/api/v1/auth/login", request, String::class.java)

        assertThat(response.statusCode).isEqualTo(HttpStatus.UNAUTHORIZED)
    }

    @Test
    fun `login endpoint rejects non-existent user`() {
        val request = mapOf(
            "login" to "nonexistent",
            "password" to "password",
        )

        val response = restTemplate.postForEntity("/api/v1/auth/login", request, String::class.java)

        assertThat(response.statusCode).isEqualTo(HttpStatus.UNAUTHORIZED)
    }

    @Test
    fun `internal validation returns claims for valid token`() {
        val loginResponse = restTemplate.postForEntity(
            "/api/v1/auth/login",
            mapOf("login" to "admin", "password" to "admin"),
            Map::class.java,
        )
        val token = loginResponse.body?.get("accessToken") as String

        val headers = HttpHeaders()
        headers.contentType = MediaType.APPLICATION_JSON
        headers["X-Service-Token"] = "integration-service-token"
        val entity = HttpEntity(ValidateTokenRequest(token), headers)

        val response = restTemplate.postForEntity(
            "/api/v1/internal/auth/validate",
            entity,
            ValidateTokenResponse::class.java,
        )

        assertThat(response.statusCode).isEqualTo(HttpStatus.OK)
        assertThat(response.body?.valid).isTrue()
        assertThat(response.body?.login).isEqualTo("admin")
        assertThat(response.body?.roles).contains("ADMIN")
        assertThat(response.body?.clientType).isEqualTo("REGISTERED_USER")
        assertThat(response.body?.displayName).isEqualTo("admin")
    }

    @Test
    fun `internal validation returns invalid false for expired token`() {
        val user = userRepository.findByLogin("admin")!!
        val expiredToken = jwtTokenService.issueExpiredToken(user)

        val headers = HttpHeaders()
        headers.contentType = MediaType.APPLICATION_JSON
        headers["X-Service-Token"] = "integration-service-token"
        val entity = HttpEntity(ValidateTokenRequest(expiredToken), headers)

        val response = restTemplate.postForEntity(
            "/api/v1/internal/auth/validate",
            entity,
            ValidateTokenResponse::class.java,
        )

        assertThat(response.statusCode).isEqualTo(HttpStatus.OK)
        assertThat(response.body?.valid).isFalse()
    }

    @Test
    fun `internal validation rejects missing service token`() {
        val loginResponse = restTemplate.postForEntity(
            "/api/v1/auth/login",
            mapOf("login" to "admin", "password" to "admin"),
            Map::class.java,
        )
        val token = loginResponse.body?.get("accessToken") as String

        val headers = HttpHeaders()
        headers.contentType = MediaType.APPLICATION_JSON
        val entity = HttpEntity(ValidateTokenRequest(token), headers)

        val response = restTemplate.postForEntity(
            "/api/v1/internal/auth/validate",
            entity,
            String::class.java,
        )

        assertThat(response.statusCode).isEqualTo(HttpStatus.FORBIDDEN)
    }

    @Test
    fun `login endpoint rejects guest user`() {
        // Insert a guest user with a password (edge case: guest with password should still be rejected)
        jdbcTemplate.update(
            "INSERT INTO users (login, password_hash, status, roles, client_type, display_name) VALUES (?, ?, 'ACTIVE', 'CUSTOMER', 'GUEST_USER', ?)",
            "test-guest-login",
            passwordHasher.hash("guest-password"),
            "Test Guest",
        )
        try {
            val request = mapOf("login" to "test-guest-login", "password" to "guest-password")
            val response = restTemplate.postForEntity("/api/v1/auth/login", request, String::class.java)
            assertThat(response.statusCode).isEqualTo(HttpStatus.UNAUTHORIZED)
        } finally {
            jdbcTemplate.update("DELETE FROM users WHERE login = ?", "test-guest-login")
        }
    }

    @Test
    fun `login updates last_active_at`() {
        val response = restTemplate.postForEntity(
            "/api/v1/auth/login",
            mapOf("login" to "admin", "password" to "admin"),
            Map::class.java,
        )
        assertThat(response.statusCode).isEqualTo(HttpStatus.OK)

        val lastActiveAt = jdbcTemplate.queryForObject(
            "SELECT last_active_at FROM users WHERE login = 'admin'",
            java.sql.Timestamp::class.java,
        )
        assertThat(lastActiveAt).isNotNull()
    }

    @Test
    fun `validation defaults clientType to REGISTERED_USER for legacy tokens`() {
        val user = userRepository.findByLogin("admin")!!
        // Build a token without clientType claim to simulate legacy token
        val legacyToken = buildLegacyToken(user.id, user.login, user.roles)

        val headers = HttpHeaders()
        headers.contentType = MediaType.APPLICATION_JSON
        headers["X-Service-Token"] = "integration-service-token"
        val entity = HttpEntity(ValidateTokenRequest(legacyToken), headers)

        val response = restTemplate.postForEntity(
            "/api/v1/internal/auth/validate",
            entity,
            ValidateTokenResponse::class.java,
        )

        assertThat(response.statusCode).isEqualTo(HttpStatus.OK)
        assertThat(response.body?.valid).isTrue()
        assertThat(response.body?.clientType).isEqualTo("REGISTERED_USER")
        assertThat(response.body?.login).isEqualTo("admin")
    }

    @Test
    fun `guest archival disables guests older than retention period`() {
        // Insert an old guest (created 10 days ago)
        jdbcTemplate.update(
            "INSERT INTO users (login, password_hash, status, roles, client_type, display_name, created_at) VALUES (?, NULL, 'ACTIVE', 'CUSTOMER', 'GUEST_USER', ?, TIMESTAMPADD(DAY, -10, CURRENT_TIMESTAMP))",
            "test-old-guest",
            "Old Guest",
        )
        // Insert a recent guest
        jdbcTemplate.update(
            "INSERT INTO users (login, password_hash, status, roles, client_type, display_name) VALUES (?, NULL, 'ACTIVE', 'CUSTOMER', 'GUEST_USER', ?)",
            "test-recent-guest",
            "Recent Guest",
        )
        try {
            guestArchivalJob.archiveExpiredGuests()

            val oldStatus = jdbcTemplate.queryForObject(
                "SELECT status FROM users WHERE login = 'test-old-guest'",
                String::class.java,
            )
            assertThat(oldStatus).isEqualTo("DISABLED")

            val recentStatus = jdbcTemplate.queryForObject(
                "SELECT status FROM users WHERE login = 'test-recent-guest'",
                String::class.java,
            )
            assertThat(recentStatus).isEqualTo("ACTIVE")
        } finally {
            jdbcTemplate.update("DELETE FROM users WHERE login IN ('test-old-guest', 'test-recent-guest')")
        }
    }

    private fun buildLegacyToken(userId: Long, login: String, roles: List<String>): String {
        val secret = "integration-test-jwt-secret-key-0123456789"
        val key = Keys.hmacShaKeyFor(secret.toByteArray(StandardCharsets.UTF_8))
        val now = Instant.now()
        return Jwts.builder()
            .subject(userId.toString())
            .claim("login", login)
            .claim("roles", roles)
            .issuedAt(Date.from(now))
            .expiration(Date.from(now.plus(1, ChronoUnit.HOURS)))
            .signWith(key)
            .compact()
    }
}
