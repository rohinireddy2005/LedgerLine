
package com.ledgerline.ledgerline.dto;

import java.math.BigDecimal;
import java.time.Instant;

import com.ledgerline.ledgerline.entity.Account;
import com.ledgerline.ledgerline.entity.AccountStatus;

public record AccountResponse(
        Long id,
        String accountNumber,
        BigDecimal balance,
        String currency,
        AccountStatus status,
        Instant createdAt
) {

    public static AccountResponse from(Account account) {

        return new AccountResponse(
                account.getId(),
                account.getAccountNumber(),
                account.getBalance(),
                account.getCurrency(),
                account.getStatus(),
                account.getCreatedAt()
        );
    }
}
