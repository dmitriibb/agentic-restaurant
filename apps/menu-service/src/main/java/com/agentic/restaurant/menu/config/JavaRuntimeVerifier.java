package com.agentic.restaurant.menu.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationStartedEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Component
public class JavaRuntimeVerifier {

    private final int requiredJavaFeature;

    public JavaRuntimeVerifier(@Value("${app.runtime.required-java-feature:21}") int requiredJavaFeature) {
        this.requiredJavaFeature = requiredJavaFeature;
    }

    @EventListener(ApplicationStartedEvent.class)
    public void verifyRuntime() {
        int currentFeature = Runtime.version().feature();
        if (currentFeature != requiredJavaFeature) {
            throw new IllegalStateException(
                "menu-service requires Java " + requiredJavaFeature + ", but found Java " + currentFeature
            );
        }
    }
}
