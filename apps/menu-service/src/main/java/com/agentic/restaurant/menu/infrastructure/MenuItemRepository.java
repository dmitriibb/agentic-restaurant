package com.agentic.restaurant.menu.infrastructure;

import java.util.List;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface MenuItemRepository extends MongoRepository<MenuItemDocument, Long> {

    List<MenuItemDocument> findByIdIn(List<Long> ids);
}
