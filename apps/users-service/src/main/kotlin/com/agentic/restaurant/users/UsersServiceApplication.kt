package com.agentic.restaurant.users

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication
import org.springframework.scheduling.annotation.EnableScheduling

@SpringBootApplication
@EnableScheduling
class UsersServiceApplication

fun main(args: Array<String>) {
    runApplication<UsersServiceApplication>(*args)
}
