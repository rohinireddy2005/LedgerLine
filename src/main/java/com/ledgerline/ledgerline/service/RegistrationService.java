package com.ledgerline.ledgerline.service;

import java.util.Locale;

import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.ledgerline.ledgerline.dto.RegisterRequest;
import com.ledgerline.ledgerline.dto.UserResponse;
import com.ledgerline.ledgerline.entity.AppUser;
import com.ledgerline.ledgerline.entity.Role;
import com.ledgerline.ledgerline.repository.AppUserRepository;

@Service
public class RegistrationService {

    private final AppUserRepository appUserRepository;
    private final PasswordEncoder passwordEncoder;

    public RegistrationService(
            AppUserRepository appUserRepository,
            PasswordEncoder passwordEncoder) {

        this.appUserRepository = appUserRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public UserResponse register(RegisterRequest request) {

        String normalizedEmail = request.getEmail()
                .trim()
                .toLowerCase(Locale.ROOT);

        if (appUserRepository.existsByEmail(normalizedEmail)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "An account with this email already exists"
            );
        }

        String encodedPassword =
                passwordEncoder.encode(request.getPassword());

        AppUser user = new AppUser(
                request.getFullName().trim(),
                normalizedEmail,
                encodedPassword,
                Role.ACCOUNT_HOLDER
        );

        AppUser savedUser = appUserRepository.save(user);

        return UserResponse.from(savedUser);
    }
}