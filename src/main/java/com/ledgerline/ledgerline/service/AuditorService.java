
package com.ledgerline.ledgerline.service;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.ledgerline.ledgerline.dto.AuditAccountResponse;
import com.ledgerline.ledgerline.dto.AuditLedgerEntryResponse;
import com.ledgerline.ledgerline.dto.AuditTransactionResponse;
import com.ledgerline.ledgerline.entity.Account;
import com.ledgerline.ledgerline.entity.LedgerEntry;
import com.ledgerline.ledgerline.entity.MoneyTransaction;
import com.ledgerline.ledgerline.repository.AccountRepository;
import com.ledgerline.ledgerline.repository.LedgerEntryRepository;
import com.ledgerline.ledgerline.repository.MoneyTransactionRepository;

@Service
@Transactional(readOnly = true)
public class AuditorService {

    private final AccountRepository accountRepository;
    private final MoneyTransactionRepository transactionRepository;
    private final LedgerEntryRepository ledgerEntryRepository;

    public AuditorService(
            AccountRepository accountRepository,
            MoneyTransactionRepository transactionRepository,
            LedgerEntryRepository ledgerEntryRepository) {

        this.accountRepository = accountRepository;
        this.transactionRepository = transactionRepository;
        this.ledgerEntryRepository = ledgerEntryRepository;
    }

    public Page<AuditTransactionResponse> getAllTransactions(
            Pageable pageable) {

        Page<MoneyTransaction> transactions =
                transactionRepository
                        .findAllByOrderByCreatedAtDescIdDesc(pageable);

        return transactions.map(AuditTransactionResponse::from);
    }

    public Page<AuditLedgerEntryResponse> getAccountLedger(
            Long accountId,
            Pageable pageable) {

        if (!accountRepository.existsById(accountId)) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Account not found"
            );
        }

        Page<LedgerEntry> entries =
                ledgerEntryRepository
                        .findByAccountIdOrderByCreatedAtAscIdAsc(
                                accountId,
                                pageable
                        );

        return entries.map(AuditLedgerEntryResponse::from);
    }

    public Page<AuditAccountResponse> getAllAccounts(
            Pageable pageable) {

        Page<Account> accounts =
                accountRepository
                        .findAllByOrderByCreatedAtDescIdDesc(pageable);

        return accounts.map(AuditAccountResponse::from);
    }
}
