package com.agentic.restaurant.users

import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.test.web.client.TestRestTemplate
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.test.context.ActiveProfiles

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("integration")
class UsersServiceApplicationTests {

    @Autowired
    lateinit var jdbcTemplate: JdbcTemplate

    @Autowired
    lateinit var restTemplate: TestRestTemplate

    @Test
    fun `liquibase baseline creates users table`() {
        val tableCount = jdbcTemplate.queryForObject(
            """
            SELECT COUNT(*)
            FROM information_schema.tables
            WHERE table_schema = DATABASE() AND table_name = 'users'
            """.trimIndent(),
            java.lang.Integer::class.java,
        )

        assertThat(tableCount).isEqualTo(1)
    }

    @Test
    fun `readiness endpoint reports up when database is reachable`() {
        val response = restTemplate.getForEntity("/actuator/health/readiness", Map::class.java)

        assertThat(response.statusCode.value()).isEqualTo(200)
        assertThat(response.body?.get("status")).isEqualTo("UP")

        @Suppress("UNCHECKED_CAST")
        val components = response.body?.get("components") as Map<String, Any>
        @Suppress("UNCHECKED_CAST")
        val db = components["db"] as Map<String, Any>

        assertThat(db["status"]).isEqualTo("UP")
    }

}
