package com.agentic.restaurant.orders

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication
import org.springframework.scheduling.annotation.EnableScheduling

@SpringBootApplication
@EnableScheduling
class OrdersServiceApplication

fun main(args: Array<String>) {
    runApplication<OrdersServiceApplication>(*args)
}
