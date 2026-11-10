package com.ledgerline.ledgerline.dto;

import java.math.BigDecimal;

public class AccountReconciliationResponse {

    private final Long accountId;
    private final String accountNumber;
    private final BigDecimal accountBalance;
    private final BigDecimal ledgerBalance;
    private final int entriesChecked;
    private final boolean reconciled;
    private final String message;

    public AccountReconciliationResponse(
            Long accountId,
            String accountNumber,
            BigDecimal accountBalance,
            BigDecimal ledgerBalance,
            int entriesChecked,
            boolean reconciled,
            String message) {

        this.accountId = accountId;
        this.accountNumber = accountNumber;
        this.accountBalance = accountBalance;
        this.ledgerBalance = ledgerBalance;
        this.entriesChecked = entriesChecked;
        this.reconciled = reconciled;
        this.message = message;
    }

    public Long getAccountId() {
        return accountId;
    }

    public String getAccountNumber() {
        return accountNumber;
    }

    public BigDecimal getAccountBalance() {
        return accountBalance;
    }

    public BigDecimal getLedgerBalance() {
        return ledgerBalance;
    }

    public int getEntriesChecked() {
        return entriesChecked;
    }

    public boolean isReconciled() {
        return reconciled;
    }

    public String getMessage() {
        return message;
    }
}