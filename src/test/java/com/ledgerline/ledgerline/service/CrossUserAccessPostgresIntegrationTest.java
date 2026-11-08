
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

import com.ledgerline.ledgerline.entity.Account;
import com.ledgerline.ledgerline.entity.AppUser;
import com.ledgerline.ledgerline.entity.Role;

import com.ledgerline.ledgerline.repository.AccountRepository;
import com.ledgerline.ledgerline.repository.AppUserRepository;

@SpringBootTest
@ActiveProfiles("test")
class CrossUserAccessPostgresIntegrationTest {

    @Autowired
    private MoneyTransactionService moneyTransactionService;

    @Autowired
    private AppUserRepository appUserRepository;

    @Autowired
    private AccountRepository accountRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private Long firstUserId;
    private Long secondUserId;
    private Long secondUserAccountId;

    @BeforeEach
    void setUp() {

        jdbcTemplate.execute(
                "TRUNCATE TABLE ledger_entries, money_transactions, "
                + "accounts, users RESTART IDENTITY CASCADE"
        );

        AppUser firstUser = new AppUser(
                "First Test User",
                "first-user@ledgerline.test",
                "test-password",
                Role.ACCOUNT_HOLDER
        );

        firstUser = appUserRepository.saveAndFlush(firstUser);
        firstUserId = firstUser.getId();

        AppUser secondUser = new AppUser(
                "Second Test User",
                "second-user@ledgerline.test",
                "test-password",
                Role.ACCOUNT_HOLDER
        );

        secondUser = appUserRepository.saveAndFlush(secondUser);
        secondUserId = secondUser.getId();

        Account secondUserAccount = new Account(
                "CROSSUSER_ACCOUNT001",
                secondUser
        );

        secondUserAccount.setBalance(new BigDecimal("100.00"));

        secondUserAccount =
                accountRepository.saveAndFlush(secondUserAccount);

        secondUserAccountId = secondUserAccount.getId();
    }

    @Test
    void userCannotAccessAnotherUsersAccountOrLedger() {

        assertEquals(
                false,
                accountRepository.findByIdAndOwnerId(
                        secondUserAccountId,
                        firstUserId
                ).isPresent(),
                "First user must not find the second user's account "
                        + "through the owner-scoped repository method"
        );

        assertThrows(
                ResponseStatusException.class,
                () -> moneyTransactionService.getMyLedger(
                        firstUserId,
                        secondUserAccountId
                ),
                "First user must not access the second user's ledger"
        );

        DepositRequest request = new DepositRequest();
        request.setAccountId(secondUserAccountId);
        request.setAmount(new BigDecimal("10.00"));

        assertThrows(
                ResponseStatusException.class,
                () -> moneyTransactionService.deposit(
                        firstUserId,
                        request,
                        "cross-user-deposit-test-001"
                ),
                "First user must not deposit into the second user's account"
        );

        Account unchangedAccount =
                accountRepository.findById(secondUserAccountId)
                        .orElseThrow();

        assertEquals(
                0,
                new BigDecimal("100.00")
                        .compareTo(unchangedAccount.getBalance()),
                "Unauthorized access must not change the account balance"
        );

        Integer ledgerCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM ledger_entries "
                + "WHERE account_id = ?",
                Integer.class,
                secondUserAccountId
        );

        assertEquals(
                0,
                ledgerCount,
                "Unauthorized access must not create a ledger entry"
        );

        Integer transactionCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM money_transactions "
                + "WHERE initiator_id = ?",
                Integer.class,
                firstUserId
        );

        assertEquals(
                0,
                transactionCount,
                "Unauthorized access must not create a transaction"
        );
    }
}
