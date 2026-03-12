package com.agentic.restaurant.users.domain

import java.time.Instant

data class UserAccount(
    val id: Long,
    val login: String,
    val passwordHash: String?,
    val status: UserStatus,
    val roles: List<String>,
    val clientType: ClientType,
    val displayName: String?,
    val applicationId: Long?,
    val lastActiveAt: Instant?,
)

enum class UserStatus {
    ACTIVE,
    DISABLED,
}

enum class ClientType {
    REGISTERED_USER,
    GUEST_USER,
    APPLICATION,
}
