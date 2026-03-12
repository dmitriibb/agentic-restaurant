package com.agentic.restaurant.users.persistence

import com.agentic.restaurant.users.domain.Application
import com.agentic.restaurant.users.domain.ApplicationStatus
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.jdbc.core.RowMapper
import org.springframework.stereotype.Repository

@Repository
class JdbcApplicationRepository(
    private val jdbcTemplate: JdbcTemplate,
) : ApplicationRepository {

    private val rowMapper = RowMapper<Application> { rs, _ ->
        Application(
            id = rs.getLong("id"),
            applicationName = rs.getString("application_name"),
            secretHash = rs.getString("secret_hash"),
            maxPoolSize = rs.getInt("max_pool_size"),
            status = ApplicationStatus.valueOf(rs.getString("status")),
            createdAt = rs.getTimestamp("created_at").toInstant(),
        )
    }

    override fun findByApplicationName(name: String): Application? =
        jdbcTemplate.query(
            "SELECT id, application_name, secret_hash, max_pool_size, status, created_at FROM applications WHERE application_name = ?",
            rowMapper,
            name,
        ).firstOrNull()
}
