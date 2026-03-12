package com.agentic.restaurant.users

import com.agentic.restaurant.users.api.ValidateTokenRequest
import com.agentic.restaurant.users.api.ValidateTokenResponse
import com.agentic.restaurant.users.persistence.UserRepository
import com.agentic.restaurant.users.security.JwtTokenService
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

    @Test
    fun `liquibase seeds admin user and applications`() {
        val usersCount = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM users",
            java.lang.Integer::class.java,
        )
        assertThat(usersCount).isEqualTo(1)

        val applicationsCount = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM applications",
            java.lang.Integer::class.java,
        )
        assertThat(applicationsCount).isEqualTo(3)
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
        assertThat(apps).hasSize(3)
        assertThat(apps[0]["application_name"]).isEqualTo("orders-client")
        assertThat(apps[0]["status"]).isEqualTo("ACTIVE")
        assertThat(apps[0]["max_pool_size"]).isEqualTo(30)
        assertThat(apps[1]["application_name"]).isEqualTo("menu-service")
        assertThat(apps[2]["application_name"]).isEqualTo("orders-service")
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
}
