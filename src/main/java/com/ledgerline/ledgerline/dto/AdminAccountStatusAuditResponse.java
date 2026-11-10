
package com.ledgerline.ledgerline.dto;

import java.time.Instant;

import com.ledgerline.ledgerline.entity.AccountStatusAudit;

public record AdminAccountStatusAuditResponse(
        Long id,
        Long accountId,
        String accountNumber,
        String previousStatus,
        String newStatus,
        Long administratorId,
        String administratorName,
        String administratorEmail,
        String reason,
        Instant createdAt
) {

    public static AdminAccountStatusAuditResponse from(
            AccountStatusAudit audit) {

        return new AdminAccountStatusAuditResponse(
                audit.getId(),
                audit.getAccount().getId(),
                audit.getAccount().getAccountNumber(),
                audit.getPreviousStatus(),
                audit.getNewStatus(),
                audit.getAdministrator().getId(),
                audit.getAdministrator().getFullName(),
                audit.getAdministrator().getEmail(),
                audit.getReason(),
                audit.getCreatedAt()
        );
    }
}
