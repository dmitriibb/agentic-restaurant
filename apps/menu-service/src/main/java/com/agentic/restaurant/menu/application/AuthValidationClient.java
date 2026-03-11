package com.agentic.restaurant.menu.application;

import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

@Component
public class AuthValidationClient {

    private final RestTemplate restTemplate;
    private final String usersServiceBaseUrl;
    private final String usersServiceToken;

    public AuthValidationClient(
        @Value("${app.auth.users-service-base-url}") String usersServiceBaseUrl,
        @Value("${app.auth.users-service-token}") String usersServiceToken
    ) {
        this.restTemplate = new RestTemplate();
        this.usersServiceBaseUrl = usersServiceBaseUrl;
        this.usersServiceToken = usersServiceToken;
    }

    public boolean validateBearerToken(String bearerToken) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("X-Service-Token", usersServiceToken);
        HttpEntity<Map<String, String>> request = new HttpEntity<>(Map.of("token", bearerToken), headers);

        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(
                usersServiceBaseUrl + "/api/v1/internal/auth/validate",
                request,
                Map.class
            );
            Object valid = response.getBody() == null ? null : response.getBody().get("valid");
            return Boolean.TRUE.equals(valid);
        } catch (Exception ex) {
            return false;
        }
    }
}
