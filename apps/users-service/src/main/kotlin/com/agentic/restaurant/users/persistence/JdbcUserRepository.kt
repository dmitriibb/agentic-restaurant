package com.agentic.restaurant.users.persistence

import com.agentic.restaurant.users.domain.UserAccount
import com.agentic.restaurant.users.domain.UserStatus
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
        )
    }

    override fun findByLogin(login: String): UserAccount? =
        jdbcTemplate.query(
            "SELECT id, login, password_hash, status, roles FROM users WHERE login = ?",
            rowMapper,
            login,
        ).firstOrNull()

    override fun findById(id: Long): UserAccount? =
        jdbcTemplate.query(
            "SELECT id, login, password_hash, status, roles FROM users WHERE id = ?",
            rowMapper,
            id,
        ).firstOrNull()
}
