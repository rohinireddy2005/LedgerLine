
package com.ledgerline.ledgerline.config;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.util.Base64;
import java.util.Date;

import javax.crypto.SecretKey;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import com.ledgerline.ledgerline.security.JwtService;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class JwtAuthenticationSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtService jwtService;

    @Value("${app.jwt.secret}")
    private String jwtSecret;

    @Test
    void invalidJwtShouldReturnUnauthorized() throws Exception {

        mockMvc.perform(
                get("/api/accounts")
                        .header(
                                "Authorization",
                                "Bearer invalid.token.value"
                        )
        )
        .andExpect(status().isUnauthorized());
    }

    @Test
    void expiredJwtShouldReturnUnauthorized() throws Exception {

        Instant now = Instant.now();

        byte[] keyBytes = Base64.getDecoder().decode(jwtSecret);
        SecretKey secretKey = Keys.hmacShaKeyFor(keyBytes);

        String expiredToken = Jwts.builder()
                .subject("expired-user@example.com")
                .issuedAt(Date.from(now.minusSeconds(120)))
                .expiration(Date.from(now.minusSeconds(60)))
                .signWith(secretKey)
                .compact();

        mockMvc.perform(
                get("/api/accounts")
                        .header(
                                "Authorization",
                                "Bearer " + expiredToken
                        )
        )
        .andExpect(status().isUnauthorized());
    }

    @Test
    void tokenWithoutExpirationShouldBeInvalid() {

        byte[] keyBytes = Base64.getDecoder().decode(jwtSecret);
        SecretKey secretKey = Keys.hmacShaKeyFor(keyBytes);

        String tokenWithoutExpiration = Jwts.builder()
                .subject("test-user@example.com")
                .issuedAt(Date.from(Instant.now()))
                .signWith(secretKey)
                .compact();

        UserDetails userDetails = User.withUsername("test-user@example.com")
                .password("unused")
                .authorities("ROLE_ACCOUNT_HOLDER")
                .build();

        assertFalse(
                jwtService.isTokenValid(
                        tokenWithoutExpiration,
                        userDetails
                )
        );
    }
}
