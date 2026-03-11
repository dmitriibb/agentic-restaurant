package com.agentic.restaurant.menu;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Map;
import org.bson.Document;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("integration")
class MenuServiceApplicationTests {

    @Autowired
    private MongoTemplate mongoTemplate;

    @Autowired
    private TestRestTemplate restTemplate;

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
}
