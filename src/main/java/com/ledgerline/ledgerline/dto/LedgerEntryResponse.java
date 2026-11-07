
package com.ledgerline.ledgerline.dto;

import java.math.BigDecimal;
import java.time.Instant;

import com.ledgerline.ledgerline.entity.LedgerEntry;
import com.ledgerline.ledgerline.entity.LedgerEntryType;

public record LedgerEntryResponse(
        Long id,
        Long transactionId,
        Long accountId,
        LedgerEntryType entryType,
        BigDecimal amount,
        BigDecimal balanceAfter,
        Instant createdAt
) {

    public static LedgerEntryResponse from(LedgerEntry entry) {

        return new LedgerEntryResponse(
                entry.getId(),
                entry.getTransaction().getId(),
                entry.getAccount().getId(),
                entry.getEntryType(),
                entry.getAmount(),
                entry.getBalanceAfter(),
                entry.getCreatedAt()
        );
    }
}
