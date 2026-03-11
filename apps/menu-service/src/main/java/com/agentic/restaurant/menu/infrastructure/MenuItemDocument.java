package com.agentic.restaurant.menu.infrastructure;

import java.math.BigDecimal;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;
import org.springframework.data.mongodb.core.mapping.FieldType;

@Document(collection = "menu_items")
public class MenuItemDocument {

    @Id
    private Long id;

    private String name;
    private String description;

    @Field(targetType = FieldType.DECIMAL128)
    private BigDecimal price;

    public MenuItemDocument() {
    }

    public MenuItemDocument(Long id, String name, String description, BigDecimal price) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.price = price;
    }

    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public String getDescription() {
        return description;
    }

    public BigDecimal getPrice() {
        return price;
    }
}
