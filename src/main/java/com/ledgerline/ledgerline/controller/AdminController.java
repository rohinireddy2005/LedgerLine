package com.ledgerline.ledgerline.controller;

import jakarta.validation.Valid;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.ledgerline.ledgerline.dto.AccountReconciliationResponse;
import com.ledgerline.ledgerline.dto.AccountStatusChangeRequest;
import com.ledgerline.ledgerline.dto.AdminAccountResponse;
import com.ledgerline.ledgerline.dto.AdminAccountStatusAuditResponse;
import com.ledgerline.ledgerline.dto.UserResponse;
import com.ledgerline.ledgerline.service.AdminService;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private static final int MAX_PAGE_SIZE = 100;

    private final AdminService adminService;

    public AdminController(AdminService adminService) {
        this.adminService = adminService;
    }

    // USER REPORTING

    @GetMapping("/users")
    public ResponseEntity<Page<UserResponse>> getAllUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        Pageable pageable = createPageable(page, size);

        return ResponseEntity.ok(
                adminService.getAllUsers(pageable)
        );
    }

    // ACCOUNT REPORTING

    @GetMapping("/accounts")
    public ResponseEntity<Page<AdminAccountResponse>> getAllAccounts(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        Pageable pageable = createPageable(page, size);

        return ResponseEntity.ok(
                adminService.getAllAccounts(pageable)
        );
    }

    @GetMapping("/accounts/{accountId}")
    public ResponseEntity<AdminAccountResponse> getAccount(
            @PathVariable Long accountId) {

        return ResponseEntity.ok(
                adminService.getAccount(accountId)
        );
    }

    // READ-ONLY ACCOUNT RECONCILIATION

    @GetMapping("/accounts/{accountId}/reconciliation")
    public ResponseEntity<AccountReconciliationResponse> reconcileAccount(
            @PathVariable Long accountId) {

        return ResponseEntity.ok(
                adminService.reconcileAccount(accountId)
        );
    }

    // ACCOUNT STATUS MANAGEMENT

    @PostMapping("/accounts/{accountId}/freeze")
    public ResponseEntity<AdminAccountResponse> freezeAccount(
            @PathVariable Long accountId,
            @Valid @RequestBody AccountStatusChangeRequest request,
            Authentication authentication) {

        AdminAccountResponse response = adminService.freezeAccount(
                accountId,
                authentication.getName(),
                request.reason()
        );

        return ResponseEntity.ok(response);
    }

    @PostMapping("/accounts/{accountId}/unfreeze")
    public ResponseEntity<AdminAccountResponse> unfreezeAccount(
            @PathVariable Long accountId,
            @Valid @RequestBody AccountStatusChangeRequest request,
            Authentication authentication) {

        AdminAccountResponse response = adminService.unfreezeAccount(
                accountId,
                authentication.getName(),
                request.reason()
        );

        return ResponseEntity.ok(response);
    }

    @PostMapping("/accounts/{accountId}/close")
    public ResponseEntity<AdminAccountResponse> closeAccount(
            @PathVariable Long accountId,
            @Valid @RequestBody AccountStatusChangeRequest request,
            Authentication authentication) {

        AdminAccountResponse response = adminService.closeAccount(
                accountId,
                authentication.getName(),
                request.reason()
        );

        return ResponseEntity.ok(response);
    }

    // ADMINISTRATIVE AUDIT HISTORY

    @GetMapping("/audits")
    public ResponseEntity<Page<AdminAccountStatusAuditResponse>> getAllAudits(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        Pageable pageable = createPageable(page, size);

        return ResponseEntity.ok(
                adminService.getAllAudits(pageable)
        );
    }

    @GetMapping("/accounts/{accountId}/audits")
    public ResponseEntity<Page<AdminAccountStatusAuditResponse>> getAccountAudits(
            @PathVariable Long accountId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        Pageable pageable = createPageable(page, size);

        return ResponseEntity.ok(
                adminService.getAccountAudits(accountId, pageable)
        );
    }

    // PAGINATION VALIDATION

    private Pageable createPageable(int page, int size) {

        if (page < 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Page number cannot be negative"
            );
        }

        if (size < 1 || size > MAX_PAGE_SIZE) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Page size must be between 1 and 100"
            );
        }

        return PageRequest.of(
                page,
                size,
                Sort.unsorted()
        );
    }
}