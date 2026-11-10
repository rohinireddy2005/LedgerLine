package com.ledgerline.ledgerline.dto;

import java.math.BigDecimal;
import java.time.Instant;

import com.ledgerline.ledgerline.entity.Account;
import com.ledgerline.ledgerline.entity.AccountStatus;

public record AuditAccountResponse(
        Long accountId,
        String accountNumber,
        Long ownerId,
        String ownerName,
        String ownerEmail,
        BigDecimal balance,
        String currency,
        AccountStatus status,
        Instant createdAt
) {

    public static AuditAccountResponse from(Account account) {

        return new AuditAccountResponse(
                account.getId(),
                account.getAccountNumber(),
                account.getOwner().getId(),
                account.getOwner().getFullName(),
                account.getOwner().getEmail(),
                account.getBalance(),
                account.getCurrency(),
                account.getStatus(),
                account.getCreatedAt()
        );
    }
}