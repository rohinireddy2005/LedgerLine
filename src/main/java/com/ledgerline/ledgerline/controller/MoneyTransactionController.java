
package com.ledgerline.ledgerline.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import org.springframework.web.server.ResponseStatusException;

import jakarta.validation.Valid;

import com.ledgerline.ledgerline.dto.DepositRequest;
import com.ledgerline.ledgerline.dto.LedgerEntryResponse;
import com.ledgerline.ledgerline.dto.MoneyTransactionResponse;
import com.ledgerline.ledgerline.dto.TransferRequest;
import com.ledgerline.ledgerline.dto.WithdrawalRequest;

import com.ledgerline.ledgerline.entity.AppUser;

import com.ledgerline.ledgerline.repository.AppUserRepository;
import com.ledgerline.ledgerline.service.MoneyTransactionService;

@RestController
@RequestMapping("/api/transactions")
public class MoneyTransactionController {

    private final MoneyTransactionService transactionService;
    private final AppUserRepository appUserRepository;

    public MoneyTransactionController(
            MoneyTransactionService transactionService,
            AppUserRepository appUserRepository) {

        this.transactionService = transactionService;
        this.appUserRepository = appUserRepository;
    }

    @PostMapping("/deposit")
    public ResponseEntity<MoneyTransactionResponse> deposit(
            @Valid @RequestBody DepositRequest request,
            @RequestHeader("Idempotency-Key") String idempotencyKey,
            Authentication authentication) {

        Long userId = getAuthenticatedUserId(authentication);

        MoneyTransactionResponse response =
                transactionService.deposit(
                        userId,
                        request,
                        idempotencyKey
                );

        return ResponseEntity
                .status(
                    response.status() == com.ledgerline.ledgerline.entity.TransactionStatus.REJECTED
                            ? HttpStatus.UNPROCESSABLE_ENTITY
                            : HttpStatus.CREATED
                )
                .body(response);
    }

    @PostMapping("/withdraw")
    public ResponseEntity<MoneyTransactionResponse> withdraw(
            @Valid @RequestBody WithdrawalRequest request,
            @RequestHeader("Idempotency-Key") String idempotencyKey,
            Authentication authentication) {

        Long userId = getAuthenticatedUserId(authentication);

        MoneyTransactionResponse response =
                transactionService.withdraw(
                        userId,
                        request,
                        idempotencyKey
                );

        return ResponseEntity
                .status(
                    response.status() == com.ledgerline.ledgerline.entity.TransactionStatus.REJECTED
                            ? HttpStatus.UNPROCESSABLE_ENTITY
                            : HttpStatus.CREATED
                )
                .body(response);
    }

    @PostMapping("/transfer")
    public ResponseEntity<MoneyTransactionResponse> transfer(
            @Valid @RequestBody TransferRequest request,
            @RequestHeader("Idempotency-Key") String idempotencyKey,
            Authentication authentication) {

        Long userId = getAuthenticatedUserId(authentication);

        MoneyTransactionResponse response =
                transactionService.transfer(
                        userId,
                        request,
                        idempotencyKey
                );

        return ResponseEntity
                .status(
                    response.status() == com.ledgerline.ledgerline.entity.TransactionStatus.REJECTED
                            ? HttpStatus.UNPROCESSABLE_ENTITY
                            : HttpStatus.CREATED
                )
                .body(response);
    }

    @GetMapping("/accounts/{accountId}/ledger")
    public ResponseEntity<List<LedgerEntryResponse>> getMyLedger(
            @PathVariable Long accountId,
            Authentication authentication) {

        Long userId = getAuthenticatedUserId(authentication);

        return ResponseEntity.ok(
                transactionService.getMyLedger(userId, accountId)
        );
    }

    private Long getAuthenticatedUserId(
            Authentication authentication) {

        if (authentication == null) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Authentication is required"
            );
        }

        String email = authentication.getName();

        AppUser user = appUserRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Authenticated user not found"
                ));

        return user.getId();
    }
}
