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
    fun `liquibase seeds five predefined users`() {
        val usersCount = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM users",
            java.lang.Integer::class.java,
        )

        assertThat(usersCount).isEqualTo(5)
    }

    @Test
    fun `login endpoint authenticates valid credentials`() {
        val request = mapOf(
            "login" to "alex.customer",
            "password" to "alex123!",
        )

        val response = restTemplate.postForEntity("/api/v1/auth/login", request, Map::class.java)

        assertThat(response.statusCode).isEqualTo(HttpStatus.OK)
        assertThat(response.body?.get("accessToken")).isInstanceOf(String::class.java)
        assertThat(response.body?.get("expiresInSeconds")).isEqualTo(3600)
        @Suppress("UNCHECKED_CAST")
        val user = response.body?.get("user") as Map<String, Any>
        assertThat(user["login"]).isEqualTo("alex.customer")
    }

    @Test
    fun `login endpoint rejects invalid credentials`() {
        val request = mapOf(
            "login" to "alex.customer",
            "password" to "wrong-password",
        )

        val response = restTemplate.postForEntity("/api/v1/auth/login", request, String::class.java)

        assertThat(response.statusCode).isEqualTo(HttpStatus.UNAUTHORIZED)
    }

    @Test
    fun `internal validation returns claims for valid token`() {
        val loginResponse = restTemplate.postForEntity(
            "/api/v1/auth/login",
            mapOf("login" to "nina.customer", "password" to "nina123!"),
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
        assertThat(response.body?.login).isEqualTo("nina.customer")
        assertThat(response.body?.roles).contains("CUSTOMER")
    }

    @Test
    fun `internal validation returns invalid false for expired token`() {
        val user = userRepository.findByLogin("sam.customer")!!
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
            mapOf("login" to "alex.customer", "password" to "alex123!"),
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
