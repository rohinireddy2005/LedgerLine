package com.ledgerline.ledgerline.dto;

import com.ledgerline.ledgerline.entity.AccountStatus;

public record AccountLookupResponse(
        String accountNumber,
        String currency,
        AccountStatus status,
        String ownerDisplayName
) {
}

