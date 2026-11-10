package com.ledgerline.ledgerline.service;

import java.math.BigDecimal;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import org.springframework.web.server.ResponseStatusException;

import com.ledgerline.ledgerline.dto.AccountReconciliationResponse;
import com.ledgerline.ledgerline.dto.AdminAccountResponse;
import com.ledgerline.ledgerline.dto.AdminAccountStatusAuditResponse;
import com.ledgerline.ledgerline.dto.UserResponse;

import com.ledgerline.ledgerline.entity.Account;
import com.ledgerline.ledgerline.entity.AccountStatus;
import com.ledgerline.ledgerline.entity.AccountStatusAudit;
import com.ledgerline.ledgerline.entity.AppUser;
import com.ledgerline.ledgerline.entity.LedgerEntry;
import com.ledgerline.ledgerline.entity.LedgerEntryType;
import com.ledgerline.ledgerline.entity.Role;
import com.ledgerline.ledgerline.entity.TransactionStatus;

import com.ledgerline.ledgerline.repository.AccountRepository;
import com.ledgerline.ledgerline.repository.AccountStatusAuditRepository;
import com.ledgerline.ledgerline.repository.AppUserRepository;
import com.ledgerline.ledgerline.repository.LedgerEntryRepository;

@Service
public class AdminService {

    private final AccountRepository accountRepository;

    private final AppUserRepository appUserRepository;

    private final AccountStatusAuditRepository accountStatusAuditRepository;

    private final LedgerEntryRepository ledgerEntryRepository;

    public AdminService(
            AccountRepository accountRepository,
            AppUserRepository appUserRepository,
            AccountStatusAuditRepository accountStatusAuditRepository,
            LedgerEntryRepository ledgerEntryRepository) {

        this.accountRepository = accountRepository;
        this.appUserRepository = appUserRepository;
        this.accountStatusAuditRepository = accountStatusAuditRepository;
        this.ledgerEntryRepository = ledgerEntryRepository;
    }

    // --------------------------------------------------
    // USER AND ACCOUNT REPORTING
    // --------------------------------------------------

    @Transactional(readOnly = true)
    public Page<UserResponse> getAllUsers(Pageable pageable) {

        return appUserRepository.findAll(pageable)
                .map(UserResponse::from);
    }

    @Transactional(readOnly = true)
    public Page<AdminAccountResponse> getAllAccounts(Pageable pageable) {

        return accountRepository
                .findAllByOrderByCreatedAtDescIdDesc(pageable)
                .map(AdminAccountResponse::from);
    }

    @Transactional(readOnly = true)
    public AdminAccountResponse getAccount(Long accountId) {

        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Account not found"
                ));

        return AdminAccountResponse.from(account);
    }

    // --------------------------------------------------
    // READ-ONLY ACCOUNT RECONCILIATION
    // --------------------------------------------------

    @Transactional(
            readOnly = true,
            isolation = Isolation.REPEATABLE_READ
    )
    public AccountReconciliationResponse reconcileAccount(Long accountId) {

        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Account not found"
                ));

        List<LedgerEntry> entries =
                ledgerEntryRepository
                        .findByAccountIdOrderByCreatedAtAscIdAsc(accountId);

        BigDecimal calculatedBalance = BigDecimal.ZERO;

        boolean reconciled = true;

        String mismatchReason = null;

        for (LedgerEntry entry : entries) {

            // A rejected transaction must never have a ledger entry.
            if (entry.getTransaction().getStatus()
                    != TransactionStatus.SUCCESS) {

                reconciled = false;

                if (mismatchReason == null) {
                    mismatchReason =
                            "A non-successful transaction has a ledger entry.";
                }

                continue;
            }

            // Calculate the running balance.
            if (entry.getEntryType() == LedgerEntryType.CREDIT) {

                calculatedBalance =
                        calculatedBalance.add(entry.getAmount());

            } else if (entry.getEntryType() == LedgerEntryType.DEBIT) {

                calculatedBalance =
                        calculatedBalance.subtract(entry.getAmount());

            } else {

                reconciled = false;

                if (mismatchReason == null) {
                    mismatchReason =
                            "An unknown ledger entry type was found.";
                }

                continue;
            }

            // Verify the recorded balance after this entry.
            if (calculatedBalance.compareTo(entry.getBalanceAfter()) != 0) {

                reconciled = false;

                if (mismatchReason == null) {
                    mismatchReason =
                            "A ledger entry's recorded running balance does not match.";
                }
            }
        }

        // Compare the final calculated balance with the account balance.
        if (calculatedBalance.compareTo(account.getBalance()) != 0) {

            reconciled = false;

            if (mismatchReason == null) {
                mismatchReason =
                        "The calculated ledger balance differs from the account balance.";
            }
        }

        String message = reconciled
                ? "Account balance and ledger are consistent."
                : mismatchReason;

        return new AccountReconciliationResponse(
                account.getId(),
                account.getAccountNumber(),
                account.getBalance(),
                calculatedBalance,
                entries.size(),
                reconciled,
                message
        );
    }

    // --------------------------------------------------
    // ACCOUNT STATUS MANAGEMENT
    // --------------------------------------------------

    @Transactional
    public AdminAccountResponse freezeAccount(
            Long accountId,
            String adminEmail,
            String reason) {

        return changeAccountStatus(
                accountId,
                adminEmail,
                reason,
                AccountStatus.ACTIVE,
                AccountStatus.FROZEN
        );
    }

    @Transactional
    public AdminAccountResponse unfreezeAccount(
            Long accountId,
            String adminEmail,
            String reason) {

        return changeAccountStatus(
                accountId,
                adminEmail,
                reason,
                AccountStatus.FROZEN,
                AccountStatus.ACTIVE
        );
    }

    @Transactional
    public AdminAccountResponse closeAccount(
            Long accountId,
            String adminEmail,
            String reason) {

        AppUser administrator = getAdministrator(adminEmail);

        validateReason(reason);

        Account account = accountRepository.findByIdForUpdate(accountId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Account not found"
                ));

        AccountStatus previousStatus = account.getStatus();

        if (previousStatus != AccountStatus.ACTIVE
                && previousStatus != AccountStatus.FROZEN) {

            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Only active or frozen accounts can be closed"
            );
        }

        if (account.getBalance().compareTo(BigDecimal.ZERO) != 0) {

            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "An account can only be closed when its balance is zero"
            );
        }

        account.setStatus(AccountStatus.CLOSED);

        accountRepository.save(account);

        AccountStatusAudit audit = new AccountStatusAudit(
                account,
                previousStatus.name(),
                AccountStatus.CLOSED.name(),
                administrator,
                reason.trim()
        );

        accountStatusAuditRepository.saveAndFlush(audit);

        return AdminAccountResponse.from(account);
    }

    private AdminAccountResponse changeAccountStatus(
            Long accountId,
            String adminEmail,
            String reason,
            AccountStatus requiredStatus,
            AccountStatus targetStatus) {

        AppUser administrator = getAdministrator(adminEmail);

        validateReason(reason);

        Account account = accountRepository.findByIdForUpdate(accountId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Account not found"
                ));

        AccountStatus previousStatus = account.getStatus();

        if (previousStatus != requiredStatus) {

            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Account must be " + requiredStatus.name()
                            + " before it can be changed to "
                            + targetStatus.name()
            );
        }

        account.setStatus(targetStatus);

        accountRepository.save(account);

        AccountStatusAudit audit = new AccountStatusAudit(
                account,
                previousStatus.name(),
                targetStatus.name(),
                administrator,
                reason.trim()
        );

        accountStatusAuditRepository.saveAndFlush(audit);

        return AdminAccountResponse.from(account);
    }

    // --------------------------------------------------
    // ADMIN AUDIT HISTORY
    // --------------------------------------------------

    @Transactional(readOnly = true)
    public Page<AdminAccountStatusAuditResponse> getAllAudits(
            Pageable pageable) {

        return accountStatusAuditRepository
                .findAllByOrderByCreatedAtDescIdDesc(pageable)
                .map(AdminAccountStatusAuditResponse::from);
    }

    @Transactional(readOnly = true)
    public Page<AdminAccountStatusAuditResponse> getAccountAudits(
            Long accountId,
            Pageable pageable) {

        if (!accountRepository.existsById(accountId)) {

            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Account not found"
            );
        }

        return accountStatusAuditRepository
                .findByAccountIdOrderByCreatedAtDescIdDesc(
                        accountId,
                        pageable
                )
                .map(AdminAccountStatusAuditResponse::from);
    }

    // --------------------------------------------------
    // ADMIN AUTHORIZATION
    // --------------------------------------------------

    private AppUser getAdministrator(String adminEmail) {

        AppUser administrator = appUserRepository.findByEmail(adminEmail)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Administrator not found"
                ));

        if (administrator.getRole() != Role.ADMIN) {

            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Only administrators can perform this operation"
            );
        }

        return administrator;
    }

    // --------------------------------------------------
    // INPUT VALIDATION
    // --------------------------------------------------

    private void validateReason(String reason) {

        if (reason == null
                || reason.trim().isEmpty()
                || reason.trim().length() > 500) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Reason must contain between 1 and 500 characters"
            );
        }
    }
}