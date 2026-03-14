package com.agentic.restaurant.orders.clients

import com.agentic.restaurant.orders.application.StartupAuthClient
import org.springframework.beans.factory.annotation.Value
import org.springframework.http.HttpEntity
import org.springframework.http.HttpHeaders
import org.springframework.http.MediaType
import org.springframework.stereotype.Component
import org.springframework.web.client.RestTemplate

@Component
class MenuLookupClient(
    @Value("\${app.menu.base-url}") private val menuServiceBaseUrl: String,
    private val startupAuthClient: StartupAuthClient,
) {
    private val restTemplate = RestTemplate()

    fun resolveMenuItems(itemIds: List<Long>): MenuResolutionResult {
        val appToken = startupAuthClient.getToken()
            ?: return MenuResolutionResult(items = emptyList(), missingItemIds = itemIds)

        val headers = HttpHeaders()
        headers.contentType = MediaType.APPLICATION_JSON
        headers.setBearerAuth(appToken)

        val request = HttpEntity(mapOf("itemIds" to itemIds), headers)

        return try {
            val response = restTemplate.postForEntity(
                "$menuServiceBaseUrl/api/v1/internal/menu-items/resolve",
                request,
                Map::class.java,
            )
            parseResolutionResponse(response.body)
        } catch (_: Exception) {
            MenuResolutionResult(items = emptyList(), missingItemIds = itemIds)
        }
    }

    private fun parseResolutionResponse(body: Map<*, *>?): MenuResolutionResult {
        if (body == null) {
            return MenuResolutionResult(items = emptyList(), missingItemIds = emptyList())
        }

        @Suppress("UNCHECKED_CAST")
        val itemsRaw = body["items"] as? List<Map<String, Any>> ?: emptyList()
        val items = itemsRaw.mapNotNull { item ->
            val id = (item["id"] as? Number)?.toLong() ?: return@mapNotNull null
            val name = item["name"] as? String ?: return@mapNotNull null
            val price = (item["price"] as? Number)?.toDouble() ?: return@mapNotNull null
            ResolvedMenuItem(id = id, name = name, price = price)
        }

        @Suppress("UNCHECKED_CAST")
        val missingIdsRaw = body["missingItemIds"] as? List<Number> ?: emptyList()
        val missingItemIds = missingIdsRaw.map(Number::toLong)

        return MenuResolutionResult(items = items, missingItemIds = missingItemIds)
    }
}
