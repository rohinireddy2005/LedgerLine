
package com.ledgerline.ledgerline.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;

import java.math.BigDecimal;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

import com.ledgerline.ledgerline.dto.MoneyTransactionResponse;
import com.ledgerline.ledgerline.dto.WithdrawalRequest;

import com.ledgerline.ledgerline.entity.Account;
import com.ledgerline.ledgerline.entity.AppUser;
import com.ledgerline.ledgerline.entity.LedgerEntry;
import com.ledgerline.ledgerline.entity.LedgerEntryType;
import com.ledgerline.ledgerline.entity.MoneyTransaction;
import com.ledgerline.ledgerline.entity.Role;
import com.ledgerline.ledgerline.entity.TransactionStatus;

import com.ledgerline.ledgerline.repository.AccountRepository;
import com.ledgerline.ledgerline.repository.AppUserRepository;
import com.ledgerline.ledgerline.repository.LedgerEntryRepository;
import com.ledgerline.ledgerline.repository.MoneyTransactionRepository;

@SpringBootTest
@ActiveProfiles("test")
class MoneyTransactionPostgresIntegrationTest {

    @Autowired
    private MoneyTransactionService moneyTransactionService;

    @Autowired
    private AppUserRepository appUserRepository;

    @Autowired
    private AccountRepository accountRepository;

    @Autowired
    private MoneyTransactionRepository transactionRepository;

    @Autowired
    private LedgerEntryRepository ledgerEntryRepository;

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
                "Integration Test User",
                "integration-test@ledgerline.test",
                "test-password",
                Role.ACCOUNT_HOLDER
        );

        user = appUserRepository.saveAndFlush(user);
        userId = user.getId();

        Account account = new Account(
                "INTTEST0001",
                user
        );

        account.setBalance(new BigDecimal("100.00"));

        account = accountRepository.saveAndFlush(account);
        accountId = account.getId();
    }

    @Test
    void concurrentWithdrawalsShouldNotAllowDoubleSpending()
            throws Exception {

        WithdrawalRequest firstRequest = new WithdrawalRequest();
        firstRequest.setAccountId(accountId);
        firstRequest.setAmount(new BigDecimal("80.00"));

        WithdrawalRequest secondRequest = new WithdrawalRequest();
        secondRequest.setAccountId(accountId);
        secondRequest.setAmount(new BigDecimal("80.00"));

        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch start = new CountDownLatch(1);

        ExecutorService executor =
                Executors.newFixedThreadPool(2);

        try {

            Future<MoneyTransactionResponse> firstFuture =
                    executor.submit(() -> {

                        ready.countDown();
                        start.await();

                        return moneyTransactionService.withdraw(
                                userId,
                                firstRequest,
                                "concurrent-withdrawal-001"
                        );
                    });

            Future<MoneyTransactionResponse> secondFuture =
                    executor.submit(() -> {

                        ready.countDown();
                        start.await();

                        return moneyTransactionService.withdraw(
                                userId,
                                secondRequest,
                                "concurrent-withdrawal-002"
                        );
                    });

            assertEquals(
                    true,
                    ready.await(10, TimeUnit.SECONDS),
                    "Both withdrawal threads should be ready"
            );

            start.countDown();

            MoneyTransactionResponse firstResult =
                    firstFuture.get(30, TimeUnit.SECONDS);

            MoneyTransactionResponse secondResult =
                    secondFuture.get(30, TimeUnit.SECONDS);

            List<TransactionStatus> statuses = List.of(
                    firstResult.status(),
                    secondResult.status()
            );

            assertEquals(
                    1,
                    statuses.stream()
                            .filter(status ->
                                    status == TransactionStatus.SUCCESS)
                            .count(),
                    "Exactly one withdrawal should succeed"
            );

            assertEquals(
                    1,
                    statuses.stream()
                            .filter(status ->
                                    status == TransactionStatus.REJECTED)
                            .count(),
                    "Exactly one withdrawal should be rejected"
            );

            assertNotEquals(
                    firstResult.idempotencyKey(),
                    secondResult.idempotencyKey(),
                    "Requests must use different idempotency keys"
            );

            Account updatedAccount =
                    accountRepository.findById(accountId)
                            .orElseThrow();

            assertEquals(
                    0,
                    new BigDecimal("20.00")
                            .compareTo(updatedAccount.getBalance()),
                    "Final account balance should be 20.00"
            );

            List<MoneyTransaction> transactions =
                    transactionRepository
                            .findBySourceAccountIdOrDestinationAccountIdOrderByCreatedAtDesc(
                                    accountId,
                                    accountId
                            );

            assertEquals(
                    2,
                    transactions.size(),
                    "Both attempts should be recorded"
            );

            List<LedgerEntry> entries =
                    ledgerEntryRepository
                            .findByAccountIdOrderByCreatedAtAscIdAsc(
                                    accountId
                            );

            assertEquals(
                    1,
                    entries.size(),
                    "Only the successful withdrawal should create a ledger entry"
            );

            LedgerEntry entry = entries.get(0);

            assertEquals(
                    LedgerEntryType.DEBIT,
                    entry.getEntryType()
            );

            assertEquals(
                    0,
                    new BigDecimal("80.00")
                            .compareTo(entry.getAmount())
            );

            assertEquals(
                    0,
                    new BigDecimal("20.00")
                            .compareTo(entry.getBalanceAfter())
            );

        } finally {

            executor.shutdownNow();
        }
    }
}
