package com.agentic.restaurant.users.domain

import java.time.Instant

data class Application(
    val id: Long,
    val applicationName: String,
    val secretHash: String,
    val maxPoolSize: Int,
    val status: ApplicationStatus,
    val createdAt: Instant,
)

enum class ApplicationStatus {
    ACTIVE,
    DISABLED,
}
