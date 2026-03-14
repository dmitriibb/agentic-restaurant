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
        return validateToken(bearerToken).valid();
    }

    @SuppressWarnings("unchecked")
    public TokenValidationResult validateToken(String bearerToken) {
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
            Map<String, Object> body = response.getBody();
            if (body == null) {
                return TokenValidationResult.INVALID;
            }
            boolean valid = Boolean.TRUE.equals(body.get("valid"));
            String clientType = (String) body.get("clientType");
            String displayName = (String) body.get("displayName");
            return new TokenValidationResult(valid, clientType, displayName);
        } catch (Exception ex) {
            return TokenValidationResult.INVALID;
        }
    }

    public record TokenValidationResult(boolean valid, String clientType, String displayName) {
        static final TokenValidationResult INVALID = new TokenValidationResult(false, null, null);
    }
}
