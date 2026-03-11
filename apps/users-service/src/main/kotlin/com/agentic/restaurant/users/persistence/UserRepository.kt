package com.agentic.restaurant.users.persistence

import com.agentic.restaurant.users.domain.UserAccount

interface UserRepository {
    fun findByLogin(login: String): UserAccount?
    fun findById(id: Long): UserAccount?
}
