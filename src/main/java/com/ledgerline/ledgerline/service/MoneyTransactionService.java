
package com.ledgerline.ledgerline.service;

import java.math.BigDecimal;
import java.util.Optional;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.ledgerline.ledgerline.dto.DepositRequest;
import com.ledgerline.ledgerline.dto.LedgerEntryResponse;
import com.ledgerline.ledgerline.dto.MoneyTransactionResponse;
import com.ledgerline.ledgerline.dto.TransferRequest;
import com.ledgerline.ledgerline.dto.WithdrawalRequest;

import com.ledgerline.ledgerline.entity.Account;
import com.ledgerline.ledgerline.entity.AccountStatus;
import com.ledgerline.ledgerline.entity.AppUser;
import com.ledgerline.ledgerline.entity.LedgerEntry;
import com.ledgerline.ledgerline.entity.LedgerEntryType;
import com.ledgerline.ledgerline.entity.MoneyTransaction;
import com.ledgerline.ledgerline.entity.TransactionStatus;
import com.ledgerline.ledgerline.entity.TransactionType;

import com.ledgerline.ledgerline.repository.AccountRepository;
import com.ledgerline.ledgerline.repository.AppUserRepository;
import com.ledgerline.ledgerline.repository.LedgerEntryRepository;
import com.ledgerline.ledgerline.repository.MoneyTransactionRepository;

@Service
public class MoneyTransactionService {

    private static final BigDecimal MAX_BALANCE =
            new BigDecimal("99999999999999999.99");

    private final AccountRepository accountRepository;
    private final AppUserRepository appUserRepository;
    private final MoneyTransactionRepository transactionRepository;
    private final LedgerEntryRepository ledgerEntryRepository;

    public MoneyTransactionService(
            AccountRepository accountRepository,
            AppUserRepository appUserRepository,
            MoneyTransactionRepository transactionRepository,
            LedgerEntryRepository ledgerEntryRepository) {

        this.accountRepository = accountRepository;
        this.appUserRepository = appUserRepository;
        this.transactionRepository = transactionRepository;
        this.ledgerEntryRepository = ledgerEntryRepository;
    }

    @Transactional
    public MoneyTransactionResponse deposit(
            Long userId,
            DepositRequest request,
            String idempotencyKey) {

        validateRequest(request.getAmount(), idempotencyKey);

        AppUser initiator = lockUser(userId);

        Optional<MoneyTransactionResponse> existing =
                findExistingTransaction(
                        initiator.getId(),
                        idempotencyKey,
                        TransactionType.DEPOSIT,
                        request.getAmount(),
                        null,
                        request.getAccountId()
                );

        if (existing.isPresent()) {
            return existing.get();
        }

        Account account = lockOwnedAccount(
                request.getAccountId(),
                userId
        );

        if (account.getStatus() != AccountStatus.ACTIVE) {
            return saveRejectedTransaction(
                    TransactionType.DEPOSIT,
                    request.getAmount(),
                    null,
                    account,
                    initiator,
                    idempotencyKey,
                    "Account is not active"
            );
        }

        BigDecimal newBalance =
                account.getBalance().add(request.getAmount());

        if (exceedsMaximumBalance(newBalance)) {
            return saveRejectedTransaction(
                    TransactionType.DEPOSIT,
                    request.getAmount(),
                    null,
                    account,
                    initiator,
                    idempotencyKey,
                    "Account balance limit exceeded"
            );
        }

        MoneyTransaction transaction = new MoneyTransaction(
                TransactionType.DEPOSIT,
                request.getAmount(),
                null,
                account,
                initiator,
                TransactionStatus.SUCCESS,
                idempotencyKey,
                null
        );

        transaction = transactionRepository.saveAndFlush(transaction);

        account.setBalance(newBalance);
        accountRepository.save(account);

        LedgerEntry entry = new LedgerEntry(
                transaction,
                account,
                LedgerEntryType.CREDIT,
                request.getAmount(),
                newBalance
        );

        ledgerEntryRepository.save(entry);

        return MoneyTransactionResponse.from(transaction);
    }

    @Transactional
    public MoneyTransactionResponse withdraw(
            Long userId,
            WithdrawalRequest request,
            String idempotencyKey) {

        validateRequest(request.getAmount(), idempotencyKey);

        AppUser initiator = lockUser(userId);

        Optional<MoneyTransactionResponse> existing =
                findExistingTransaction(
                        initiator.getId(),
                        idempotencyKey,
                        TransactionType.WITHDRAWAL,
                        request.getAmount(),
                        request.getAccountId(),
                        null
                );

        if (existing.isPresent()) {
            return existing.get();
        }

        Account account = lockOwnedAccount(
                request.getAccountId(),
                userId
        );

        if (account.getStatus() != AccountStatus.ACTIVE) {
            return saveRejectedTransaction(
                    TransactionType.WITHDRAWAL,
                    request.getAmount(),
                    account,
                    null,
                    initiator,
                    idempotencyKey,
                    "Account is not active"
            );
        }

        if (account.getBalance().compareTo(request.getAmount()) < 0) {
            return saveRejectedTransaction(
                    TransactionType.WITHDRAWAL,
                    request.getAmount(),
                    account,
                    null,
                    initiator,
                    idempotencyKey,
                    "Insufficient account balance"
            );
        }

        BigDecimal newBalance =
                account.getBalance().subtract(request.getAmount());

        MoneyTransaction transaction = new MoneyTransaction(
                TransactionType.WITHDRAWAL,
                request.getAmount(),
                account,
                null,
                initiator,
                TransactionStatus.SUCCESS,
                idempotencyKey,
                null
        );

        transaction = transactionRepository.saveAndFlush(transaction);

        account.setBalance(newBalance);
        accountRepository.save(account);

        LedgerEntry entry = new LedgerEntry(
                transaction,
                account,
                LedgerEntryType.DEBIT,
                request.getAmount(),
                newBalance
        );

        ledgerEntryRepository.save(entry);

        return MoneyTransactionResponse.from(transaction);
    }

    @Transactional
    public MoneyTransactionResponse transfer(
            Long userId,
            TransferRequest request,
            String idempotencyKey) {

        validateRequest(request.getAmount(), idempotencyKey);

        if (request.getSourceAccountId().equals(
                request.getDestinationAccountId())) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Source and destination accounts must be different"
            );
        }

        AppUser initiator = lockUser(userId);

        Optional<MoneyTransactionResponse> existing =
                findExistingTransaction(
                        initiator.getId(),
                        idempotencyKey,
                        TransactionType.TRANSFER,
                        request.getAmount(),
                        request.getSourceAccountId(),
                        request.getDestinationAccountId()
                );

        if (existing.isPresent()) {
            return existing.get();
        }

        Long sourceId = request.getSourceAccountId();
        Long destinationId = request.getDestinationAccountId();

        // Always acquire account locks in ascending ID order.
        // This reduces the possibility of deadlocks.
        Account sourceAccount;
        Account destinationAccount;

        if (sourceId < destinationId) {

            sourceAccount = lockAccount(sourceId);
            destinationAccount = lockAccount(destinationId);

        } else {

            destinationAccount = lockAccount(destinationId);
            sourceAccount = lockAccount(sourceId);
        }

        // Only the owner of the source account may initiate a transfer.
        if (!sourceAccount.getOwner().getId().equals(userId)) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Source account not found"
            );
        }

        if (sourceAccount.getStatus() != AccountStatus.ACTIVE
                || destinationAccount.getStatus() != AccountStatus.ACTIVE) {

            return saveRejectedTransaction(
                    TransactionType.TRANSFER,
                    request.getAmount(),
                    sourceAccount,
                    destinationAccount,
                    initiator,
                    idempotencyKey,
                    "Source or destination account is not active"
            );
        }

        if (!sourceAccount.getCurrency().equals(
                destinationAccount.getCurrency())) {

            return saveRejectedTransaction(
                    TransactionType.TRANSFER,
                    request.getAmount(),
                    sourceAccount,
                    destinationAccount,
                    initiator,
                    idempotencyKey,
                    "Account currencies do not match"
            );
        }

        if (sourceAccount.getBalance().compareTo(request.getAmount()) < 0) {

            return saveRejectedTransaction(
                    TransactionType.TRANSFER,
                    request.getAmount(),
                    sourceAccount,
                    destinationAccount,
                    initiator,
                    idempotencyKey,
                    "Insufficient account balance"
            );
        }

        BigDecimal sourceNewBalance =
                sourceAccount.getBalance().subtract(request.getAmount());

        BigDecimal destinationNewBalance =
                destinationAccount.getBalance().add(request.getAmount());

        if (exceedsMaximumBalance(destinationNewBalance)) {
            return saveRejectedTransaction(
                    TransactionType.TRANSFER,
                    request.getAmount(),
                    sourceAccount,
                    destinationAccount,
                    initiator,
                    idempotencyKey,
                    "Destination account balance limit exceeded"
            );
        }

        MoneyTransaction transaction = new MoneyTransaction(
                TransactionType.TRANSFER,
                request.getAmount(),
                sourceAccount,
                destinationAccount,
                initiator,
                TransactionStatus.SUCCESS,
                idempotencyKey,
                null
        );

        transaction = transactionRepository.saveAndFlush(transaction);

        sourceAccount.setBalance(sourceNewBalance);
        destinationAccount.setBalance(destinationNewBalance);

        accountRepository.save(sourceAccount);
        accountRepository.save(destinationAccount);

        LedgerEntry debitEntry = new LedgerEntry(
                transaction,
                sourceAccount,
                LedgerEntryType.DEBIT,
                request.getAmount(),
                sourceNewBalance
        );

        LedgerEntry creditEntry = new LedgerEntry(
                transaction,
                destinationAccount,
                LedgerEntryType.CREDIT,
                request.getAmount(),
                destinationNewBalance
        );

        ledgerEntryRepository.save(debitEntry);
        ledgerEntryRepository.save(creditEntry);

        return MoneyTransactionResponse.from(transaction);
    }

    @Transactional(readOnly = true)
    public java.util.List<LedgerEntryResponse> getMyLedger(
            Long userId,
            Long accountId) {

        Account account = accountRepository
                .findByIdAndOwnerId(accountId, userId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Account not found"
                ));

        return ledgerEntryRepository
                .findByAccountIdOrderByCreatedAtAscIdAsc(account.getId())
                .stream()
                .map(LedgerEntryResponse::from)
                .toList();
    }

    private void validateRequest(
            BigDecimal amount,
            String idempotencyKey) {

        if (amount == null
                || amount.compareTo(BigDecimal.ZERO) <= 0
                || amount.scale() > 2
                || amount.precision() > 19
                || amount.compareTo(MAX_BALANCE) > 0) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Amount must be positive and have at most 2 decimal places"
            );
        }

        if (idempotencyKey == null
                || idempotencyKey.isBlank()
                || idempotencyKey.length() > 100) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "A valid Idempotency-Key header is required"
            );
        }
    }

    private boolean exceedsMaximumBalance(BigDecimal balance) {
        return balance.compareTo(MAX_BALANCE) > 0;
    }

    private AppUser lockUser(Long userId) {

        return appUserRepository.findByIdForUpdate(userId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "User not found"
                ));
    }

    private Account lockAccount(Long accountId) {

        return accountRepository.findByIdForUpdate(accountId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Account not found"
                ));
    }

    private Account lockOwnedAccount(
            Long accountId,
            Long userId) {

        return accountRepository
                .findByIdAndOwnerIdForUpdate(accountId, userId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Account not found"
                ));
    }

    private Optional<MoneyTransactionResponse> findExistingTransaction(
            Long userId,
            String idempotencyKey,
            TransactionType type,
            BigDecimal amount,
            Long sourceAccountId,
            Long destinationAccountId) {

        Optional<MoneyTransaction> existing =
                transactionRepository
                        .findByInitiatorIdAndIdempotencyKey(
                                userId,
                                idempotencyKey
                        );

        if (existing.isEmpty()) {
            return Optional.empty();
        }

        MoneyTransaction previous = existing.get();

        boolean sameRequest =
                previous.getType() == type
                && previous.getAmount().compareTo(amount) == 0
                && sameAccount(
                        previous.getSourceAccount(),
                        sourceAccountId
                )
                && sameAccount(
                        previous.getDestinationAccount(),
                        destinationAccountId
                );

        if (!sameRequest) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Idempotency key was already used for a different request"
            );
        }

        return Optional.of(
                MoneyTransactionResponse.from(previous)
        );
    }

    private boolean sameAccount(
            Account account,
            Long accountId) {

        if (account == null) {
            return accountId == null;
        }

        return accountId != null
                && account.getId().equals(accountId);
    }

    private MoneyTransactionResponse saveRejectedTransaction(
            TransactionType type,
            BigDecimal amount,
            Account sourceAccount,
            Account destinationAccount,
            AppUser initiator,
            String idempotencyKey,
            String reason) {

        MoneyTransaction transaction = new MoneyTransaction(
                type,
                amount,
                sourceAccount,
                destinationAccount,
                initiator,
                TransactionStatus.REJECTED,
                idempotencyKey,
                reason
        );

        MoneyTransaction saved =
                transactionRepository.saveAndFlush(transaction);

        return MoneyTransactionResponse.from(saved);
    }
}
