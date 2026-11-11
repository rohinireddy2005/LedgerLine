
package com.ledgerline.ledgerline.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

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

import com.ledgerline.ledgerline.dto.MoneyTransactionResponse;
import com.ledgerline.ledgerline.dto.TransferRequest;
import com.ledgerline.ledgerline.entity.Account;
import com.ledgerline.ledgerline.entity.AppUser;
import com.ledgerline.ledgerline.entity.Role;
import com.ledgerline.ledgerline.entity.TransactionStatus;
import com.ledgerline.ledgerline.repository.AccountRepository;
import com.ledgerline.ledgerline.repository.AppUserRepository;

@SpringBootTest
@ActiveProfiles("test")
class MoneyTransferPostgresIntegrationTest {

    @Autowired
    private MoneyTransactionService moneyTransactionService;

    @Autowired
    private AppUserRepository appUserRepository;

    @Autowired
    private AccountRepository accountRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private Long userId;
    private Long destinationUserId;
    private Long sourceAccountId;
    private Long destinationAccountId;

    @BeforeEach
    void setUp() {

        jdbcTemplate.execute(
                "TRUNCATE TABLE ledger_entries, money_transactions, "
                + "accounts, users RESTART IDENTITY CASCADE"
        );

        AppUser user = new AppUser(
                "Transfer Test User",
                "transfer-test@ledgerline.test",
                "test-password",
                Role.ACCOUNT_HOLDER
        );

        user = appUserRepository.saveAndFlush(user);
        userId = user.getId();

        AppUser destinationUser = new AppUser(
                "Destination Test User",
                "destination-test@ledgerline.test",
                "test-password",
                Role.ACCOUNT_HOLDER
        );

        destinationUser =
                appUserRepository.saveAndFlush(destinationUser);

        destinationUserId = destinationUser.getId();

        Account sourceAccount = new Account(
                "TRANSFER_SOURCE001",
                user
        );

        sourceAccount.setBalance(new BigDecimal("100.00"));

        sourceAccount = accountRepository.saveAndFlush(sourceAccount);
        sourceAccountId = sourceAccount.getId();

        Account destinationAccount = new Account(
                "TRANSFER_DEST001",
                destinationUser
        );

        destinationAccount.setBalance(new BigDecimal("20.00"));

        destinationAccount =
                accountRepository.saveAndFlush(destinationAccount);

        destinationAccountId = destinationAccount.getId();
    }

    @Test
    void successfulTransferShouldPreserveTotalMoney() {

        BigDecimal transferAmount = new BigDecimal("30.00");

        TransferRequest request = new TransferRequest();
        request.setSourceAccountId(sourceAccountId);
        request.setDestinationAccountId(destinationAccountId);
        request.setAmount(transferAmount);

        MoneyTransactionResponse result =
                moneyTransactionService.transfer(
                        userId,
                        request,
                        "transfer-conservation-test-001"
                );

        assertEquals(
                TransactionStatus.SUCCESS,
                result.status(),
                "The transfer should succeed"
        );

        Account updatedSource =
                accountRepository.findById(sourceAccountId)
                        .orElseThrow();

        Account updatedDestination =
                accountRepository.findById(destinationAccountId)
                        .orElseThrow();

        assertEquals(
                0,
                new BigDecimal("70.00")
                        .compareTo(updatedSource.getBalance()),
                "Source balance should decrease by the transfer amount"
        );

        assertEquals(
                0,
                new BigDecimal("50.00")
                        .compareTo(updatedDestination.getBalance()),
                "Destination balance should increase by the transfer amount"
        );

        BigDecimal totalBalance = jdbcTemplate.queryForObject(
                "SELECT SUM(balance) FROM accounts WHERE id IN (?, ?)",
                BigDecimal.class,
                sourceAccountId,
                destinationAccountId
        );

        assertEquals(
                0,
                new BigDecimal("120.00").compareTo(totalBalance),
                "Total money across both accounts must remain unchanged"
        );

        Integer debitCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM ledger_entries "
                + "WHERE transaction_id = ? "
                + "AND account_id = ? "
                + "AND entry_type = 'DEBIT' "
                + "AND amount = 30.00 "
                + "AND balance_after = 70.00",
                Integer.class,
                result.id(),
                sourceAccountId
        );

        assertEquals(
                1,
                debitCount,
                "One correct debit ledger entry should exist"
        );

        Integer creditCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM ledger_entries "
                + "WHERE transaction_id = ? "
                + "AND account_id = ? "
                + "AND entry_type = 'CREDIT' "
                + "AND amount = 30.00 "
                + "AND balance_after = 50.00",
                Integer.class,
                result.id(),
                destinationAccountId
        );

        assertEquals(
                1,
                creditCount,
                "One correct credit ledger entry should exist"
        );

        Integer ledgerCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM ledger_entries "
                + "WHERE transaction_id = ?",
                Integer.class,
                result.id()
        );

        assertEquals(
                2,
                ledgerCount,
                "A successful transfer must create exactly two ledger entries"
        );

        Integer transactionCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM money_transactions WHERE id = ?",
                Integer.class,
                result.id()
        );

        assertEquals(
                1,
                transactionCount,
                "The transfer should be stored exactly once"
        );
    }

    @Test
    void simultaneousOppositeDirectionTransfersShouldCompleteSafely()
            throws Exception {

        ExecutorService executor =
                Executors.newFixedThreadPool(2);

        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch start = new CountDownLatch(1);

        try {

            Future<MoneyTransactionResponse> firstTransfer =
                    executor.submit(() -> {

                        ready.countDown();

                        if (!start.await(5, TimeUnit.SECONDS)) {
                            throw new IllegalStateException(
                                    "First transfer did not receive start signal"
                            );
                        }

                        TransferRequest request = new TransferRequest();
                        request.setSourceAccountId(sourceAccountId);
                        request.setDestinationAccountId(destinationAccountId);
                        request.setAmount(new BigDecimal("10.00"));

                        return moneyTransactionService.transfer(
                                userId,
                                request,
                                "opposite-transfer-forward-001"
                        );
                    });

            Future<MoneyTransactionResponse> secondTransfer =
                    executor.submit(() -> {

                        ready.countDown();

                        if (!start.await(5, TimeUnit.SECONDS)) {
                            throw new IllegalStateException(
                                    "Second transfer did not receive start signal"
                            );
                        }

                        TransferRequest request = new TransferRequest();
                        request.setSourceAccountId(destinationAccountId);
                        request.setDestinationAccountId(sourceAccountId);
                        request.setAmount(new BigDecimal("10.00"));

                        return moneyTransactionService.transfer(
                                destinationUserId,
                                request,
                                "opposite-transfer-reverse-001"
                        );
                    });

            assertTrue(
                    ready.await(5, TimeUnit.SECONDS),
                    "Both transfer threads should be ready"
            );

            start.countDown();

            MoneyTransactionResponse firstResult =
                    firstTransfer.get(15, TimeUnit.SECONDS);

            MoneyTransactionResponse secondResult =
                    secondTransfer.get(15, TimeUnit.SECONDS);

            assertEquals(
                    TransactionStatus.SUCCESS,
                    firstResult.status(),
                    "The forward transfer should succeed"
            );

            assertEquals(
                    TransactionStatus.SUCCESS,
                    secondResult.status(),
                    "The reverse transfer should succeed"
            );

        } finally {

            start.countDown();
            executor.shutdownNow();

            assertTrue(
                    executor.awaitTermination(10, TimeUnit.SECONDS),
                    "Transfer test threads should terminate"
            );
        }

        Account updatedSource =
                accountRepository.findById(sourceAccountId)
                        .orElseThrow();

        Account updatedDestination =
                accountRepository.findById(destinationAccountId)
                        .orElseThrow();

        assertEquals(
                0,
                new BigDecimal("100.00")
                        .compareTo(updatedSource.getBalance()),
                "Source balance should return to its original value"
        );

        assertEquals(
                0,
                new BigDecimal("20.00")
                        .compareTo(updatedDestination.getBalance()),
                "Destination balance should return to its original value"
        );

        BigDecimal totalBalance = jdbcTemplate.queryForObject(
                "SELECT SUM(balance) FROM accounts WHERE id IN (?, ?)",
                BigDecimal.class,
                sourceAccountId,
                destinationAccountId
        );

        assertEquals(
                0,
                new BigDecimal("120.00").compareTo(totalBalance),
                "Opposite transfers must preserve total money"
        );

        Integer transactionCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM money_transactions",
                Integer.class
        );

        assertEquals(
                2,
                transactionCount,
                "Both successful transfers should be recorded"
        );

        Integer ledgerCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM ledger_entries",
                Integer.class
        );

        assertEquals(
                4,
                ledgerCount,
                "Both transfers should create two ledger entries each"
        );
    }
}
