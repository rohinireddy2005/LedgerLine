
package com.ledgerline.ledgerline.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.math.BigDecimal;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

import com.ledgerline.ledgerline.entity.Account;
import com.ledgerline.ledgerline.entity.AppUser;
import com.ledgerline.ledgerline.entity.LedgerEntry;
import com.ledgerline.ledgerline.entity.LedgerEntryType;
import com.ledgerline.ledgerline.entity.MoneyTransaction;
import com.ledgerline.ledgerline.entity.Role;
import com.ledgerline.ledgerline.entity.TransactionStatus;
import com.ledgerline.ledgerline.entity.TransactionType;

import com.ledgerline.ledgerline.repository.AccountRepository;
import com.ledgerline.ledgerline.repository.AppUserRepository;
import com.ledgerline.ledgerline.repository.LedgerEntryRepository;
import com.ledgerline.ledgerline.repository.MoneyTransactionRepository;

@SpringBootTest
@ActiveProfiles("test")
class LedgerImmutabilityPostgresIntegrationTest {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private AppUserRepository appUserRepository;

    @Autowired
    private AccountRepository accountRepository;

    @Autowired
    private MoneyTransactionRepository transactionRepository;

    @Autowired
    private LedgerEntryRepository ledgerEntryRepository;

    private Long ledgerEntryId;

    @BeforeEach
    void setUp() {

        jdbcTemplate.execute(
                "TRUNCATE TABLE ledger_entries, money_transactions, "
                + "accounts, users RESTART IDENTITY CASCADE"
        );

        jdbcTemplate.execute(
                "CREATE OR REPLACE FUNCTION prevent_ledger_modification() "
                + "RETURNS TRIGGER AS $ledger_guard$ "
                + "BEGIN "
                + "RAISE EXCEPTION 'Ledger entries are immutable. "
                + "UPDATE and DELETE are not allowed.'; "
                + "END; "
                + "$ledger_guard$ LANGUAGE plpgsql"
        );

        jdbcTemplate.execute(
                "DROP TRIGGER IF EXISTS trg_prevent_ledger_modification "
                + "ON ledger_entries"
        );

        jdbcTemplate.execute(
                "CREATE TRIGGER trg_prevent_ledger_modification "
                + "BEFORE UPDATE OR DELETE ON ledger_entries "
                + "FOR EACH ROW "
                + "EXECUTE FUNCTION prevent_ledger_modification()"
        );

        AppUser user = new AppUser(
                "Ledger Integration User",
                "ledger-test@ledgerline.test",
                "test-password",
                Role.ACCOUNT_HOLDER
        );

        user = appUserRepository.saveAndFlush(user);

        Account account = new Account(
                "LEDGERTEST0001",
                user
        );

        account.setBalance(new BigDecimal("50.00"));

        account = accountRepository.saveAndFlush(account);

        MoneyTransaction transaction = new MoneyTransaction(
                TransactionType.DEPOSIT,
                new BigDecimal("50.00"),
                null,
                account,
                user,
                TransactionStatus.SUCCESS,
                "ledger-immutability-test-001",
                null
        );

        transaction = transactionRepository.saveAndFlush(transaction);

        LedgerEntry entry = new LedgerEntry(
                transaction,
                account,
                LedgerEntryType.CREDIT,
                new BigDecimal("50.00"),
                new BigDecimal("50.00")
        );

        entry = ledgerEntryRepository.saveAndFlush(entry);

        ledgerEntryId = entry.getId();
    }

    @Test
    void ledgerEntriesShouldRejectUpdateAndDelete() {

        assertEquals(
                1,
                jdbcTemplate.queryForObject(
                        "SELECT COUNT(*) FROM ledger_entries WHERE id = ?",
                        Integer.class,
                        ledgerEntryId
                )
        );

        assertThrows(
                DataAccessException.class,
                () -> jdbcTemplate.update(
                        "UPDATE ledger_entries SET amount = ? WHERE id = ?",
                        new BigDecimal("999.00"),
                        ledgerEntryId
                ),
                "PostgreSQL should reject ledger entry updates"
        );

        assertThrows(
                DataAccessException.class,
                () -> jdbcTemplate.update(
                        "DELETE FROM ledger_entries WHERE id = ?",
                        ledgerEntryId
                ),
                "PostgreSQL should reject ledger entry deletions"
        );

        BigDecimal storedAmount = jdbcTemplate.queryForObject(
                "SELECT amount FROM ledger_entries WHERE id = ?",
                BigDecimal.class,
                ledgerEntryId
        );

        assertEquals(
                0,
                new BigDecimal("50.00").compareTo(storedAmount),
                "Original ledger amount must remain unchanged"
        );

        assertEquals(
                1,
                jdbcTemplate.queryForObject(
                        "SELECT COUNT(*) FROM ledger_entries WHERE id = ?",
                        Integer.class,
                        ledgerEntryId
                ),
                "Original ledger entry must still exist"
        );
    }
}
