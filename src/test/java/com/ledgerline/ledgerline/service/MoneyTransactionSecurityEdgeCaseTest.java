
package com.ledgerline.ledgerline.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

import com.ledgerline.ledgerline.dto.TransferRequest;
import com.ledgerline.ledgerline.entity.Account;
import com.ledgerline.ledgerline.entity.AccountStatus;
import com.ledgerline.ledgerline.entity.AppUser;
import com.ledgerline.ledgerline.entity.LedgerEntry;
import com.ledgerline.ledgerline.entity.MoneyTransaction;
import com.ledgerline.ledgerline.entity.Role;
import com.ledgerline.ledgerline.entity.TransactionStatus;
import com.ledgerline.ledgerline.repository.AccountRepository;
import com.ledgerline.ledgerline.repository.AppUserRepository;
import com.ledgerline.ledgerline.repository.LedgerEntryRepository;
import com.ledgerline.ledgerline.repository.MoneyTransactionRepository;

@ExtendWith(MockitoExtension.class)
class MoneyTransactionSecurityEdgeCaseTest {

    @Mock
    private AccountRepository accountRepository;

    @Mock
    private AppUserRepository appUserRepository;

    @Mock
    private MoneyTransactionRepository transactionRepository;

    @Mock
    private LedgerEntryRepository ledgerEntryRepository;

    @InjectMocks
    private MoneyTransactionService moneyTransactionService;

    private AppUser user;
    private Account sourceAccount;
    private Account destinationAccount;

    private final Long userId = 1L;
    private final Long sourceAccountId = 10L;
    private final Long destinationAccountId = 20L;

    @BeforeEach
    void setUp() {

        user = new AppUser(
                "Test User",
                "test@example.com",
                "encoded-password",
                Role.ACCOUNT_HOLDER
        );

        ReflectionTestUtils.setField(user, "id", userId);

        sourceAccount = new Account("LL123456789012", user);
        destinationAccount = new Account("LL987654321098", user);

        ReflectionTestUtils.setField(sourceAccount, "id", sourceAccountId);
        ReflectionTestUtils.setField(
                destinationAccount,
                "id",
                destinationAccountId
        );
    }

    private TransferRequest createTransferRequest(
            Long sourceId,
            Long destinationId,
            String amount) {

        TransferRequest request = new TransferRequest();
        request.setSourceAccountId(sourceId);
        request.setDestinationAccountId(destinationId);
        request.setAmount(new BigDecimal(amount));

        return request;
    }

    private void mockTransfer(String key) {

        when(appUserRepository.findByIdForUpdate(userId))
                .thenReturn(Optional.of(user));

        when(transactionRepository.findByInitiatorIdAndIdempotencyKey(
                userId,
                key
        )).thenReturn(Optional.empty());

        when(transactionRepository.saveAndFlush(any(MoneyTransaction.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        when(accountRepository.findByIdForUpdate(sourceAccountId))
                .thenReturn(Optional.of(sourceAccount));

        when(accountRepository.findByIdForUpdate(destinationAccountId))
                .thenReturn(Optional.of(destinationAccount));
    }

    @Test
    void transferIsRejectedWhenDestinationAccountIsInactive() {

        String key = "inactive-destination-001";

        sourceAccount.setBalance(new BigDecimal("500.00"));
        destinationAccount.setBalance(new BigDecimal("200.00"));
        destinationAccount.setStatus(AccountStatus.FROZEN);

        mockTransfer(key);

        TransferRequest request = createTransferRequest(
                sourceAccountId,
                destinationAccountId,
                "100.00"
        );

        var response = moneyTransactionService.transfer(
                userId,
                request,
                key
        );

        assertEquals(TransactionStatus.REJECTED, response.status());

        assertEquals(
                new BigDecimal("500.00"),
                sourceAccount.getBalance()
        );

        assertEquals(
                new BigDecimal("200.00"),
                destinationAccount.getBalance()
        );

        verify(accountRepository, never()).save(any(Account.class));
        verify(ledgerEntryRepository, never()).save(any(LedgerEntry.class));
    }

    @Test
    void transferIsRejectedWhenDestinationMaximumBalanceIsExceeded() {

        String key = "destination-overflow-001";

        sourceAccount.setBalance(new BigDecimal("100.00"));

        destinationAccount.setBalance(
                new BigDecimal("99999999999999999.00")
        );

        mockTransfer(key);

        TransferRequest request = createTransferRequest(
                sourceAccountId,
                destinationAccountId,
                "1.00"
        );

        var response = moneyTransactionService.transfer(
                userId,
                request,
                key
        );

        assertEquals(TransactionStatus.REJECTED, response.status());

        assertEquals(
                new BigDecimal("100.00"),
                sourceAccount.getBalance()
        );

        assertEquals(
                new BigDecimal("99999999999999999.00"),
                destinationAccount.getBalance()
        );

        verify(accountRepository, never()).save(any(Account.class));
        verify(ledgerEntryRepository, never()).save(any(LedgerEntry.class));
    }

    @Test
    void transferBetweenSameAccountReturnsBadRequest() {

        TransferRequest request = createTransferRequest(
                sourceAccountId,
                sourceAccountId,
                "100.00"
        );

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> moneyTransactionService.transfer(
                        userId,
                        request,
                        "same-account-001"
                )
        );

        assertEquals(
                HttpStatus.BAD_REQUEST,
                exception.getStatusCode()
        );

        verify(appUserRepository, never()).findByIdForUpdate(userId);
        verify(transactionRepository, never())
                .saveAndFlush(any(MoneyTransaction.class));
    }

    @Test
    void userCannotAccessAnotherUsersLedger() {

        when(accountRepository.findByIdAndOwnerId(
                sourceAccountId,
                userId
        )).thenReturn(Optional.empty());

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> moneyTransactionService.getMyLedger(
                        userId,
                        sourceAccountId
                )
        );

        assertEquals(
                HttpStatus.NOT_FOUND,
                exception.getStatusCode()
        );

        verify(ledgerEntryRepository, never())
                .findByAccountIdOrderByCreatedAtAscIdAsc(sourceAccountId);
    }
}
