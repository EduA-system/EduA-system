package com.edua.beeduasystem.infrastructure.security;

import com.edua.beeduasystem.domain.exception.InvalidTokenException;
import com.edua.beeduasystem.domain.model.auth.AccessTokenClaims;
import com.edua.beeduasystem.domain.model.auth.Role;
import com.edua.beeduasystem.repository.gateways.TokenService;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.messaging.Message;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageBuilder;

import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class StompAuthChannelInterceptorTests {

    @Test
    void rejectsConnectWithoutAuthorizationHeader() {
        TokenService tokenService = mock(TokenService.class);
        StompAuthChannelInterceptor interceptor = new StompAuthChannelInterceptor(tokenService);

        assertThrows(InvalidTokenException.class, () -> interceptor.preSend(connectMessage(null), null));
    }

    @Test
    void acceptsConnectWithValidBearerToken() {
        TokenService tokenService = mock(TokenService.class);
        when(tokenService.parse("valid-token")).thenReturn(new AccessTokenClaims(
                UUID.randomUUID(), "teacher@example.com", Set.of(Role.TEACHER), null));
        StompAuthChannelInterceptor interceptor = new StompAuthChannelInterceptor(tokenService);

        Message<?> result = interceptor.preSend(connectMessage("Bearer valid-token"), null);

        assertNotNull(result);
        assertNotNull(StompHeaderAccessor.wrap(result).getUser());
    }

    private Message<byte[]> connectMessage(String authorization) {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.CONNECT);
        if (authorization != null) {
            accessor.addNativeHeader(HttpHeaders.AUTHORIZATION, authorization);
        }
        return MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
    }
}
