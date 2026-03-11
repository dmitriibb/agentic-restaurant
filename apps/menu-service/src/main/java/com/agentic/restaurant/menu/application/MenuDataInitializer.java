package com.agentic.restaurant.menu.application;

import com.agentic.restaurant.menu.infrastructure.MenuItemDocument;
import com.agentic.restaurant.menu.infrastructure.MenuItemRepository;
import java.math.BigDecimal;
import java.util.List;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class MenuDataInitializer implements CommandLineRunner {

    private final MenuItemRepository menuItemRepository;

    public MenuDataInitializer(MenuItemRepository menuItemRepository) {
        this.menuItemRepository = menuItemRepository;
    }

    @Override
    public void run(String... args) {
        if (menuItemRepository.count() > 0) {
            return;
        }

        menuItemRepository.saveAll(List.of(
            new MenuItemDocument(10000000001L, "Margherita Pizza", "Tomato, mozzarella, basil", new BigDecimal("12.50")),
            new MenuItemDocument(10000000002L, "Pasta Carbonara", "Pecorino, egg yolk, guanciale", new BigDecimal("14.20")),
            new MenuItemDocument(10000000003L, "Minestrone Soup", "Seasonal vegetables in rich broth", new BigDecimal("8.90")),
            new MenuItemDocument(10000000004L, "Tiramisu", "Espresso-soaked ladyfingers and mascarpone", new BigDecimal("6.40"))
        ));
    }
}
