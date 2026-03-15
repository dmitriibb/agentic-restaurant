package com.agentic.restaurant.orders

import com.agentic.restaurant.orders.application.StartupAuthClient
import com.agentic.restaurant.orders.clients.AuthValidationClient
import com.agentic.restaurant.orders.clients.MenuLookupClient
import com.agentic.restaurant.orders.clients.MenuResolutionResult
import com.agentic.restaurant.orders.clients.ResolvedMenuItem
import com.agentic.restaurant.orders.clients.TokenValidationResult
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.mockito.ArgumentMatchers.anyList
import org.mockito.ArgumentMatchers.anyString
import org.mockito.Mockito.`when`
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.test.mock.mockito.MockBean
import org.springframework.boot.test.web.client.TestRestTemplate
import org.springframework.http.HttpEntity
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.test.context.ActiveProfiles
import java.math.BigDecimal
import java.util.UUID

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("integration")
class OrdersServiceApplicationTests {

    @Autowired
    lateinit var jdbcTemplate: JdbcTemplate

    @Autowired
    lateinit var restTemplate: TestRestTemplate

    @MockBean
    lateinit var authValidationClient: AuthValidationClient

    @MockBean
    lateinit var menuLookupClient: MenuLookupClient

    @MockBean
    lateinit var startupAuthClient: StartupAuthClient

    @BeforeEach
    fun setup() {
        jdbcTemplate.update("DELETE FROM order_outbox_events")
        jdbcTemplate.update("DELETE FROM order_lines")
        jdbcTemplate.update("DELETE FROM orders")

        `when`(authValidationClient.validateBearerToken(anyString())).thenReturn(
            TokenValidationResult(valid = true, userId = 1001L, displayName = "Test User"),
        )
        `when`(menuLookupClient.resolveMenuItems(anyList())).thenReturn(
            MenuResolutionResult(
                items = listOf(
                    ResolvedMenuItem(id = 1L, name = "Margherita Pizza", price = 12.50),
                    ResolvedMenuItem(id = 2L, name = "Cola", price = 3.00),
                ),
                missingItemIds = emptyList(),
            ),
        )
    }

    @Test
    fun `liquibase baseline creates orders tables`() {
        val ordersTableCount = jdbcTemplate.queryForObject(
            """
            SELECT COUNT(*)
            FROM information_schema.tables
            WHERE table_schema = DATABASE() AND table_name = 'orders'
            """.trimIndent(),
            java.lang.Integer::class.java,
        )
        val orderLinesTableCount = jdbcTemplate.queryForObject(
            """
            SELECT COUNT(*)
            FROM information_schema.tables
            WHERE table_schema = DATABASE() AND table_name = 'order_lines'
            """.trimIndent(),
            java.lang.Integer::class.java,
        )
        val outboxTableCount = jdbcTemplate.queryForObject(
            """
            SELECT COUNT(*)
            FROM information_schema.tables
            WHERE table_schema = DATABASE() AND table_name = 'order_outbox_events'
            """.trimIndent(),
            java.lang.Integer::class.java,
        )

        assertThat(ordersTableCount).isEqualTo(1)
        assertThat(orderLinesTableCount).isEqualTo(1)
        assertThat(outboxTableCount).isEqualTo(1)
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

    @Test
    @Suppress("UNCHECKED_CAST")
    fun `valid submission persists order and line snapshots`() {
        val requestId = UUID.randomUUID().toString()
        val response = submitOrder(
            requestId = requestId,
            body = mapOf(
                "userId" to 1001,
                "items" to listOf(
                    mapOf("itemId" to 1, "quantity" to 2),
                    mapOf("itemId" to 2, "quantity" to 1),
                ),
            ),
        )

        assertThat(response.statusCode).isEqualTo(HttpStatus.OK)
        val responseBody = response.body as Map<String, Any>
        val orderId = (responseBody["orderId"] as Number).toLong()
        assertThat(responseBody["requestId"]).isEqualTo(requestId)
        assertThat(responseBody["status"]).isEqualTo("ACCEPTED")
        assertThat((responseBody["totalAmount"] as Number).toDouble()).isEqualTo(28.0)
        assertThat(responseBody["userDisplayName"]).isEqualTo("Test User")

        val ordersCount = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM orders", Int::class.java)!!
        val orderLinesCount = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM order_lines", Int::class.java)!!
        val outboxCount = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM order_outbox_events", Int::class.java)!!
        assertThat(ordersCount).isEqualTo(1)
        assertThat(orderLinesCount).isEqualTo(2)
        assertThat(outboxCount).isEqualTo(3)

        val storedTotal = jdbcTemplate.queryForObject(
            "SELECT total_amount FROM orders WHERE id = ?",
            BigDecimal::class.java,
            orderId,
        )
        assertThat(storedTotal).isEqualByComparingTo(BigDecimal("28.00"))

        val firstLineName = jdbcTemplate.queryForObject(
            "SELECT menu_item_name FROM order_lines WHERE order_id = ? AND menu_item_id = 1",
            String::class.java,
            orderId,
        )
        val firstLinePrice = jdbcTemplate.queryForObject(
            "SELECT unit_price FROM order_lines WHERE order_id = ? AND menu_item_id = 1",
            BigDecimal::class.java,
            orderId,
        )

        assertThat(firstLineName).isEqualTo("Margherita Pizza")
        assertThat(firstLinePrice).isEqualByComparingTo(BigDecimal("12.50"))

        val storedLineNumbers = jdbcTemplate.queryForList(
            "SELECT line_number FROM order_lines WHERE order_id = ? ORDER BY line_number ASC",
            Int::class.java,
            orderId,
        )
        assertThat(storedLineNumbers).containsExactly(1, 2)

        val eventTypeCount = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM order_outbox_events WHERE event_type = 'production.item.requested.v1'",
            Int::class.java,
        )!!
        assertThat(eventTypeCount).isEqualTo(3)
    }

    @Test
    fun `order stores user display name in database`() {
        val requestId = UUID.randomUUID().toString()
        val response = submitOrder(
            requestId = requestId,
            body = mapOf(
                "userId" to 1001,
                "items" to listOf(mapOf("itemId" to 1, "quantity" to 1)),
            ),
        )

        assertThat(response.statusCode).isEqualTo(HttpStatus.OK)

        @Suppress("UNCHECKED_CAST")
        val orderId = ((response.body as Map<String, Any>)["orderId"] as Number).toLong()
        val storedDisplayName = jdbcTemplate.queryForObject(
            "SELECT user_display_name FROM orders WHERE id = ?",
            String::class.java,
            orderId,
        )
        assertThat(storedDisplayName).isEqualTo("Test User")
    }

    @Test
    @Suppress("UNCHECKED_CAST")
    fun `duplicate submission with same request id returns same order and does not duplicate rows`() {
        val requestId = UUID.randomUUID().toString()
        val body = mapOf(
            "userId" to 1001,
            "items" to listOf(mapOf("itemId" to 1, "quantity" to 1)),
        )

        val firstResponse = submitOrder(requestId, body)
        val secondResponse = submitOrder(requestId, body)

        assertThat(firstResponse.statusCode).isEqualTo(HttpStatus.OK)
        assertThat(secondResponse.statusCode).isEqualTo(HttpStatus.OK)

        val firstId = ((firstResponse.body as Map<String, Any>)["orderId"] as Number).toLong()
        val secondId = ((secondResponse.body as Map<String, Any>)["orderId"] as Number).toLong()
        assertThat(secondId).isEqualTo(firstId)

        val ordersCount = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM orders", Int::class.java)!!
        val orderLinesCount = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM order_lines", Int::class.java)!!
        val outboxCount = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM order_outbox_events", Int::class.java)!!

        assertThat(ordersCount).isEqualTo(1)
        assertThat(orderLinesCount).isEqualTo(1)
        assertThat(outboxCount).isEqualTo(1)
    }

    @Test
    fun `rejects missing authorization header`() {
        val headers = HttpHeaders()
        headers.contentType = MediaType.APPLICATION_JSON
        val response = restTemplate.exchange(
            "/api/v1/orders/${UUID.randomUUID()}",
            org.springframework.http.HttpMethod.PUT,
            HttpEntity(
                mapOf(
                    "userId" to 1001,
                    "items" to listOf(mapOf("itemId" to 1, "quantity" to 1)),
                ),
                headers,
            ),
            String::class.java,
        )

        assertThat(response.statusCode).isEqualTo(HttpStatus.UNAUTHORIZED)
    }

    @Test
    fun `rejects invalid token`() {
        `when`(authValidationClient.validateBearerToken("bad-token")).thenReturn(TokenValidationResult(valid = false))

        val response = submitOrder(
            requestId = UUID.randomUUID().toString(),
            body = mapOf(
                "userId" to 1001,
                "items" to listOf(mapOf("itemId" to 1, "quantity" to 1)),
            ),
            token = "bad-token",
        )

        assertThat(response.statusCode).isEqualTo(HttpStatus.UNAUTHORIZED)
    }

    @Test
    fun `rejects user id mismatch with token subject`() {
        val response = submitOrder(
            requestId = UUID.randomUUID().toString(),
            body = mapOf(
                "userId" to 9999,
                "items" to listOf(mapOf("itemId" to 1, "quantity" to 1)),
            ),
        )

        assertThat(response.statusCode).isEqualTo(HttpStatus.FORBIDDEN)
    }

    @Test
    fun `rejects empty order lines`() {
        val response = submitOrder(
            requestId = UUID.randomUUID().toString(),
            body = mapOf(
                "userId" to 1001,
                "items" to emptyList<Map<String, Any>>(),
            ),
        )

        assertThat(response.statusCode).isEqualTo(HttpStatus.BAD_REQUEST)
    }

    @Test
    fun `rejects invalid quantity`() {
        val response = submitOrder(
            requestId = UUID.randomUUID().toString(),
            body = mapOf(
                "userId" to 1001,
                "items" to listOf(mapOf("itemId" to 1, "quantity" to 0)),
            ),
        )

        assertThat(response.statusCode).isEqualTo(HttpStatus.BAD_REQUEST)
    }

    @Test
    @Suppress("UNCHECKED_CAST")
    fun `rejects unknown menu items`() {
        `when`(menuLookupClient.resolveMenuItems(anyList())).thenReturn(
            MenuResolutionResult(items = emptyList(), missingItemIds = listOf(999L)),
        )

        val response = submitOrder(
            requestId = UUID.randomUUID().toString(),
            body = mapOf(
                "userId" to 1001,
                "items" to listOf(mapOf("itemId" to 999, "quantity" to 1)),
            ),
        )

        assertThat(response.statusCode).isEqualTo(HttpStatus.BAD_REQUEST)
        assertThat((response.body as Map<String, Any>)["error"] as String).contains("Unknown menu item")
    }

    private fun submitOrder(
        requestId: String,
        body: Map<String, Any>,
        token: String = "good-token",
    ) = restTemplate.exchange(
        "/api/v1/orders/$requestId",
        org.springframework.http.HttpMethod.PUT,
        HttpEntity(body, HttpHeaders().apply {
            contentType = MediaType.APPLICATION_JSON
            setBearerAuth(token)
        }),
        Map::class.java,
    )
}
