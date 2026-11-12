
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

import com.ledgerline.ledgerline.dto.DepositRequest;
import com.ledgerline.ledgerline.dto.TransferRequest;
import com.ledgerline.ledgerline.dto.WithdrawalRequest;
import com.ledgerline.ledgerline.entity.Account;
import com.ledgerline.ledgerline.entity.AccountStatus;
import com.ledgerline.ledgerline.entity.AppUser;
import com.ledgerline.ledgerline.entity.LedgerEntry;
import com.ledgerline.ledgerline.entity.MoneyTransaction;
import com.ledgerline.ledgerline.entity.Role;
import com.ledgerline.ledgerline.entity.TransactionStatus;
import com.ledgerline.ledgerline.entity.TransactionType;
import com.ledgerline.ledgerline.repository.AccountRepository;
import com.ledgerline.ledgerline.repository.AppUserRepository;
import com.ledgerline.ledgerline.repository.LedgerEntryRepository;
import com.ledgerline.ledgerline.repository.MoneyTransactionRepository;

@ExtendWith(MockitoExtension.class)
class MoneyTransactionServiceTest {

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

        sourceAccount = new Account(
                "LL123456789012",
                user
        );

        destinationAccount = new Account(
                "LL987654321098",
                user
        );

        ReflectionTestUtils.setField(
                sourceAccount,
                "id",
                sourceAccountId
        );

        ReflectionTestUtils.setField(
                destinationAccount,
                "id",
                destinationAccountId
        );
    }

    private void mockNewTransaction(String idempotencyKey) {

        when(appUserRepository.findByIdForUpdate(userId))
                .thenReturn(Optional.of(user));

        when(transactionRepository.findByInitiatorIdAndIdempotencyKey(
                userId,
                idempotencyKey
        )).thenReturn(Optional.empty());

        when(transactionRepository.saveAndFlush(any(MoneyTransaction.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void userCanSuccessfullyDepositMoney() {

        String key = "deposit-test-001";

        DepositRequest request = new DepositRequest();
        request.setAccountId(sourceAccountId);
        request.setAmount(new BigDecimal("100.00"));

        sourceAccount.setBalance(new BigDecimal("500.00"));

        mockNewTransaction(key);

        when(accountRepository.findByIdAndOwnerIdForUpdate(
                sourceAccountId,
                userId
        )).thenReturn(Optional.of(sourceAccount));

        var response = moneyTransactionService.deposit(
                userId,
                request,
                key
        );

        assertEquals(new BigDecimal("600.00"), sourceAccount.getBalance());
        assertEquals(TransactionStatus.SUCCESS, response.status());

        verify(accountRepository).save(sourceAccount);
        verify(ledgerEntryRepository).save(any(LedgerEntry.class));
    }

    @Test
    void userCanSuccessfullyWithdrawMoney() {

        String key = "withdraw-test-001";

        WithdrawalRequest request = new WithdrawalRequest();
        request.setAccountId(sourceAccountId);
        request.setAmount(new BigDecimal("100.00"));

        sourceAccount.setBalance(new BigDecimal("500.00"));

        mockNewTransaction(key);

        when(accountRepository.findByIdAndOwnerIdForUpdate(
                sourceAccountId,
                userId
        )).thenReturn(Optional.of(sourceAccount));

        var response = moneyTransactionService.withdraw(
                userId,
                request,
                key
        );

        assertEquals(new BigDecimal("400.00"), sourceAccount.getBalance());
        assertEquals(TransactionStatus.SUCCESS, response.status());

        verify(accountRepository).save(sourceAccount);
        verify(ledgerEntryRepository).save(any(LedgerEntry.class));
    }

    @Test
    void userCanSuccessfullyTransferMoney() {

        String key = "transfer-test-001";

        TransferRequest request = new TransferRequest();
        request.setSourceAccountId(sourceAccountId);
        request.setDestinationAccountId(destinationAccountId);
        request.setAmount(new BigDecimal("100.00"));

        sourceAccount.setBalance(new BigDecimal("500.00"));
        destinationAccount.setBalance(new BigDecimal("200.00"));

        mockNewTransaction(key);

        when(accountRepository.findByIdForUpdate(sourceAccountId))
                .thenReturn(Optional.of(sourceAccount));

        when(accountRepository.findByIdForUpdate(destinationAccountId))
                .thenReturn(Optional.of(destinationAccount));

        var response = moneyTransactionService.transfer(
                userId,
                request,
                key
        );

        assertEquals(new BigDecimal("400.00"), sourceAccount.getBalance());
        assertEquals(new BigDecimal("300.00"), destinationAccount.getBalance());
        assertEquals(TransactionStatus.SUCCESS, response.status());

        verify(accountRepository).save(sourceAccount);
        verify(accountRepository).save(destinationAccount);

        verify(ledgerEntryRepository, org.mockito.Mockito.times(2))
                .save(any(LedgerEntry.class));
    }

    @Test
    void withdrawalIsRejectedWhenBalanceIsInsufficient() {

        String key = "withdraw-test-002";

        WithdrawalRequest request = new WithdrawalRequest();
        request.setAccountId(sourceAccountId);
        request.setAmount(new BigDecimal("600.00"));

        sourceAccount.setBalance(new BigDecimal("500.00"));

        mockNewTransaction(key);

        when(accountRepository.findByIdAndOwnerIdForUpdate(
                sourceAccountId,
                userId
        )).thenReturn(Optional.of(sourceAccount));

        var response = moneyTransactionService.withdraw(
                userId,
                request,
                key
        );

        assertEquals(TransactionStatus.REJECTED, response.status());
        assertEquals(new BigDecimal("500.00"), sourceAccount.getBalance());

        verify(accountRepository, never()).save(any(Account.class));
        verify(ledgerEntryRepository, never()).save(any(LedgerEntry.class));
    }

    @Test
    void sameIdempotencyKeyAndRequestReturnsPreviousTransaction() {

        String key = "deposit-replay-001";

        DepositRequest request = new DepositRequest();
        request.setAccountId(sourceAccountId);
        request.setAmount(new BigDecimal("100.00"));

        MoneyTransaction previousTransaction = new MoneyTransaction(
                TransactionType.DEPOSIT,
                new BigDecimal("100.00"),
                null,
                sourceAccount,
                user,
                TransactionStatus.SUCCESS,
                key,
                null
        );

        when(appUserRepository.findByIdForUpdate(userId))
                .thenReturn(Optional.of(user));

        when(transactionRepository.findByInitiatorIdAndIdempotencyKey(
                userId,
                key
        )).thenReturn(Optional.of(previousTransaction));

        var response = moneyTransactionService.deposit(
                userId,
                request,
                key
        );

        assertEquals(TransactionStatus.SUCCESS, response.status());

        verify(accountRepository, never())
                .findByIdAndOwnerIdForUpdate(sourceAccountId, userId);

        verify(transactionRepository, never())
                .saveAndFlush(any(MoneyTransaction.class));

        verify(ledgerEntryRepository, never())
                .save(any(LedgerEntry.class));
    }

    @Test
    void reusedIdempotencyKeyWithDifferentRequestReturnsConflict() {

        String key = "deposit-conflict-001";

        DepositRequest request = new DepositRequest();
        request.setAccountId(sourceAccountId);
        request.setAmount(new BigDecimal("200.00"));

        MoneyTransaction previousTransaction = new MoneyTransaction(
                TransactionType.DEPOSIT,
                new BigDecimal("100.00"),
                null,
                sourceAccount,
                user,
                TransactionStatus.SUCCESS,
                key,
                null
        );

        when(appUserRepository.findByIdForUpdate(userId))
                .thenReturn(Optional.of(user));

        when(transactionRepository.findByInitiatorIdAndIdempotencyKey(
                userId,
                key
        )).thenReturn(Optional.of(previousTransaction));

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> moneyTransactionService.deposit(userId, request, key)
        );

        assertEquals(HttpStatus.CONFLICT, exception.getStatusCode());

        verify(accountRepository, never())
                .findByIdAndOwnerIdForUpdate(sourceAccountId, userId);

        verify(transactionRepository, never())
                .saveAndFlush(any(MoneyTransaction.class));
    }

    @Test
    void depositIsRejectedWhenAccountIsInactive() {

        String key = "deposit-inactive-001";

        DepositRequest request = new DepositRequest();
        request.setAccountId(sourceAccountId);
        request.setAmount(new BigDecimal("100.00"));

        sourceAccount.setBalance(new BigDecimal("500.00"));
        sourceAccount.setStatus(AccountStatus.FROZEN);

        mockNewTransaction(key);

        when(accountRepository.findByIdAndOwnerIdForUpdate(
                sourceAccountId,
                userId
        )).thenReturn(Optional.of(sourceAccount));

        var response = moneyTransactionService.deposit(
                userId,
                request,
                key
        );

        assertEquals(TransactionStatus.REJECTED, response.status());
        assertEquals(new BigDecimal("500.00"), sourceAccount.getBalance());

        verify(accountRepository, never()).save(any(Account.class));
        verify(ledgerEntryRepository, never()).save(any(LedgerEntry.class));
    }

    @Test
    void depositIsRejectedWhenMaximumBalanceWouldBeExceeded() {

        String key = "deposit-overflow-001";

        DepositRequest request = new DepositRequest();
        request.setAccountId(sourceAccountId);
        request.setAmount(new BigDecimal("100.00"));

        sourceAccount.setBalance(
                new BigDecimal("99999999999999999.00")
        );

        mockNewTransaction(key);

        when(accountRepository.findByIdAndOwnerIdForUpdate(
                sourceAccountId,
                userId
        )).thenReturn(Optional.of(sourceAccount));

        var response = moneyTransactionService.deposit(
                userId,
                request,
                key
        );

        assertEquals(TransactionStatus.REJECTED, response.status());

        assertEquals(
                new BigDecimal("99999999999999999.00"),
                sourceAccount.getBalance()
        );

        verify(accountRepository, never()).save(any(Account.class));
        verify(ledgerEntryRepository, never()).save(any(LedgerEntry.class));
    }

    @Test
    void transferIsRejectedWhenCurrenciesDoNotMatch() {

        String key = "transfer-currency-001";

        TransferRequest request = new TransferRequest();
        request.setSourceAccountId(sourceAccountId);
        request.setDestinationAccountId(destinationAccountId);
        request.setAmount(new BigDecimal("100.00"));

        sourceAccount.setBalance(new BigDecimal("500.00"));
        destinationAccount.setBalance(new BigDecimal("200.00"));

        ReflectionTestUtils.setField(
                destinationAccount,
                "currency",
                "USD"
        );

        mockNewTransaction(key);

        when(accountRepository.findByIdForUpdate(sourceAccountId))
                .thenReturn(Optional.of(sourceAccount));

        when(accountRepository.findByIdForUpdate(destinationAccountId))
                .thenReturn(Optional.of(destinationAccount));

        var response = moneyTransactionService.transfer(
                userId,
                request,
                key
        );

        assertEquals(TransactionStatus.REJECTED, response.status());

        assertEquals(new BigDecimal("500.00"), sourceAccount.getBalance());
        assertEquals(new BigDecimal("200.00"), destinationAccount.getBalance());

        verify(accountRepository, never()).save(any(Account.class));
        verify(ledgerEntryRepository, never()).save(any(LedgerEntry.class));
    }

    @Test
    void userCannotTransferFromAnotherUsersAccount() {

        String key = "transfer-owner-001";

        TransferRequest request = new TransferRequest();
        request.setSourceAccountId(sourceAccountId);
        request.setDestinationAccountId(destinationAccountId);
        request.setAmount(new BigDecimal("100.00"));

        AppUser anotherUser = new AppUser(
                "Another User",
                "another@example.com",
                "encoded-password",
                Role.ACCOUNT_HOLDER
        );

        ReflectionTestUtils.setField(anotherUser, "id", 2L);

        ReflectionTestUtils.setField(
                sourceAccount,
                "owner",
                anotherUser
        );

        when(appUserRepository.findByIdForUpdate(userId))
        .thenReturn(Optional.of(user));

when(transactionRepository.findByInitiatorIdAndIdempotencyKey(
        userId,
        key
)).thenReturn(Optional.empty());

        when(accountRepository.findByIdForUpdate(sourceAccountId))
                .thenReturn(Optional.of(sourceAccount));

        when(accountRepository.findByIdForUpdate(destinationAccountId))
                .thenReturn(Optional.of(destinationAccount));

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> moneyTransactionService.transfer(userId, request, key)
        );

        assertEquals(HttpStatus.NOT_FOUND, exception.getStatusCode());

        verify(transactionRepository, never())
                .saveAndFlush(any(MoneyTransaction.class));

        verify(ledgerEntryRepository, never())
                .save(any(LedgerEntry.class));
    }

    @Test
    void transferIsRejectedWhenSourceBalanceIsInsufficient() {

        String key = "transfer-funds-001";

        TransferRequest request = new TransferRequest();
        request.setSourceAccountId(sourceAccountId);
        request.setDestinationAccountId(destinationAccountId);
        request.setAmount(new BigDecimal("600.00"));

        sourceAccount.setBalance(new BigDecimal("500.00"));
        destinationAccount.setBalance(new BigDecimal("200.00"));

        mockNewTransaction(key);

        when(accountRepository.findByIdForUpdate(sourceAccountId))
                .thenReturn(Optional.of(sourceAccount));

        when(accountRepository.findByIdForUpdate(destinationAccountId))
                .thenReturn(Optional.of(destinationAccount));

        var response = moneyTransactionService.transfer(
                userId,
                request,
                key
        );

        assertEquals(TransactionStatus.REJECTED, response.status());

        assertEquals(new BigDecimal("500.00"), sourceAccount.getBalance());
        assertEquals(new BigDecimal("200.00"), destinationAccount.getBalance());

        verify(accountRepository, never()).save(any(Account.class));
        verify(ledgerEntryRepository, never()).save(any(LedgerEntry.class));
    }

    @Test
    void invalidAmountReturnsBadRequest() {

        DepositRequest request = new DepositRequest();
        request.setAccountId(sourceAccountId);
        request.setAmount(new BigDecimal("-10.00"));

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> moneyTransactionService.deposit(
                        userId,
                        request,
                        "invalid-amount-001"
                )
        );

        assertEquals(
                HttpStatus.BAD_REQUEST,
                exception.getStatusCode()
        );
    }

    @Test
    void missingIdempotencyKeyReturnsBadRequest() {

        DepositRequest request = new DepositRequest();
        request.setAccountId(sourceAccountId);
        request.setAmount(new BigDecimal("100.00"));

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> moneyTransactionService.deposit(
                        userId,
                        request,
                        " "
                )
        );

        assertEquals(
                HttpStatus.BAD_REQUEST,
                exception.getStatusCode()
        );
    }

    @Test
    void transferWithDestinationAccountNumberShouldSucceed() {

        String key = "transfer-by-number-001";
        TransferRequest request = new TransferRequest();
        request.setSourceAccountId(sourceAccountId);
        request.setDestinationAccountNumber("LL999999999999");
        request.setAmount(new BigDecimal("75.00"));

        sourceAccount.setBalance(new BigDecimal("500.00"));
        destinationAccount.setBalance(new BigDecimal("200.00"));

        when(accountRepository.findByAccountNumber("LL999999999999"))
                .thenReturn(Optional.of(destinationAccount));

        when(appUserRepository.findByIdForUpdate(userId))
                .thenReturn(Optional.of(user));

        when(transactionRepository.findByInitiatorIdAndIdempotencyKey(userId, key))
                .thenReturn(Optional.empty());

        when(transactionRepository.saveAndFlush(any(MoneyTransaction.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        when(accountRepository.findByIdForUpdate(sourceAccountId))
                .thenReturn(Optional.of(sourceAccount));

        when(accountRepository.findByIdForUpdate(destinationAccountId))
                .thenReturn(Optional.of(destinationAccount));

        var response = moneyTransactionService.transfer(userId, request, key);

        assertEquals(TransactionStatus.SUCCESS, response.status());
        assertEquals(new BigDecimal("425.00"), sourceAccount.getBalance());
        assertEquals(new BigDecimal("275.00"), destinationAccount.getBalance());
    }

    @Test
    void transferWithUnknownDestinationAccountNumberThrowsNotFound() {

        String key = "transfer-unknown-number-001";
        TransferRequest request = new TransferRequest();
        request.setSourceAccountId(sourceAccountId);
        request.setDestinationAccountNumber("LL000000000000");
        request.setAmount(new BigDecimal("50.00"));

        when(accountRepository.findByAccountNumber("LL000000000000"))
                .thenReturn(Optional.empty());

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> moneyTransactionService.transfer(userId, request, key)
        );

        assertEquals(HttpStatus.NOT_FOUND, exception.getStatusCode());
    }
}
