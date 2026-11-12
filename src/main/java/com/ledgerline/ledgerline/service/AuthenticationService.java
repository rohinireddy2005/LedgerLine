package com.ledgerline.ledgerline.service;

import java.util.Locale;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.ledgerline.ledgerline.dto.ChangePasswordRequest;
import com.ledgerline.ledgerline.dto.LoginRequest;
import com.ledgerline.ledgerline.dto.LoginResponse;
import com.ledgerline.ledgerline.dto.UserResponse;
import com.ledgerline.ledgerline.entity.AppUser;
import com.ledgerline.ledgerline.repository.AppUserRepository;
import com.ledgerline.ledgerline.security.CustomUserDetailsService;
import com.ledgerline.ledgerline.security.JwtService;

@Service
public class AuthenticationService {

    private final AuthenticationManager authenticationManager;
    private final CustomUserDetailsService userDetailsService;
    private final JwtService jwtService;
    private final AppUserRepository appUserRepository;
    private final PasswordEncoder passwordEncoder;
    private final long expirationMinutes;

    public AuthenticationService(
            AuthenticationManager authenticationManager,
            CustomUserDetailsService userDetailsService,
            JwtService jwtService,
            AppUserRepository appUserRepository,
            PasswordEncoder passwordEncoder,
            @Value("${app.jwt.expiration-minutes:15}")
            long expirationMinutes) {

        this.authenticationManager = authenticationManager;
        this.userDetailsService = userDetailsService;
        this.jwtService = jwtService;
        this.appUserRepository = appUserRepository;
        this.passwordEncoder = passwordEncoder;
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

        AppUser user = appUserRepository.findByEmail(normalizedEmail)
                .orElse(null);

        UserResponse userResponse = user != null ? UserResponse.from(user) : null;

        return new LoginResponse(
                token,
                "Bearer",
                expirationMinutes * 60,
                userResponse
        );
    }

    @Transactional(readOnly = true)
    public UserResponse getUserProfile(String email) {

        String normalizedEmail = email
                .trim()
                .toLowerCase(Locale.ROOT);

        AppUser user = appUserRepository.findByEmail(normalizedEmail)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "User not found"
                ));

        return UserResponse.from(user);
    }

    @Transactional
    public void changePassword(String email, ChangePasswordRequest request) {

        String normalizedEmail = email
                .trim()
                .toLowerCase(Locale.ROOT);

        AppUser user = appUserRepository.findByEmail(normalizedEmail)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "User not found"
                ));

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Current password is incorrect"
            );
        }

        if (passwordEncoder.matches(request.getNewPassword(), user.getPassword())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "New password cannot be the same as the current password"
            );
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        appUserRepository.save(user);
    }
}
