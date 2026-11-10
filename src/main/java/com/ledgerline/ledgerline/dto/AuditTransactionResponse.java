package com.ledgerline.ledgerline.dto;

import java.math.BigDecimal;
import java.time.Instant;

import com.ledgerline.ledgerline.entity.MoneyTransaction;
import com.ledgerline.ledgerline.entity.TransactionStatus;
import com.ledgerline.ledgerline.entity.TransactionType;

public record AuditTransactionResponse(
        Long transactionId,
        TransactionType type,
        BigDecimal amount,
        Long sourceAccountId,
        Long destinationAccountId,
        Long initiatorId,
        String initiatorName,
        String initiatorEmail,
        TransactionStatus status,
        String rejectionReason,
        Instant createdAt
) {

    public static AuditTransactionResponse from(
            MoneyTransaction transaction) {

        return new AuditTransactionResponse(
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
                transaction.getInitiator().getFullName(),
                transaction.getInitiator().getEmail(),
                transaction.getStatus(),
                transaction.getRejectionReason(),
                transaction.getCreatedAt()
        );
    }
}