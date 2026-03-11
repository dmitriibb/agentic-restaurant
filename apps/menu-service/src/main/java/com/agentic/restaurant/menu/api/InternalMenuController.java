package com.agentic.restaurant.menu.api;

import com.agentic.restaurant.menu.application.MenuCatalogService;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
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
    private final String internalServiceToken;

    public InternalMenuController(
        MenuCatalogService menuCatalogService,
        @Value("${app.security.internal-service-token}") String internalServiceToken
    ) {
        this.menuCatalogService = menuCatalogService;
        this.internalServiceToken = internalServiceToken;
    }

    @PostMapping("/resolve")
    public ResponseEntity<ResolveMenuItemsResponse> resolveMenuItems(
        @RequestHeader(value = "X-Service-Token", required = false) String serviceToken,
        @RequestBody ResolveMenuItemsRequest request
    ) {
        if (!internalServiceToken.equals(serviceToken)) {
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
