package com.edua.beeduasystem.infrastructure.security;

import com.edua.beeduasystem.domain.exception.InvalidTokenException;
import com.edua.beeduasystem.domain.model.auth.AccessTokenClaims;
import com.edua.beeduasystem.repository.gateways.TokenService;
import org.springframework.http.HttpHeaders;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Auth cho WebSocket: bắt buộc access JWT ở STOMP {@code CONNECT} (native header Authorization).
 * Gán Principal = user, để chặn subscribe topic của người khác (rò rỉ nội dung qua /topic/...).
 */
@Component
public class StompAuthChannelInterceptor implements ChannelInterceptor {

    private static final String BEARER = "Bearer ";

    private final TokenService tokenService;

    public StompAuthChannelInterceptor(TokenService tokenService) {
        this.tokenService = tokenService;
    }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(message);
        if (StompCommand.CONNECT.equals(accessor.getCommand())) {
            String header = accessor.getFirstNativeHeader(HttpHeaders.AUTHORIZATION);
            if (header == null || !header.startsWith(BEARER)) {
                throw new InvalidTokenException("Missing Bearer token on STOMP CONNECT.");
            }
            AccessTokenClaims claims = tokenService.parse(header.substring(BEARER.length()).trim());
            var roles = claims.roles();
            var authorities = roles.stream()
                    .map(r -> new SimpleGrantedAuthority("ROLE_" + r.name()))
                    .toList();
            var auth = new UsernamePasswordAuthenticationToken(claims, null, authorities);
            accessor.setUser(auth);
        }
        return message;
    }
}
