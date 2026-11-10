
package com.ledgerline.ledgerline.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

import com.ledgerline.ledgerline.entity.Account;
import com.ledgerline.ledgerline.entity.AccountStatusAudit;
import com.ledgerline.ledgerline.entity.AppUser;
import com.ledgerline.ledgerline.entity.Role;

import com.ledgerline.ledgerline.repository.AccountRepository;
import com.ledgerline.ledgerline.repository.AccountStatusAuditRepository;
import com.ledgerline.ledgerline.repository.AppUserRepository;

@SpringBootTest
@ActiveProfiles("test")
class AccountStatusAuditImmutabilityPostgresIntegrationTest {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private AppUserRepository appUserRepository;

    @Autowired
    private AccountRepository accountRepository;

    @Autowired
    private AccountStatusAuditRepository auditRepository;

    private Long auditId;

    @BeforeEach
    void setUp() {

        jdbcTemplate.execute(
                "TRUNCATE TABLE account_status_audits, "
                + "ledger_entries, money_transactions, "
                + "accounts, users RESTART IDENTITY CASCADE"
        );

        jdbcTemplate.execute(
                "CREATE OR REPLACE FUNCTION prevent_account_status_audit_modification() "
                + "RETURNS TRIGGER AS $audit_guard$ "
                + "BEGIN "
                + "RAISE EXCEPTION 'Account status audit records are immutable. "
                + "UPDATE and DELETE are not allowed.'; "
                + "END; "
                + "$audit_guard$ LANGUAGE plpgsql"
        );

        jdbcTemplate.execute(
                "DROP TRIGGER IF EXISTS trg_prevent_account_status_audit_modification "
                + "ON account_status_audits"
        );

        jdbcTemplate.execute(
                "CREATE TRIGGER trg_prevent_account_status_audit_modification "
                + "BEFORE UPDATE OR DELETE ON account_status_audits "
                + "FOR EACH ROW "
                + "EXECUTE FUNCTION prevent_account_status_audit_modification()"
        );

        AppUser holder = new AppUser(
                "Audit Test Holder",
                "audit-holder-test@ledgerline.test",
                "test-password",
                Role.ACCOUNT_HOLDER
        );

        holder = appUserRepository.saveAndFlush(holder);

        AppUser admin = new AppUser(
                "Audit Test Administrator",
                "audit-admin-test@ledgerline.test",
                "test-password",
                Role.ADMIN
        );

        admin = appUserRepository.saveAndFlush(admin);

        Account account = new Account(
                "AUDITTEST0001",
                holder
        );

        account = accountRepository.saveAndFlush(account);

        AccountStatusAudit audit = new AccountStatusAudit(
                account,
                "ACTIVE",
                "FROZEN",
                admin,
                "Integration test audit record"
        );

        audit = auditRepository.saveAndFlush(audit);

        auditId = audit.getId();
    }

    @Test
    void accountStatusAuditShouldRejectUpdateAndDelete() {

        assertEquals(
                1,
                jdbcTemplate.queryForObject(
                        "SELECT COUNT(*) FROM account_status_audits WHERE id = ?",
                        Integer.class,
                        auditId
                )
        );

        assertThrows(
                DataAccessException.class,
                () -> jdbcTemplate.update(
                        "UPDATE account_status_audits SET reason = ? WHERE id = ?",
                        "Modified audit reason",
                        auditId
                ),
                "PostgreSQL should reject audit record updates"
        );

        assertThrows(
                DataAccessException.class,
                () -> jdbcTemplate.update(
                        "DELETE FROM account_status_audits WHERE id = ?",
                        auditId
                ),
                "PostgreSQL should reject audit record deletions"
        );

        String storedReason = jdbcTemplate.queryForObject(
                "SELECT reason FROM account_status_audits WHERE id = ?",
                String.class,
                auditId
        );

        assertEquals(
                "Integration test audit record",
                storedReason,
                "Original audit reason must remain unchanged"
        );

        assertEquals(
                1,
                jdbcTemplate.queryForObject(
                        "SELECT COUNT(*) FROM account_status_audits WHERE id = ?",
                        Integer.class,
                        auditId
                ),
                "Original audit record must still exist"
        );
    }
}
