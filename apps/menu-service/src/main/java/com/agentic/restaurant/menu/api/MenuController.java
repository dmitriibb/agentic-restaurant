package com.agentic.restaurant.menu.api;

import com.agentic.restaurant.menu.application.AuthValidationClient;
import com.agentic.restaurant.menu.application.MenuCatalogService;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/menu-items")
public class MenuController {

    private final MenuCatalogService menuCatalogService;
    private final AuthValidationClient authValidationClient;

    public MenuController(MenuCatalogService menuCatalogService, AuthValidationClient authValidationClient) {
        this.menuCatalogService = menuCatalogService;
        this.authValidationClient = authValidationClient;
    }

    @GetMapping
    public ResponseEntity<MenuItemsResponse> getMenuItems(
        @RequestHeader(value = "Authorization", required = false) String authorizationHeader
    ) {
        if (authorizationHeader == null || !authorizationHeader.startsWith("Bearer ")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        String token = authorizationHeader.substring("Bearer ".length());
        if (!authValidationClient.validateBearerToken(token)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        List<MenuItemResponse> items = menuCatalogService.listMenuItems()
            .stream()
            .map(item -> new MenuItemResponse(item.id(), item.name(), item.description(), item.price()))
            .toList();

        return ResponseEntity.ok(new MenuItemsResponse(items));
    }
}
