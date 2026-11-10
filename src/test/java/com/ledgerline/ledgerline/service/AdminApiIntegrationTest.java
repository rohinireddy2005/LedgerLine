package com.ledgerline.ledgerline.service;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.ledgerline.ledgerline.dto.DepositRequest;
import com.ledgerline.ledgerline.entity.Account;
import com.ledgerline.ledgerline.entity.AppUser;
import com.ledgerline.ledgerline.entity.LedgerEntry;
import com.ledgerline.ledgerline.entity.LedgerEntryType;
import com.ledgerline.ledgerline.entity.MoneyTransaction;
import com.ledgerline.ledgerline.entity.Role;
import com.ledgerline.ledgerline.entity.TransactionStatus;
import com.ledgerline.ledgerline.entity.TransactionType;
import com.ledgerline.ledgerline.repository.AccountRepository;
import com.ledgerline.ledgerline.repository.AccountStatusAuditRepository;
import com.ledgerline.ledgerline.repository.AppUserRepository;
import com.ledgerline.ledgerline.repository.LedgerEntryRepository;
import com.ledgerline.ledgerline.repository.MoneyTransactionRepository;
import com.ledgerline.ledgerline.security.CustomUserDetailsService;
import com.ledgerline.ledgerline.security.JwtService;
import java.math.BigDecimal;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AdminApiIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private AppUserRepository appUserRepository;

    @Autowired
    private AccountRepository accountRepository;

    @Autowired
    private AccountStatusAuditRepository accountStatusAuditRepository;

    @Autowired
    private MoneyTransactionService moneyTransactionService;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private CustomUserDetailsService userDetailsService;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private MoneyTransactionRepository moneyTransactionRepository;

    @Autowired
    private LedgerEntryRepository ledgerEntryRepository;

    private AppUser accountHolder;
    private AppUser admin;
    private AppUser auditor;

    private Long accountId;

    private String adminToken;
    private String accountHolderToken;
    private String auditorToken;

    @BeforeEach
    void setUp() {

        jdbcTemplate.execute(
                "TRUNCATE TABLE account_status_audits, "
                + "ledger_entries, money_transactions, "
                + "accounts, users RESTART IDENTITY CASCADE"
        );

        String encodedPassword =
                passwordEncoder.encode("IntegrationTestPassword123");

        accountHolder = appUserRepository.saveAndFlush(
                new AppUser(
                        "Integration Account Holder",
                        "admin-holder@ledgerline.test",
                        encodedPassword,
                        Role.ACCOUNT_HOLDER
                )
        );

        admin = appUserRepository.saveAndFlush(
                new AppUser(
                        "Integration Admin",
                        "admin-user@ledgerline.test",
                        encodedPassword,
                        Role.ADMIN
                )
        );

        auditor = appUserRepository.saveAndFlush(
                new AppUser(
                        "Integration Auditor",
                        "admin-auditor@ledgerline.test",
                        encodedPassword,
                        Role.AUDITOR
                )
        );

        adminToken = generateToken(admin);
        accountHolderToken = generateToken(accountHolder);
        auditorToken = generateToken(auditor);

        Account account = new Account(
                "ADMINTEST0001",
                accountHolder
        );

        account = accountRepository.saveAndFlush(account);

        accountId = account.getId();
    }

    private String generateToken(AppUser user) {

        return jwtService.generateToken(
                userDetailsService.loadUserByUsername(user.getEmail())
        );
    }

    private String statusChangeRequest(String reason) {

        return """
                {
                    "reason": "%s"
                }
                """.formatted(reason);
    }

    // --------------------------------------------------
    // FREEZE ACCOUNT
    // --------------------------------------------------

    @Test
    void adminShouldFreezeActiveAccountAndCreateAudit()
            throws Exception {

        mockMvc.perform(
                post("/api/admin/accounts/{accountId}/freeze", accountId)
                        .header(
                                "Authorization",
                                "Bearer " + adminToken
                        )
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(statusChangeRequest(
                                "Account review required"
                        ))
        )
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("FROZEN"));

        mockMvc.perform(
                get("/api/admin/accounts/{accountId}/audits", accountId)
                        .header(
                                "Authorization",
                                "Bearer " + adminToken
                        )
        )
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.totalElements").value(1))
        .andExpect(
                jsonPath("$.content[0].previousStatus").value("ACTIVE")
        )
        .andExpect(
                jsonPath("$.content[0].newStatus").value("FROZEN")
        )
        .andExpect(
                jsonPath("$.content[0].reason")
                        .value("Account review required")
        )
        .andExpect(
                jsonPath("$.content[0].administratorEmail")
                        .value("admin-user@ledgerline.test")
        );
    }

    // --------------------------------------------------
    // STATUS CHANGE VALIDATION
    // --------------------------------------------------

    @Test
    void adminShouldRejectBlankStatusChangeReason()
            throws Exception {

        mockMvc.perform(
                post("/api/admin/accounts/{accountId}/freeze", accountId)
                        .header(
                                "Authorization",
                                "Bearer " + adminToken
                        )
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(statusChangeRequest("   "))
        )
        .andExpect(status().isBadRequest());

        org.junit.jupiter.api.Assertions.assertEquals(
                "ACTIVE",
                accountRepository.findById(accountId)
                        .orElseThrow()
                        .getStatus()
                        .name()
        );

        org.junit.jupiter.api.Assertions.assertEquals(
                0,
                accountStatusAuditRepository.count()
        );
    }

    @Test
    void adminShouldRejectStatusChangeReasonLongerThan500Characters()
            throws Exception {

        String longReason = "A".repeat(501);

        mockMvc.perform(
                post("/api/admin/accounts/{accountId}/freeze", accountId)
                        .header(
                                "Authorization",
                                "Bearer " + adminToken
                        )
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(statusChangeRequest(longReason))
        )
        .andExpect(status().isBadRequest());

        org.junit.jupiter.api.Assertions.assertEquals(
                "ACTIVE",
                accountRepository.findById(accountId)
                        .orElseThrow()
                        .getStatus()
                        .name()
        );

        org.junit.jupiter.api.Assertions.assertEquals(
                0,
                accountStatusAuditRepository.count()
        );
    }

    // --------------------------------------------------
    // UNFREEZE ACCOUNT
    // --------------------------------------------------

    @Test
    void adminShouldUnfreezeFrozenAccountAndCreateAudit()
            throws Exception {

        mockMvc.perform(
                post("/api/admin/accounts/{accountId}/freeze", accountId)
                        .header(
                                "Authorization",
                                "Bearer " + adminToken
                        )
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(statusChangeRequest("Initial review"))
        )
        .andExpect(status().isOk());

        mockMvc.perform(
                post("/api/admin/accounts/{accountId}/unfreeze", accountId)
                        .header(
                                "Authorization",
                                "Bearer " + adminToken
                        )
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(statusChangeRequest(
                                "Review completed"
                        ))
        )
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("ACTIVE"));

        mockMvc.perform(
                get("/api/admin/accounts/{accountId}/audits", accountId)
                        .header(
                                "Authorization",
                                "Bearer " + adminToken
                        )
        )
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.totalElements").value(2))
        .andExpect(
                jsonPath("$.content[0].previousStatus").value("FROZEN")
        )
        .andExpect(
                jsonPath("$.content[0].newStatus").value("ACTIVE")
        );
    }

    // --------------------------------------------------
    // CLOSE ACCOUNT
    // --------------------------------------------------

    @Test
    void adminShouldCloseZeroBalanceAccountAndCreateAudit()
            throws Exception {

        mockMvc.perform(
                post("/api/admin/accounts/{accountId}/close", accountId)
                        .header(
                                "Authorization",
                                "Bearer " + adminToken
                        )
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(statusChangeRequest(
                                "Customer account closure approved"
                        ))
        )
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("CLOSED"))
        .andExpect(jsonPath("$.balance").value(0.00));

        mockMvc.perform(
                get("/api/admin/accounts/{accountId}/audits", accountId)
                        .header(
                                "Authorization",
                                "Bearer " + adminToken
                        )
        )
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.totalElements").value(1))
        .andExpect(
                jsonPath("$.content[0].previousStatus").value("ACTIVE")
        )
        .andExpect(
                jsonPath("$.content[0].newStatus").value("CLOSED")
        );
    }

    // --------------------------------------------------
    // PREVENT CLOSING ACCOUNT WITH MONEY
    // --------------------------------------------------

    @Test
    void adminShouldNotCloseAccountWithNonZeroBalance()
            throws Exception {

        DepositRequest deposit = new DepositRequest();

        deposit.setAccountId(accountId);
        deposit.setAmount(new BigDecimal("500.00"));

        moneyTransactionService.deposit(
                accountHolder.getId(),
                deposit,
                "admin-integration-deposit-001"
        );

        mockMvc.perform(
                post("/api/admin/accounts/{accountId}/close", accountId)
                        .header(
                                "Authorization",
                                "Bearer " + adminToken
                        )
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(statusChangeRequest(
                                "Attempted account closure"
                        ))
        )
        .andExpect(status().isConflict());

        mockMvc.perform(
                get("/api/admin/accounts/{accountId}", accountId)
                        .header(
                                "Authorization",
                                "Bearer " + adminToken
                        )
        )
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("ACTIVE"))
        .andExpect(jsonPath("$.balance").value(500.00));

        org.junit.jupiter.api.Assertions.assertEquals(
                0,
                accountStatusAuditRepository.count()
        );
    }

    // --------------------------------------------------
    // NON-ADMIN AUTHORIZATION
    // --------------------------------------------------

    @Test
    void accountHolderShouldNotFreezeAccount()
            throws Exception {

        mockMvc.perform(
                post("/api/admin/accounts/{accountId}/freeze", accountId)
                        .header(
                                "Authorization",
                                "Bearer " + accountHolderToken
                        )
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(statusChangeRequest(
                                "Unauthorized request"
                        ))
        )
        .andExpect(status().isForbidden());
    }

    @Test
    void auditorShouldNotFreezeAccount()
            throws Exception {

        mockMvc.perform(
                post("/api/admin/accounts/{accountId}/freeze", accountId)
                        .header(
                                "Authorization",
                                "Bearer " + auditorToken
                        )
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(statusChangeRequest(
                                "Unauthorized request"
                        ))
        )
        .andExpect(status().isForbidden());
    }

    // --------------------------------------------------
    // ACCOUNT RECONCILIATION
    // --------------------------------------------------

    @Test
    void adminShouldReconcileNewZeroBalanceAccount()
            throws Exception {

        mockMvc.perform(
                get("/api/admin/accounts/{accountId}/reconciliation", accountId)
                        .header("Authorization", "Bearer " + adminToken)
        )
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.accountId").value(accountId))
        .andExpect(jsonPath("$.accountBalance").value(0.00))
        .andExpect(jsonPath("$.ledgerBalance").value(0.00))
        .andExpect(jsonPath("$.entriesChecked").value(0))
        .andExpect(jsonPath("$.reconciled").value(true))
        .andExpect(jsonPath("$.message")
                .value("Account balance and ledger are consistent."));
    }

    @Test
    void adminShouldReconcileAccountAfterSuccessfulDeposit()
            throws Exception {

        DepositRequest deposit = new DepositRequest();
        deposit.setAccountId(accountId);
        deposit.setAmount(new BigDecimal("500.00"));

        moneyTransactionService.deposit(
                accountHolder.getId(),
                deposit,
                "reconciliation-deposit-001"
        );

        mockMvc.perform(
                get("/api/admin/accounts/{accountId}/reconciliation", accountId)
                        .header("Authorization", "Bearer " + adminToken)
        )
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.accountBalance").value(500.00))
        .andExpect(jsonPath("$.ledgerBalance").value(500.00))
        .andExpect(jsonPath("$.entriesChecked").value(1))
        .andExpect(jsonPath("$.reconciled").value(true));
    }

    @Test
    void adminShouldDetectAccountAndLedgerBalanceMismatch()
            throws Exception {

        DepositRequest deposit = new DepositRequest();
        deposit.setAccountId(accountId);
        deposit.setAmount(new BigDecimal("500.00"));

        moneyTransactionService.deposit(
                accountHolder.getId(),
                deposit,
                "reconciliation-mismatch-001"
        );

        jdbcTemplate.update(
                "UPDATE accounts SET balance = ? WHERE id = ?",
                new BigDecimal("450.00"),
                accountId
        );

        mockMvc.perform(
                get("/api/admin/accounts/{accountId}/reconciliation", accountId)
                        .header("Authorization", "Bearer " + adminToken)
        )
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.accountBalance").value(450.00))
        .andExpect(jsonPath("$.ledgerBalance").value(500.00))
        .andExpect(jsonPath("$.entriesChecked").value(1))
        .andExpect(jsonPath("$.reconciled").value(false));
    }

    @Test
    void accountHolderShouldNotAccessAdminReconciliation()
            throws Exception {

        mockMvc.perform(
                get("/api/admin/accounts/{accountId}/reconciliation", accountId)
                        .header(
                                "Authorization",
                                "Bearer " + accountHolderToken
                        )
        )
        .andExpect(status().isForbidden());
    }

    @Test
    void auditorShouldNotAccessAdminReconciliation()
            throws Exception {

        mockMvc.perform(
                get("/api/admin/accounts/{accountId}/reconciliation", accountId)
                        .header(
                                "Authorization",
                                "Bearer " + auditorToken
                        )
        )
        .andExpect(status().isForbidden());
    }

    // --------------------------------------------------
    // LEDGER RUNNING BALANCE MISMATCH
    // --------------------------------------------------

    @Test
    void adminShouldDetectIncorrectLedgerRunningBalance()
            throws Exception {

        Account account = accountRepository.findById(accountId)
                .orElseThrow();

        MoneyTransaction transaction = moneyTransactionRepository.saveAndFlush(
                new MoneyTransaction(
                        TransactionType.DEPOSIT,
                        new BigDecimal("500.00"),
                        null,
                        account,
                        accountHolder,
                        TransactionStatus.SUCCESS,
                        "reconciliation-running-001",
                        null
                )
        );

        ledgerEntryRepository.saveAndFlush(
                new LedgerEntry(
                        transaction,
                        account,
                        LedgerEntryType.CREDIT,
                        new BigDecimal("500.00"),
                        new BigDecimal("450.00")
                )
        );

        jdbcTemplate.update(
                "UPDATE accounts SET balance = ? WHERE id = ?",
                new BigDecimal("500.00"),
                accountId
        );

        long entriesBefore = ledgerEntryRepository.count();

        mockMvc.perform(
                get("/api/admin/accounts/{accountId}/reconciliation",
                        accountId)
                        .header("Authorization", "Bearer " + adminToken)
        )
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.accountBalance").value(500.00))
        .andExpect(jsonPath("$.ledgerBalance").value(500.00))
        .andExpect(jsonPath("$.reconciled").value(false));

        org.junit.jupiter.api.Assertions.assertEquals(
                entriesBefore,
                ledgerEntryRepository.count()
        );
    }

    // --------------------------------------------------
    // REJECTED TRANSACTION WITH LEDGER ENTRY
    // --------------------------------------------------

    @Test
    void adminShouldDetectLedgerEntryForRejectedTransaction()
            throws Exception {

        Account account = accountRepository.findById(accountId)
                .orElseThrow();

        MoneyTransaction transaction = moneyTransactionRepository.saveAndFlush(
                new MoneyTransaction(
                        TransactionType.DEPOSIT,
                        new BigDecimal("100.00"),
                        null,
                        account,
                        accountHolder,
                        TransactionStatus.REJECTED,
                        "reconciliation-rejected-001",
                        "Test rejection"
                )
        );

        ledgerEntryRepository.saveAndFlush(
                new LedgerEntry(
                        transaction,
                        account,
                        LedgerEntryType.CREDIT,
                        new BigDecimal("100.00"),
                        new BigDecimal("100.00")
                )
        );

        jdbcTemplate.update(
                "UPDATE accounts SET balance = ? WHERE id = ?",
                new BigDecimal("100.00"),
                accountId
        );

        long entriesBefore = ledgerEntryRepository.count();

        mockMvc.perform(
                get("/api/admin/accounts/{accountId}/reconciliation",
                        accountId)
                        .header("Authorization", "Bearer " + adminToken)
        )
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.reconciled").value(false))
        .andExpect(jsonPath("$.message")
                .value("A non-successful transaction has a ledger entry."));

        org.junit.jupiter.api.Assertions.assertEquals(
                entriesBefore,
                ledgerEntryRepository.count()
        );
    }
}
