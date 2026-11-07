
package com.ledgerline.ledgerline.dto;

import java.math.BigDecimal;
import java.time.Instant;

import com.ledgerline.ledgerline.entity.MoneyTransaction;
import com.ledgerline.ledgerline.entity.TransactionStatus;
import com.ledgerline.ledgerline.entity.TransactionType;

public record MoneyTransactionResponse(
        Long id,
        TransactionType type,
        BigDecimal amount,
        Long sourceAccountId,
        Long destinationAccountId,
        Long initiatorId,
        TransactionStatus status,
        String idempotencyKey,
        String rejectionReason,
        Instant createdAt
) {

    public static MoneyTransactionResponse from(
            MoneyTransaction transaction) {

        return new MoneyTransactionResponse(
                transaction.getId(),
                transaction.getType(),
                transaction.getAmount(),

                transaction.getSourceAccount() == null
                        ? null
                        : transaction.getSourceAccount().getId(),

                transaction.getDestinationAccount() == null
                        ? null
                        : transaction.getDestinationAccount().getId(),

                transaction.getInitiator().getId(),
                transaction.getStatus(),
                transaction.getIdempotencyKey(),
                transaction.getRejectionReason(),
                transaction.getCreatedAt()
        );
    }
}
