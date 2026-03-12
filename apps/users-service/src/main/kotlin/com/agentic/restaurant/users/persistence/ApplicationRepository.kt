package com.agentic.restaurant.users.persistence

import com.agentic.restaurant.users.domain.Application

interface ApplicationRepository {
    fun findByApplicationName(name: String): Application?
}
