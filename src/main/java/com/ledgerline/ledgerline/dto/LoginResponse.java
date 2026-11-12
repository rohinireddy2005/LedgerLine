package com.ledgerline.ledgerline.dto;

public record LoginResponse(
        String accessToken,
        String tokenType,
        long expiresIn,
        UserResponse user
) {
    public LoginResponse(String accessToken, String tokenType, long expiresIn) {
        this(accessToken, tokenType, expiresIn, null);
    }
}
