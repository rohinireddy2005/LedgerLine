
package com.ledgerline.ledgerline.service;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import com.ledgerline.ledgerline.dto.DepositRequest;
import com.ledgerline.ledgerline.dto.WithdrawalRequest;

import com.ledgerline.ledgerline.entity.Account;
import com.ledgerline.ledgerline.entity.AppUser;
import com.ledgerline.ledgerline.entity.Role;

import com.ledgerline.ledgerline.repository.AccountRepository;
import com.ledgerline.ledgerline.repository.AppUserRepository;
import com.ledgerline.ledgerline.security.CustomUserDetailsService;
import com.ledgerline.ledgerline.security.JwtService;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuditorApiIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private AppUserRepository appUserRepository;

    @Autowired
    private AccountRepository accountRepository;

    @Autowired
    private MoneyTransactionService moneyTransactionService;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private CustomUserDetailsService userDetailsService;

    @Autowired
    private JwtService jwtService;

    private Long accountHolderId;
    private Long accountId;

    private String auditorToken;

    @BeforeEach
    void setUp() {

        jdbcTemplate.execute(
                "TRUNCATE TABLE ledger_entries, money_transactions, "
                + "accounts, users RESTART IDENTITY CASCADE"
        );

        String encodedPassword =
                passwordEncoder.encode("IntegrationTestPassword123");

        AppUser accountHolder = appUserRepository.saveAndFlush(
                new AppUser(
                        "Integration Account Holder",
                        "auditor-holder@ledgerline.test",
                        encodedPassword,
                        Role.ACCOUNT_HOLDER
                )
        );

        accountHolderId = accountHolder.getId();

        AppUser auditor = appUserRepository.saveAndFlush(
                new AppUser(
                        "Integration Auditor",
                        "auditor-user@ledgerline.test",
                        encodedPassword,
                        Role.AUDITOR
                )
        );

        auditorToken = jwtService.generateToken(
                userDetailsService.loadUserByUsername(auditor.getEmail())
        );

        Account account = new Account(
                "AUDITTEST0001",
                accountHolder
        );

        account = accountRepository.saveAndFlush(account);

        accountId = account.getId();

        createTransactionHistory();
    }

    private void createTransactionHistory() {

        DepositRequest deposit = new DepositRequest();
        deposit.setAccountId(accountId);
        deposit.setAmount(new BigDecimal("500.00"));

        moneyTransactionService.deposit(
                accountHolderId,
                deposit,
                "auditor-integration-deposit-001"
        );

        WithdrawalRequest successfulWithdrawal =
                new WithdrawalRequest();

        successfulWithdrawal.setAccountId(accountId);
        successfulWithdrawal.setAmount(new BigDecimal("200.00"));

        moneyTransactionService.withdraw(
                accountHolderId,
                successfulWithdrawal,
                "auditor-integration-withdrawal-001"
        );

        WithdrawalRequest rejectedWithdrawal =
                new WithdrawalRequest();

        rejectedWithdrawal.setAccountId(accountId);
        rejectedWithdrawal.setAmount(new BigDecimal("400.00"));

        moneyTransactionService.withdraw(
                accountHolderId,
                rejectedWithdrawal,
                "auditor-integration-withdrawal-002"
        );
    }

    @Test
    void auditorShouldSeeSuccessfulAndRejectedTransactions()
            throws Exception {

        mockMvc.perform(
                get("/api/auditor/transactions")
                        .header(
                                "Authorization",
                                "Bearer " + auditorToken
                        )
        )
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.totalElements").value(3))
        .andExpect(jsonPath("$.content[0].status").value("REJECTED"))
        .andExpect(
                jsonPath("$.content[0].rejectionReason")
                        .value("Insufficient account balance")
        )
        .andExpect(jsonPath("$.content[1].status").value("SUCCESS"))
        .andExpect(jsonPath("$.content[2].status").value("SUCCESS"))
        .andExpect(
                jsonPath("$.content[0].initiatorEmail")
                        .value("auditor-holder@ledgerline.test")
        )
        .andExpect(
                content().string(
                        not(containsString("idempotencyKey"))
                )
        )
        .andExpect(
                content().string(
                        not(containsString("encodedPassword"))
                )
        );
    }

    @Test
    void auditorShouldSeeOnlySuccessfulFinancialMovementsInLedger()
            throws Exception {

        mockMvc.perform(
                get("/api/auditor/ledger/{accountId}", accountId)
                        .header(
                                "Authorization",
                                "Bearer " + auditorToken
                        )
        )
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.totalElements").value(2))

        .andExpect(
                jsonPath("$.content[0].entryType").value("CREDIT")
        )
        .andExpect(
                jsonPath("$.content[0].amount").value(500.00)
        )
        .andExpect(
                jsonPath("$.content[0].balanceAfter").value(500.00)
        )

        .andExpect(
                jsonPath("$.content[1].entryType").value("DEBIT")
        )
        .andExpect(
                jsonPath("$.content[1].amount").value(200.00)
        )
        .andExpect(
                jsonPath("$.content[1].balanceAfter").value(300.00)
        );
    }

    @Test
    void auditorShouldSeeCorrectAccountOwnerAndFinalBalance()
            throws Exception {

        mockMvc.perform(
                get("/api/auditor/accounts")
                        .header(
                                "Authorization",
                                "Bearer " + auditorToken
                        )
        )
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.totalElements").value(1))
        .andExpect(
                jsonPath("$.content[0].accountNumber")
                        .value("AUDITTEST0001")
        )
        .andExpect(
                jsonPath("$.content[0].ownerName")
                        .value("Integration Account Holder")
        )
        .andExpect(
                jsonPath("$.content[0].ownerEmail")
                        .value("auditor-holder@ledgerline.test")
        )
        .andExpect(
                jsonPath("$.content[0].balance").value(300.00)
        );
    }
}
