package com.ledgerline.ledgerline.dto;

import java.time.Instant;

import com.ledgerline.ledgerline.entity.AppUser;
import com.ledgerline.ledgerline.entity.Role;

public record UserResponse(
        Long id,
        String fullName,
        String email,
        Role role,
        Instant createdAt
) {

    public static UserResponse from(AppUser user) {
        return new UserResponse(
                user.getId(),
                user.getFullName(),
                user.getEmail(),
                user.getRole(),
                user.getCreatedAt()
        );
    }
}