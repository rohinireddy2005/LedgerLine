package com.ledgerline.ledgerline.dto;

public record LoginResponse(
        String accessToken,
        String tokenType,
        long expiresIn
) {
}