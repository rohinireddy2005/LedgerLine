
package com.ledgerline.ledgerline.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.math.BigDecimal;
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
    void retryingSameDepositShouldNotCreateDuplicateTransaction() {

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

        assertEquals(1, transactionCount);

        Integer ledgerCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM ledger_entries "
                + "WHERE account_id = ?",
                Integer.class,
                accountId
        );

        assertEquals(1, ledgerCount);

        DepositRequest differentRequest = new DepositRequest();
        differentRequest.setAccountId(accountId);
        differentRequest.setAmount(new BigDecimal("30.00"));

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> moneyTransactionService.deposit(
                        userId,
                        differentRequest,
                        idempotencyKey
                )
        );

        assertEquals(409, exception.getStatusCode().value());

        Account finalAccount =
                accountRepository.findById(accountId)
                        .orElseThrow();

        assertEquals(
                0,
                new BigDecimal("125.00")
                        .compareTo(finalAccount.getBalance())
        );

        Integer finalTransactionCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM money_transactions "
                + "WHERE initiator_id = ? AND idempotency_key = ?",
                Integer.class,
                userId,
                idempotencyKey
        );

        assertEquals(1, finalTransactionCount);
    }

    @Test
    void simultaneousSameDepositRequestsShouldCreateOnlyOneTransaction()
            throws Exception {

        String idempotencyKey = "concurrent-deposit-test-001";

        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch start = new CountDownLatch(1);

        ExecutorService executor = Executors.newFixedThreadPool(2);

        try {

            Future<MoneyTransactionResponse> firstFuture =
                    executor.submit(() -> {

                        DepositRequest request = new DepositRequest();
                        request.setAccountId(accountId);
                        request.setAmount(new BigDecimal("25.00"));

                        ready.countDown();
                        start.await();

                        return moneyTransactionService.deposit(
                                userId,
                                request,
                                idempotencyKey
                        );
                    });

            Future<MoneyTransactionResponse> secondFuture =
                    executor.submit(() -> {

                        DepositRequest request = new DepositRequest();
                        request.setAccountId(accountId);
                        request.setAmount(new BigDecimal("25.00"));

                        ready.countDown();
                        start.await();

                        return moneyTransactionService.deposit(
                                userId,
                                request,
                                idempotencyKey
                        );
                    });

            assertTrue(
                    ready.await(5, TimeUnit.SECONDS),
                    "Both requests should be ready before starting"
            );

            start.countDown();

            MoneyTransactionResponse firstResult =
                    firstFuture.get(20, TimeUnit.SECONDS);

            MoneyTransactionResponse secondResult =
                    secondFuture.get(20, TimeUnit.SECONDS);

            assertEquals(
                    firstResult.id(),
                    secondResult.id(),
                    "Both requests should return the same transaction ID"
            );

            assertEquals(
                    TransactionStatus.SUCCESS,
                    firstResult.status()
            );

            assertEquals(
                    TransactionStatus.SUCCESS,
                    secondResult.status()
            );

            Account updatedAccount =
                    accountRepository.findById(accountId)
                            .orElseThrow();

            assertEquals(
                    0,
                    new BigDecimal("125.00")
                            .compareTo(updatedAccount.getBalance()),
                    "The concurrent deposit must update the balance only once"
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

        } finally {

            start.countDown();
            executor.shutdownNow();
        }
    }
}
