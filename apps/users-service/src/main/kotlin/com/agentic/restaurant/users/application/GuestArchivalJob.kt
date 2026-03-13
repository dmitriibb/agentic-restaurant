package com.agentic.restaurant.users.application

import com.agentic.restaurant.users.persistence.UserRepository
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Component

@Component
class GuestArchivalJob(
    private val userRepository: UserRepository,
    @Value("\${app.security.guest-retention-days:7}") private val retentionDays: Int,
) {
    private val logger = LoggerFactory.getLogger(GuestArchivalJob::class.java)

    @Scheduled(cron = "\${app.security.guest-archival-cron:0 0 3 * * *}")
    fun archiveExpiredGuests() {
        logger.info("Starting guest user archival (retention: {} days)", retentionDays)
        val count = userRepository.disableGuestsOlderThan(retentionDays)
        logger.info("Guest user archival complete: {} guest(s) archived", count)
    }
}
