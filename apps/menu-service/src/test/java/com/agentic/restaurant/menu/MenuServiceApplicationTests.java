package com.agentic.restaurant.menu;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

import com.agentic.restaurant.menu.application.AuthValidationClient;
import com.agentic.restaurant.menu.application.AuthValidationClient.TokenValidationResult;
import com.agentic.restaurant.menu.application.StartupAuthClient;
import com.agentic.restaurant.menu.infrastructure.MenuItemDocument;
import com.agentic.restaurant.menu.infrastructure.MenuItemRepository;
import java.util.List;
import java.util.Map;
import org.bson.Document;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("integration")
class MenuServiceApplicationTests {

    @Autowired
    private MongoTemplate mongoTemplate;

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private MenuItemRepository menuItemRepository;

    @MockBean
    private AuthValidationClient authValidationClient;

    @MockBean
    private StartupAuthClient startupAuthClient;

    @BeforeEach
    void setup() {
        when(authValidationClient.validateBearerToken(anyString())).thenReturn(true);
        when(authValidationClient.validateToken(anyString()))
            .thenReturn(new TokenValidationResult(true, "APPLICATION", null));
    }

    @Test
    void mongoConnectionIsAvailableOnStartup() {
        Document pingResult = mongoTemplate.getDb().runCommand(new Document("ping", 1));

        assertThat(pingResult.getDouble("ok")).isEqualTo(1.0d);
    }

    @Test
    @SuppressWarnings("unchecked")
    void readinessEndpointReportsUpWhenMongoIsReachable() {
        var response = restTemplate.getForEntity("/actuator/health/readiness", Map.class);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody().get("status")).isEqualTo("UP");

        Map<String, Object> components = (Map<String, Object>) response.getBody().get("components");
        Map<String, Object> mongo = (Map<String, Object>) components.get("mongo");

        assertThat(mongo.get("status")).isEqualTo("UP");
    }

    @Test
    @SuppressWarnings("unchecked")
    void publicMenuEndpointReturnsStoredMenuItemsForAuthenticatedUsers() {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth("valid-jwt");
        HttpEntity<Void> request = new HttpEntity<>(headers);

        var response = restTemplate.exchange("/api/v1/menu-items", org.springframework.http.HttpMethod.GET, request, Map.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        List<Map<String, Object>> items = (List<Map<String, Object>>) response.getBody().get("items");
        assertThat(items).isNotEmpty();
        assertThat(items.get(0)).containsKeys("id", "name", "description", "price");
    }

    @Test
    void publicMenuEndpointRejectsMissingAuthorizationHeader() {
        var response = restTemplate.getForEntity("/api/v1/menu-items", String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void publicMenuEndpointRejectsTokenWhenValidationFails() {
        when(authValidationClient.validateBearerToken("bad-token")).thenReturn(false);

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth("bad-token");
        HttpEntity<Void> request = new HttpEntity<>(headers);

        var response = restTemplate.exchange("/api/v1/menu-items", org.springframework.http.HttpMethod.GET, request, String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    @SuppressWarnings("unchecked")
    void internalResolveEndpointReturnsFoundAndMissingIds() {
        List<MenuItemDocument> seededItems = menuItemRepository.findAll();
        Long existingId = seededItems.getFirst().getId();
        Long missingId = 99999999999L;

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth("valid-app-jwt");
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Map<String, Object>> request = new HttpEntity<>(
            Map.of("itemIds", List.of(existingId, missingId)),
            headers
        );

        var response = restTemplate.postForEntity("/api/v1/internal/menu-items/resolve", request, Map.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        List<Map<String, Object>> foundItems = (List<Map<String, Object>>) response.getBody().get("items");
        List<Number> missingIds = (List<Number>) response.getBody().get("missingItemIds");
        assertThat(foundItems)
            .extracting(item -> ((Number) item.get("id")).longValue())
            .contains(existingId);
        assertThat(missingIds).extracting(Number::longValue).contains(missingId);
    }

    @Test
    void internalResolveEndpointRequiresBearerAuth() {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Map<String, Object>> request = new HttpEntity<>(Map.of("itemIds", List.of(10000000001L)), headers);

        var response = restTemplate.postForEntity("/api/v1/internal/menu-items/resolve", request, String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void internalResolveEndpointRejectsInvalidToken() {
        when(authValidationClient.validateToken("bad-token"))
            .thenReturn(new TokenValidationResult(false, null, null));

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth("bad-token");
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Map<String, Object>> request = new HttpEntity<>(Map.of("itemIds", List.of(10000000001L)), headers);

        var response = restTemplate.postForEntity("/api/v1/internal/menu-items/resolve", request, String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void internalResolveEndpointRejectsNonApplicationCaller() {
        when(authValidationClient.validateToken("user-jwt"))
            .thenReturn(new TokenValidationResult(true, "REGISTERED_USER", null));

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth("user-jwt");
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Map<String, Object>> request = new HttpEntity<>(Map.of("itemIds", List.of(10000000001L)), headers);

        var response = restTemplate.postForEntity("/api/v1/internal/menu-items/resolve", request, String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }
}
