package com.agentic.restaurant.users.domain

data class UserAccount(
    val id: Long,
    val login: String,
    val passwordHash: String,
    val status: UserStatus,
    val roles: List<String>,
)

enum class UserStatus {
    ACTIVE,
    DISABLED,
}
