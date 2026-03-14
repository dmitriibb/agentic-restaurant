package com.agentic.restaurant.menu.application;

import java.util.Map;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

@Component
public class StartupAuthClient {

    private static final Logger log = LoggerFactory.getLogger(StartupAuthClient.class);
    private static final long MAX_BACKOFF_SECONDS = 30;

    private final RestTemplate restTemplate = new RestTemplate();
    private final String usersServiceBaseUrl;
    private final String applicationName;
    private final String applicationSecret;
    private final double tokenRefreshFactor;
    private final AtomicReference<String> currentToken = new AtomicReference<>();
    private final ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor(r -> {
        Thread t = new Thread(r, "startup-auth-refresh");
        t.setDaemon(true);
        return t;
    });

    public StartupAuthClient(
        @Value("${app.auth.users-service-base-url}") String usersServiceBaseUrl,
        @Value("${app.auth.application-name}") String applicationName,
        @Value("${app.auth.application-secret}") String applicationSecret,
        @Value("${app.auth.token-refresh-factor:0.8}") double tokenRefreshFactor
    ) {
        this.usersServiceBaseUrl = usersServiceBaseUrl;
        this.applicationName = applicationName;
        this.applicationSecret = applicationSecret;
        this.tokenRefreshFactor = tokenRefreshFactor;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void acquireTokenOnStartup() {
        scheduler.execute(() -> acquireTokenWithRetry(1));
    }

    public String getToken() {
        return currentToken.get();
    }

    private void acquireTokenWithRetry(long backoffSeconds) {
        try {
            var result = requestToken();
            if (result != null) {
                currentToken.set(result.accessToken);
                log.info("Acquired application JWT for '{}' (expires in {}s)", applicationName, result.expiresInSeconds);
                long refreshDelay = (long) (result.expiresInSeconds * tokenRefreshFactor);
                scheduler.schedule(() -> acquireTokenWithRetry(1), refreshDelay, TimeUnit.SECONDS);
                return;
            }
        } catch (Exception ex) {
            log.warn("Failed to acquire application token for '{}': {}", applicationName, ex.getMessage());
        }

        long nextBackoff = Math.min(backoffSeconds * 2, MAX_BACKOFF_SECONDS);
        log.info("Retrying application token acquisition in {}s", backoffSeconds);
        scheduler.schedule(() -> acquireTokenWithRetry(nextBackoff), backoffSeconds, TimeUnit.SECONDS);
    }

    @SuppressWarnings("unchecked")
    private TokenResult requestToken() {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        var body = Map.of(
            "applicationName", applicationName,
            "applicationSecret", applicationSecret
        );

        HttpEntity<Map<String, String>> request = new HttpEntity<>(body, headers);
        ResponseEntity<Map> response = restTemplate.postForEntity(
            usersServiceBaseUrl + "/api/v1/auth/applications/token",
            request,
            Map.class
        );

        Map<String, Object> responseBody = response.getBody();
        if (responseBody == null) {
            return null;
        }

        String accessToken = (String) responseBody.get("accessToken");
        Number expiresIn = (Number) responseBody.get("expiresInSeconds");
        if (accessToken == null || expiresIn == null) {
            return null;
        }

        return new TokenResult(accessToken, expiresIn.longValue());
    }

    private record TokenResult(String accessToken, long expiresInSeconds) {}
}
