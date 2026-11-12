package com.ledgerline.ledgerline.service;

import java.security.SecureRandom;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.ledgerline.ledgerline.dto.AccountLookupResponse;
import com.ledgerline.ledgerline.dto.AccountResponse;
import com.ledgerline.ledgerline.entity.Account;
import com.ledgerline.ledgerline.entity.AppUser;
import com.ledgerline.ledgerline.repository.AccountRepository;
import com.ledgerline.ledgerline.repository.AppUserRepository;

@Service
public class AccountService {

    private static final int MAX_ACCOUNT_NUMBER_ATTEMPTS = 5;

    private final AccountRepository accountRepository;
    private final AppUserRepository appUserRepository;

    private final SecureRandom secureRandom = new SecureRandom();

    public AccountService(
            AccountRepository accountRepository,
            AppUserRepository appUserRepository) {

        this.accountRepository = accountRepository;
        this.appUserRepository = appUserRepository;
    }

    @Transactional
    public AccountResponse createAccount(Long userId) {

        AppUser owner = appUserRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "User not found"
                ));

        String accountNumber = generateUniqueAccountNumber();

        Account account = new Account(accountNumber, owner);

        Account savedAccount = accountRepository.save(account);

        return AccountResponse.from(savedAccount);
    }

    @Transactional(readOnly = true)
    public List<AccountResponse> getMyAccounts(Long userId) {

        return accountRepository.findAllByOwnerId(userId)
                .stream()
                .map(AccountResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public AccountResponse getMyAccount(
            Long accountId,
            Long userId) {

        Account account = accountRepository
                .findByIdAndOwnerId(accountId, userId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Account not found"
                ));

        return AccountResponse.from(account);
    }

    @Transactional(readOnly = true)
    public AccountLookupResponse lookupAccount(String accountNumber) {

        if (accountNumber == null || accountNumber.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Account number is required"
            );
        }

        Account account = accountRepository.findByAccountNumber(accountNumber.trim())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Recipient account not found"
                ));

        String fullName = account.getOwner().getFullName();
        String maskedName = maskName(fullName);

        return new AccountLookupResponse(
                account.getAccountNumber(),
                account.getCurrency(),
                account.getStatus(),
                maskedName
        );
    }

    private String maskName(String name) {
        if (name == null || name.isBlank()) {
            return "Account Holder";
        }
        String[] parts = name.trim().split("\\s+");
        if (parts.length == 1) {
            String p = parts[0];
            return p.length() > 2 ? p.charAt(0) + "***" + p.charAt(p.length() - 1) : p + "***";
        }
        return parts[0] + " " + parts[parts.length - 1].charAt(0) + ".";
    }

    private String generateUniqueAccountNumber() {

        for (int attempt = 0;
             attempt < MAX_ACCOUNT_NUMBER_ATTEMPTS;
             attempt++) {

            String accountNumber =
                    "LL" + String.format(
                            "%012d",
                            secureRandom.nextLong(1_000_000_000_000L)
                    );

            if (!accountRepository.existsByAccountNumber(accountNumber)) {
                return accountNumber;
            }
        }

        throw new ResponseStatusException(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "Unable to generate a unique account number"
        );
    }
}
