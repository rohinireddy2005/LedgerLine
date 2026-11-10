
package com.ledgerline.ledgerline.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.util.ReflectionTestUtils;

import com.ledgerline.ledgerline.entity.Account;
import com.ledgerline.ledgerline.entity.AppUser;
import com.ledgerline.ledgerline.entity.LedgerEntry;
import com.ledgerline.ledgerline.entity.LedgerEntryType;
import com.ledgerline.ledgerline.entity.MoneyTransaction;
import com.ledgerline.ledgerline.entity.Role;
import com.ledgerline.ledgerline.entity.TransactionStatus;
import com.ledgerline.ledgerline.entity.TransactionType;
import com.ledgerline.ledgerline.repository.AccountRepository;
import com.ledgerline.ledgerline.repository.LedgerEntryRepository;
import com.ledgerline.ledgerline.repository.MoneyTransactionRepository;

@ExtendWith(MockitoExtension.class)
class AuditorServiceTest {

    @Mock
    private AccountRepository accountRepository;

    @Mock
    private MoneyTransactionRepository transactionRepository;

    @Mock
    private LedgerEntryRepository ledgerEntryRepository;

    @InjectMocks
    private AuditorService auditorService;

    private AppUser owner;
    private Account account;
    private MoneyTransaction depositTransaction;

    private final Long accountId = 10L;
    private final Long userId = 1L;

    @BeforeEach
    void setUp() {

        owner = new AppUser(
                "Test Account Holder",
                "holder@example.com",
                "encoded-password",
                Role.ACCOUNT_HOLDER
        );

        ReflectionTestUtils.setField(owner, "id", userId);

        account = new Account(
                "LL123456789012",
                owner
        );

        ReflectionTestUtils.setField(
                account,
                "id",
                accountId
        );

        ReflectionTestUtils.setField(
                account,
                "createdAt",
                Instant.parse("2026-11-08T10:00:00Z")
        );

        depositTransaction = new MoneyTransaction(
                TransactionType.DEPOSIT,
                new BigDecimal("500.00"),
                null,
                account,
                owner,
                TransactionStatus.SUCCESS,
                "private-idempotency-key",
                null
        );

        ReflectionTestUtils.setField(
                depositTransaction,
                "id",
                100L
        );

        ReflectionTestUtils.setField(
                depositTransaction,
                "createdAt",
                Instant.parse("2026-11-08T10:05:00Z")
        );
    }

    @Test
    void auditHistoryShouldIncludeSuccessfulAndRejectedTransactions() {

        MoneyTransaction rejectedTransaction =
                new MoneyTransaction(
                        TransactionType.WITHDRAWAL,
                        new BigDecimal("900.00"),
                        account,
                        null,
                        owner,
                        TransactionStatus.REJECTED,
                        "another-private-key",
                        "Insufficient balance"
                );

        ReflectionTestUtils.setField(
                rejectedTransaction,
                "id",
                101L
        );

        ReflectionTestUtils.setField(
                rejectedTransaction,
                "createdAt",
                Instant.parse("2026-11-08T10:10:00Z")
        );

        PageRequest pageable = PageRequest.of(0, 20);

        when(transactionRepository.findAllByOrderByCreatedAtDescIdDesc(
                pageable
        )).thenReturn(
                new PageImpl<>(
                        List.of(depositTransaction, rejectedTransaction),
                        pageable,
                        2
                )
        );

        var result = auditorService.getAllTransactions(pageable);

        assertEquals(2, result.getTotalElements());

        assertEquals(
                TransactionStatus.SUCCESS,
                result.getContent().get(0).status()
        );

        assertEquals(
                TransactionStatus.REJECTED,
                result.getContent().get(1).status()
        );

        assertEquals(
                "Insufficient balance",
                result.getContent().get(1).rejectionReason()
        );

        assertEquals(
                "Test Account Holder",
                result.getContent().get(0).initiatorName()
        );

        assertEquals(
                "holder@example.com",
                result.getContent().get(0).initiatorEmail()
        );
    }

    @Test
    void auditLedgerShouldContainCorrectFinancialDetails() {

        LedgerEntry entry = new LedgerEntry(
                depositTransaction,
                account,
                LedgerEntryType.CREDIT,
                new BigDecimal("500.00"),
                new BigDecimal("500.00")
        );

        ReflectionTestUtils.setField(entry, "id", 200L);

        ReflectionTestUtils.setField(
                entry,
                "createdAt",
                Instant.parse("2026-11-08T10:05:01Z")
        );

        PageRequest pageable = PageRequest.of(0, 20);

        when(accountRepository.existsById(accountId))
                .thenReturn(true);

        when(ledgerEntryRepository
                .findByAccountIdOrderByCreatedAtAscIdAsc(
                        accountId,
                        pageable
                )).thenReturn(
                        new PageImpl<>(
                                List.of(entry),
                                pageable,
                                1
                        )
                );

        var result = auditorService.getAccountLedger(
                accountId,
                pageable
        );

        assertEquals(1, result.getTotalElements());

        var auditEntry = result.getContent().get(0);

        assertEquals(200L, auditEntry.ledgerEntryId());
        assertEquals(100L, auditEntry.transactionId());
        assertEquals(accountId, auditEntry.accountId());
        assertEquals(LedgerEntryType.CREDIT, auditEntry.entryType());
        assertEquals(new BigDecimal("500.00"), auditEntry.amount());
        assertEquals(new BigDecimal("500.00"), auditEntry.balanceAfter());
        assertEquals(TransactionType.DEPOSIT, auditEntry.transactionType());
        assertEquals(TransactionStatus.SUCCESS, auditEntry.transactionStatus());
        assertEquals(userId, auditEntry.initiatorId());
    }

    @Test
    void auditAccountShouldContainCorrectOwnerAndBalance() {

        ReflectionTestUtils.setField(
                account,
                "balance",
                new BigDecimal("1500.00")
        );

        PageRequest pageable = PageRequest.of(0, 20);

        when(accountRepository.findAllByOrderByCreatedAtDescIdDesc(
                pageable
        )).thenReturn(
                new PageImpl<>(
                        List.of(account),
                        pageable,
                        1
                )
        );

        var result = auditorService.getAllAccounts(pageable);

        assertEquals(1, result.getTotalElements());

        var auditAccount = result.getContent().get(0);

        assertEquals(accountId, auditAccount.accountId());
        assertEquals("LL123456789012", auditAccount.accountNumber());
        assertEquals(userId, auditAccount.ownerId());
        assertEquals("Test Account Holder", auditAccount.ownerName());
        assertEquals("holder@example.com", auditAccount.ownerEmail());
        assertEquals(new BigDecimal("1500.00"), auditAccount.balance());
        assertEquals("INR", auditAccount.currency());
    }

    @Test
    void ledgerForNonexistentAccountShouldReturnNotFound() {

        when(accountRepository.existsById(accountId))
                .thenReturn(false);

        var exception = org.junit.jupiter.api.Assertions.assertThrows(
                org.springframework.web.server.ResponseStatusException.class,
                () -> auditorService.getAccountLedger(
                        accountId,
                        PageRequest.of(0, 20)
                )
        );

        assertEquals(
                org.springframework.http.HttpStatus.NOT_FOUND,
                exception.getStatusCode()
        );

        verify(ledgerEntryRepository,
                org.mockito.Mockito.never())
                .findByAccountIdOrderByCreatedAtAscIdAsc(
                        accountId,
                        PageRequest.of(0, 20)
                );
    }
}
