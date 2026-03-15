package com.agentic.restaurant.orders.application

import com.agentic.restaurant.orders.persistence.OrderPersistence
import com.agentic.restaurant.orders.persistence.PendingOutboxEvent
import org.junit.jupiter.api.Test
import org.mockito.ArgumentMatchers.any
import org.springframework.amqp.core.Message
import org.mockito.ArgumentMatchers.eq
import org.mockito.Mockito.doThrow
import org.mockito.Mockito.mock
import org.mockito.Mockito.never
import org.mockito.Mockito.times
import org.mockito.Mockito.verify
import org.mockito.Mockito.`when`
import org.springframework.amqp.AmqpConnectException
import org.springframework.amqp.rabbit.core.RabbitTemplate

class OrderOutboxPublisherTests {

    private val orderPersistence: OrderPersistence = mock(OrderPersistence::class.java)
    private val rabbitTemplate: RabbitTemplate = mock(RabbitTemplate::class.java)

    @Test
    fun `marks events published when send succeeds`() {
        `when`(orderPersistence.findUnpublishedOutboxEvents(10)).thenReturn(
            listOf(
                PendingOutboxEvent(eventId = "event-1", routingKey = "item.requested", payloadJson = """{"foo":"bar"}"""),
            ),
        )
        val publisher = OrderOutboxPublisher(orderPersistence, rabbitTemplate, "restaurant.production.v1", 10)

        publisher.publishPendingEvents()

        verify(rabbitTemplate, times(1)).send(eq("restaurant.production.v1"), eq("item.requested"), any(Message::class.java))
        verify(orderPersistence, times(1)).markOutboxEventPublished("event-1")
    }

    @Test
    fun `keeps event unpublished when broker send fails`() {
        `when`(orderPersistence.findUnpublishedOutboxEvents(10)).thenReturn(
            listOf(
                PendingOutboxEvent(eventId = "event-1", routingKey = "item.requested", payloadJson = """{"foo":"bar"}"""),
            ),
        )
        doThrow(AmqpConnectException(RuntimeException("broker unavailable"))).`when`(rabbitTemplate)
            .send(eq("restaurant.production.v1"), eq("item.requested"), any(Message::class.java))

        val publisher = OrderOutboxPublisher(orderPersistence, rabbitTemplate, "restaurant.production.v1", 10)

        publisher.publishPendingEvents()

        verify(orderPersistence, never()).markOutboxEventPublished("event-1")
    }
}
