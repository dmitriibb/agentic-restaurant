package com.agentic.restaurant.users.security

import java.security.MessageDigest
import java.security.SecureRandom
import java.util.Base64
import javax.crypto.SecretKeyFactory
import javax.crypto.spec.PBEKeySpec
import org.springframework.stereotype.Component

@Component
class PasswordHasher {

    private val random = SecureRandom()

    fun hash(password: String, iterations: Int = 120_000): String {
        val salt = ByteArray(16)
        random.nextBytes(salt)
        val digest = derive(password, salt, iterations)
        return encode(iterations, salt, digest)
    }

    fun verify(rawPassword: String, storedHash: String): Boolean {
        val parts = storedHash.split("$")
        if (parts.size != 4 || parts[0] != "pbkdf2") {
            return false
        }
        val iterations = parts[1].toIntOrNull() ?: return false
        val salt = decodeBase64(parts[2]) ?: return false
        val expectedDigest = decodeBase64(parts[3]) ?: return false
        val actualDigest = derive(rawPassword, salt, iterations)
        return MessageDigest.isEqual(expectedDigest, actualDigest)
    }

    private fun derive(password: String, salt: ByteArray, iterations: Int): ByteArray {
        val keySpec = PBEKeySpec(password.toCharArray(), salt, iterations, 256)
        val secretKeyFactory = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256")
        return secretKeyFactory.generateSecret(keySpec).encoded
    }

    private fun encode(iterations: Int, salt: ByteArray, digest: ByteArray): String =
        "pbkdf2${"$"}$iterations${"$"}${Base64.getEncoder().encodeToString(salt)}${"$"}${Base64.getEncoder().encodeToString(digest)}"

    private fun decodeBase64(value: String): ByteArray? =
        runCatching { Base64.getDecoder().decode(value) }.getOrNull()
}
