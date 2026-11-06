
package com.ledgerline.ledgerline.service;

import java.util.Locale;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import com.ledgerline.ledgerline.dto.LoginRequest;
import com.ledgerline.ledgerline.dto.LoginResponse;
import com.ledgerline.ledgerline.security.CustomUserDetailsService;
import com.ledgerline.ledgerline.security.JwtService;

@Service
public class AuthenticationService {

    private final AuthenticationManager authenticationManager;
    private final CustomUserDetailsService userDetailsService;
    private final JwtService jwtService;
    private final long expirationMinutes;

    public AuthenticationService(
            AuthenticationManager authenticationManager,
            CustomUserDetailsService userDetailsService,
            JwtService jwtService,
            @Value("${app.jwt.expiration-minutes:15}")
            long expirationMinutes) {

        this.authenticationManager = authenticationManager;
        this.userDetailsService = userDetailsService;
        this.jwtService = jwtService;
        this.expirationMinutes = expirationMinutes;
    }

    public LoginResponse login(LoginRequest request) {

        String normalizedEmail = request.getEmail()
                .trim()
                .toLowerCase(Locale.ROOT);

        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        normalizedEmail,
                        request.getPassword()
                )
        );

        UserDetails userDetails =
                userDetailsService.loadUserByUsername(normalizedEmail);

        String token = jwtService.generateToken(userDetails);

        return new LoginResponse(
                token,
                "Bearer",
                expirationMinutes * 60
        );
    }
}
