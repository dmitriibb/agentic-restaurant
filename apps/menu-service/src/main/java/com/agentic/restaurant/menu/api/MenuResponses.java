package com.agentic.restaurant.menu.api;

import java.util.List;

record MenuItemsResponse(List<MenuItemResponse> items) {
}

record MenuItemResponse(Long id, String name, String description, double price) {
}

record ResolveMenuItemsRequest(List<Long> itemIds) {
}

record ResolveMenuItemsResponse(List<ResolvedMenuItemResponse> items, List<Long> missingItemIds) {
}

record ResolvedMenuItemResponse(Long id, String name, double price) {
}
