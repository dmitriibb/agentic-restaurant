package com.agentic.restaurant.users.persistence

import com.agentic.restaurant.users.domain.ClientType
import com.agentic.restaurant.users.domain.UserAccount
import com.agentic.restaurant.users.domain.UserStatus
import java.sql.Timestamp
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.jdbc.core.RowMapper
import org.springframework.stereotype.Repository

@Repository
class JdbcUserRepository(
    private val jdbcTemplate: JdbcTemplate,
) : UserRepository {

    private val rowMapper = RowMapper<UserAccount> { rs, _ ->
        UserAccount(
            id = rs.getLong("id"),
            login = rs.getString("login"),
            passwordHash = rs.getString("password_hash"),
            status = UserStatus.valueOf(rs.getString("status")),
            roles = rs.getString("roles").split(",").map(String::trim).filter(String::isNotBlank),
            clientType = ClientType.valueOf(rs.getString("client_type")),
            displayName = rs.getString("display_name"),
            applicationId = rs.getObject("application_id") as? Long,
            lastActiveAt = rs.getTimestamp("last_active_at")?.toInstant(),
        )
    }

    override fun findByLogin(login: String): UserAccount? =
        jdbcTemplate.query(
            "SELECT id, login, password_hash, status, roles, client_type, display_name, application_id, last_active_at FROM users WHERE login = ?",
            rowMapper,
            login,
        ).firstOrNull()

    override fun findById(id: Long): UserAccount? =
        jdbcTemplate.query(
            "SELECT id, login, password_hash, status, roles, client_type, display_name, application_id, last_active_at FROM users WHERE id = ?",
            rowMapper,
            id,
        ).firstOrNull()
}
