package com.ledgerline.ledgerline.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.ledgerline.ledgerline.dto.LoginRequest;
import com.ledgerline.ledgerline.dto.LoginResponse;
import com.ledgerline.ledgerline.dto.RegisterRequest;
import com.ledgerline.ledgerline.dto.UserResponse;
import com.ledgerline.ledgerline.service.AuthenticationService;
import com.ledgerline.ledgerline.service.RegistrationService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/auth")
@Validated
public class AuthController {

    private final RegistrationService registrationService;
    private final AuthenticationService authenticationService;

    public AuthController(
            RegistrationService registrationService,
            AuthenticationService authenticationService) {

        this.registrationService = registrationService;
        this.authenticationService = authenticationService;
    }

    @PostMapping("/register")
    public ResponseEntity<UserResponse> register(
            @Valid @RequestBody RegisterRequest request) {

        UserResponse response =
                registrationService.register(request);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(response);
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(
            @Valid @RequestBody LoginRequest request) {

        LoginResponse response =
                authenticationService.login(request);

        return ResponseEntity.ok(response);
    }

    @GetMapping("/me")
    public ResponseEntity<UserResponse> getCurrentUser(
            Authentication authentication) {

        if (authentication == null || !authentication.isAuthenticated()) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Authentication is required"
            );
        }

        UserResponse response =
                authenticationService.getUserProfile(authentication.getName());

        return ResponseEntity.ok(response);
    }
}
