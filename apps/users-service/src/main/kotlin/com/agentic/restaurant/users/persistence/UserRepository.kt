package com.agentic.restaurant.users.persistence

import com.agentic.restaurant.users.domain.UserAccount

interface UserRepository {
    fun findByLogin(login: String): UserAccount?
    fun findById(id: Long): UserAccount?
    fun findAvailablePoolUser(applicationId: Long, inactiveThresholdMinutes: Int): UserAccount?
    fun countByApplicationId(applicationId: Long): Int
    fun createUser(user: UserAccount): UserAccount
    fun updateLastActiveAt(userId: Long)
    fun disableGuestsOlderThan(retentionDays: Int): Int
}
