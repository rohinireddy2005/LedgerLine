package com.ledgerline.ledgerline.dto;

import java.math.BigDecimal;
import java.time.Instant;

import com.ledgerline.ledgerline.entity.LedgerEntry;
import com.ledgerline.ledgerline.entity.LedgerEntryType;
import com.ledgerline.ledgerline.entity.TransactionStatus;
import com.ledgerline.ledgerline.entity.TransactionType;

public record AuditLedgerEntryResponse(
        Long ledgerEntryId,
        Long transactionId,
        Long accountId,
        LedgerEntryType entryType,
        BigDecimal amount,
        BigDecimal balanceAfter,
        TransactionType transactionType,
        TransactionStatus transactionStatus,
        Long initiatorId,
        String initiatorName,
        String initiatorEmail,
        Instant createdAt
) {

    public static AuditLedgerEntryResponse from(LedgerEntry entry) {

        return new AuditLedgerEntryResponse(
                entry.getId(),
                entry.getTransaction().getId(),
                entry.getAccount().getId(),
                entry.getEntryType(),
                entry.getAmount(),
                entry.getBalanceAfter(),
                entry.getTransaction().getType(),
                entry.getTransaction().getStatus(),
                entry.getTransaction().getInitiator().getId(),
                entry.getTransaction().getInitiator().getFullName(),
                entry.getTransaction().getInitiator().getEmail(),
                entry.getCreatedAt()
        );
    }
}