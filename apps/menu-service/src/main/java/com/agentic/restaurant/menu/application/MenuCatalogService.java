package com.agentic.restaurant.menu.application;

import com.agentic.restaurant.menu.infrastructure.MenuItemDocument;
import com.agentic.restaurant.menu.infrastructure.MenuItemRepository;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;

@Service
public class MenuCatalogService {

    private final MenuItemRepository menuItemRepository;

    public MenuCatalogService(MenuItemRepository menuItemRepository) {
        this.menuItemRepository = menuItemRepository;
    }

    public List<MenuItemView> listMenuItems() {
        return menuItemRepository.findAll()
            .stream()
            .sorted(Comparator.comparing(MenuItemDocument::getId))
            .map(item -> new MenuItemView(item.getId(), item.getName(), item.getDescription(), item.getPrice().doubleValue()))
            .toList();
    }

    public ResolveMenuItemsResult resolveMenuItems(List<Long> itemIds) {
        Set<Long> uniqueIds = new LinkedHashSet<>(itemIds);
        List<MenuItemDocument> found = menuItemRepository.findByIdIn(new ArrayList<>(uniqueIds));
        Map<Long, MenuItemDocument> foundById = found.stream().collect(Collectors.toMap(MenuItemDocument::getId, item -> item));

        List<ResolvedMenuItem> items = found.stream()
            .sorted(Comparator.comparing(MenuItemDocument::getId))
            .map(item -> new ResolvedMenuItem(item.getId(), item.getName(), item.getPrice().doubleValue()))
            .toList();

        List<Long> missingIds = uniqueIds.stream()
            .filter(id -> !foundById.containsKey(id))
            .toList();

        return new ResolveMenuItemsResult(items, missingIds);
    }

    public record MenuItemView(Long id, String name, String description, double price) {}

    public record ResolvedMenuItem(Long id, String name, double price) {}

    public record ResolveMenuItemsResult(List<ResolvedMenuItem> items, List<Long> missingItemIds) {}
}
