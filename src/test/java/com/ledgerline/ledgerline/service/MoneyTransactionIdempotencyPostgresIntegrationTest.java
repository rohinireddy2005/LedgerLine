
package com.ledgerline.ledgerline.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.math.BigDecimal;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.web.server.ResponseStatusException;

import com.ledgerline.ledgerline.dto.DepositRequest;
import com.ledgerline.ledgerline.dto.MoneyTransactionResponse;

import com.ledgerline.ledgerline.entity.Account;
import com.ledgerline.ledgerline.entity.AppUser;
import com.ledgerline.ledgerline.entity.Role;
import com.ledgerline.ledgerline.entity.TransactionStatus;

import com.ledgerline.ledgerline.repository.AccountRepository;
import com.ledgerline.ledgerline.repository.AppUserRepository;

@SpringBootTest
@ActiveProfiles("test")
class MoneyTransactionIdempotencyPostgresIntegrationTest {

    @Autowired
    private MoneyTransactionService moneyTransactionService;

    @Autowired
    private AppUserRepository appUserRepository;

    @Autowired
    private AccountRepository accountRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private Long userId;
    private Long accountId;

    @BeforeEach
    void setUp() {

        jdbcTemplate.execute(
                "TRUNCATE TABLE ledger_entries, money_transactions, "
                + "accounts, users RESTART IDENTITY CASCADE"
        );

        AppUser user = new AppUser(
                "Idempotency Test User",
                "idempotency-test@ledgerline.test",
                "test-password",
                Role.ACCOUNT_HOLDER
        );

        user = appUserRepository.saveAndFlush(user);
        userId = user.getId();

        Account account = new Account(
                "IDEMPOTENCY001",
                user
        );

        account.setBalance(new BigDecimal("100.00"));

        account = accountRepository.saveAndFlush(account);
        accountId = account.getId();
    }

    @Test
    void retryingSameDepositShouldNotCreateDuplicateTransaction()
            {

        String idempotencyKey = "deposit-retry-test-001";

        DepositRequest firstRequest = new DepositRequest();
        firstRequest.setAccountId(accountId);
        firstRequest.setAmount(new BigDecimal("25.00"));

        MoneyTransactionResponse firstResult =
                moneyTransactionService.deposit(
                        userId,
                        firstRequest,
                        idempotencyKey
                );

        DepositRequest retryRequest = new DepositRequest();
        retryRequest.setAccountId(accountId);
        retryRequest.setAmount(new BigDecimal("25.00"));

        MoneyTransactionResponse retryResult =
                moneyTransactionService.deposit(
                        userId,
                        retryRequest,
                        idempotencyKey
                );

        assertEquals(
                firstResult.id(),
                retryResult.id(),
                "Retry should return the original transaction ID"
        );

        assertEquals(
                TransactionStatus.SUCCESS,
                retryResult.status(),
                "The original successful transaction should be returned"
        );

        Account updatedAccount =
                accountRepository.findById(accountId)
                        .orElseThrow();

        assertEquals(
                0,
                new BigDecimal("125.00")
                        .compareTo(updatedAccount.getBalance()),
                "Balance should increase only once"
        );

        Integer transactionCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM money_transactions "
                + "WHERE initiator_id = ? AND idempotency_key = ?",
                Integer.class,
                userId,
                idempotencyKey
        );

        assertEquals(
                1,
                transactionCount,
                "Only one transaction should be stored"
        );

        Integer ledgerCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM ledger_entries "
                + "WHERE account_id = ?",
                Integer.class,
                accountId
        );

        assertEquals(
                1,
                ledgerCount,
                "Only one ledger entry should be created"
        );

        DepositRequest differentRequest = new DepositRequest();
        differentRequest.setAccountId(accountId);
        differentRequest.setAmount(new BigDecimal("30.00"));

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> moneyTransactionService.deposit(
                        userId,
                        differentRequest,
                        idempotencyKey
                ),
                "Reusing the key with different request data must be rejected"
        );

        assertEquals(
                409,
                exception.getStatusCode().value(),
                "Different request with the same key should return HTTP 409"
        );

        Account finalAccount =
                accountRepository.findById(accountId)
                        .orElseThrow();

        assertEquals(
                0,
                new BigDecimal("125.00")
                        .compareTo(finalAccount.getBalance()),
                "Conflicting retry must not change the balance"
        );

        Integer finalTransactionCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM money_transactions "
                + "WHERE initiator_id = ? AND idempotency_key = ?",
                Integer.class,
                userId,
                idempotencyKey
        );

        assertEquals(
                1,
                finalTransactionCount,
                "Conflicting retry must not create another transaction"
        );
    }
}
