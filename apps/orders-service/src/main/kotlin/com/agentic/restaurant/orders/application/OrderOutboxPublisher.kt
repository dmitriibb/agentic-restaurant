package com.agentic.restaurant.orders.application

import com.agentic.restaurant.orders.persistence.OrderPersistence
import org.slf4j.LoggerFactory
import org.springframework.amqp.AmqpException
import org.springframework.amqp.core.MessageBuilder
import org.springframework.amqp.core.MessageDeliveryMode
import org.springframework.amqp.core.MessageProperties
import org.springframework.amqp.rabbit.core.RabbitTemplate
import org.springframework.beans.factory.annotation.Value
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Component
import java.nio.charset.StandardCharsets

@Component
class OrderOutboxPublisher(
    private val orderPersistence: OrderPersistence,
    private val rabbitTemplate: RabbitTemplate,
    @Value("\${app.outbox.exchange:restaurant.production.v1}")
    private val exchange: String,
    @Value("\${app.outbox.publisher.batch-size:100}")
    private val batchSize: Int,
) {
    private val log = LoggerFactory.getLogger(javaClass)

    @Scheduled(fixedDelayString = "\${app.outbox.publisher.fixed-delay-ms:3000}")
    fun publishPendingEvents() {
        val pendingEvents = orderPersistence.findUnpublishedOutboxEvents(batchSize)
        pendingEvents.forEach { event ->
            try {
                val message = MessageBuilder
                    .withBody(event.payloadJson.toByteArray(StandardCharsets.UTF_8))
                    .setContentType(MessageProperties.CONTENT_TYPE_JSON)
                    .setDeliveryMode(MessageDeliveryMode.PERSISTENT)
                    .build()
                rabbitTemplate.send(exchange, event.routingKey, message)
                orderPersistence.markOutboxEventPublished(event.eventId)
            } catch (ex: AmqpException) {
                log.warn("Failed to publish outbox event {}, will retry later", event.eventId, ex)
            }
        }
    }
}
