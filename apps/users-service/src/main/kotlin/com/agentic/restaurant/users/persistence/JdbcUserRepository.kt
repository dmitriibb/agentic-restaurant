package com.agentic.restaurant.users.persistence

import com.agentic.restaurant.users.domain.ClientType
import com.agentic.restaurant.users.domain.UserAccount
import com.agentic.restaurant.users.domain.UserStatus
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.jdbc.core.RowMapper
import org.springframework.jdbc.support.GeneratedKeyHolder
import org.springframework.stereotype.Repository
import java.sql.Statement

@Repository
class JdbcUserRepository(
    private val jdbcTemplate: JdbcTemplate,
) : UserRepository {

    companion object {
        private const val SELECT_COLUMNS =
            "id, login, password_hash, status, roles, client_type, display_name, application_id, last_active_at"
    }

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
            "SELECT $SELECT_COLUMNS FROM users WHERE login = ?",
            rowMapper,
            login,
        ).firstOrNull()

    override fun findById(id: Long): UserAccount? =
        jdbcTemplate.query(
            "SELECT $SELECT_COLUMNS FROM users WHERE id = ?",
            rowMapper,
            id,
        ).firstOrNull()

    override fun findAvailablePoolUser(applicationId: Long, inactiveThresholdMinutes: Int): UserAccount? =
        jdbcTemplate.query(
            """SELECT $SELECT_COLUMNS FROM users
               WHERE application_id = ?
                 AND client_type = 'APPLICATION'
                 AND (last_active_at IS NULL OR last_active_at < DATE_SUB(NOW(), INTERVAL ? MINUTE))
               ORDER BY last_active_at ASC
               LIMIT 1
               FOR UPDATE""",
            rowMapper,
            applicationId,
            inactiveThresholdMinutes,
        ).firstOrNull()

    override fun countByApplicationId(applicationId: Long): Int =
        jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM users WHERE application_id = ? AND client_type = 'APPLICATION'",
            Int::class.java,
            applicationId,
        ) ?: 0

    override fun createUser(user: UserAccount): UserAccount {
        val keyHolder = GeneratedKeyHolder()
        jdbcTemplate.update({ connection ->
            val ps = connection.prepareStatement(
                """INSERT INTO users (login, password_hash, status, roles, client_type, display_name, application_id, last_active_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, NOW())""",
                Statement.RETURN_GENERATED_KEYS,
            )
            ps.setString(1, user.login)
            if (user.passwordHash != null) ps.setString(2, user.passwordHash) else ps.setNull(2, java.sql.Types.VARCHAR)
            ps.setString(3, user.status.name)
            ps.setString(4, user.roles.joinToString(","))
            ps.setString(5, user.clientType.name)
            if (user.displayName != null) ps.setString(6, user.displayName) else ps.setNull(6, java.sql.Types.VARCHAR)
            if (user.applicationId != null) ps.setLong(7, user.applicationId) else ps.setNull(7, java.sql.Types.BIGINT)
            ps
        }, keyHolder)
        val generatedId = keyHolder.key?.toLong() ?: throw IllegalStateException("Failed to get generated key for user")
        return findById(generatedId) ?: throw IllegalStateException("Failed to find created user with id $generatedId")
    }

    override fun updateLastActiveAt(userId: Long) {
        jdbcTemplate.update(
            "UPDATE users SET last_active_at = NOW() WHERE id = ?",
            userId,
        )
    }

    override fun disableGuestsOlderThan(retentionDays: Int): Int =
        jdbcTemplate.update(
            """UPDATE users
               SET status = 'DISABLED'
               WHERE client_type = 'GUEST_USER'
                 AND status = 'ACTIVE'
                 AND created_at < DATE_SUB(NOW(), INTERVAL ? DAY)""",
            retentionDays,
        )
}
