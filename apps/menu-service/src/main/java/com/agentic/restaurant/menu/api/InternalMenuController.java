package com.agentic.restaurant.menu.api;

import com.agentic.restaurant.menu.application.AuthValidationClient;
import com.agentic.restaurant.menu.application.MenuCatalogService;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/internal/menu-items")
public class InternalMenuController {

    private final MenuCatalogService menuCatalogService;
    private final AuthValidationClient authValidationClient;

    public InternalMenuController(
        MenuCatalogService menuCatalogService,
        AuthValidationClient authValidationClient
    ) {
        this.menuCatalogService = menuCatalogService;
        this.authValidationClient = authValidationClient;
    }

    @PostMapping("/resolve")
    public ResponseEntity<ResolveMenuItemsResponse> resolveMenuItems(
        @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
        @RequestBody ResolveMenuItemsRequest request
    ) {
        if (authorizationHeader == null || !authorizationHeader.startsWith("Bearer ")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        String bearerToken = authorizationHeader.substring("Bearer ".length());
        var validation = authValidationClient.validateToken(bearerToken);
        if (!validation.valid()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        if (!"APPLICATION".equals(validation.clientType())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        List<Long> itemIds = request.itemIds() == null ? List.of() : request.itemIds();
        var result = menuCatalogService.resolveMenuItems(itemIds);
        var items = result.items()
            .stream()
            .map(item -> new ResolvedMenuItemResponse(item.id(), item.name(), item.price()))
            .toList();

        return ResponseEntity.ok(new ResolveMenuItemsResponse(items, result.missingItemIds()));
    }
}
