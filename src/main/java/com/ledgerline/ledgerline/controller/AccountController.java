
package com.ledgerline.ledgerline.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.ledgerline.ledgerline.dto.AccountResponse;
import com.ledgerline.ledgerline.service.AccountService;
import com.ledgerline.ledgerline.repository.AppUserRepository;
import com.ledgerline.ledgerline.entity.AppUser;

@RestController
@RequestMapping("/api/accounts")
public class AccountController {

    private final AccountService accountService;
    private final AppUserRepository appUserRepository;

    public AccountController(
            AccountService accountService,
            AppUserRepository appUserRepository) {

        this.accountService = accountService;
        this.appUserRepository = appUserRepository;
    }

    @PostMapping
    public ResponseEntity<AccountResponse> createAccount(
            Authentication authentication) {

        Long userId = getAuthenticatedUserId(authentication);

        AccountResponse response =
                accountService.createAccount(userId);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(response);
    }

    @GetMapping
    public ResponseEntity<List<AccountResponse>> getMyAccounts(
            Authentication authentication) {

        Long userId = getAuthenticatedUserId(authentication);

        return ResponseEntity.ok(
                accountService.getMyAccounts(userId)
        );
    }

    @GetMapping("/{accountId}")
    public ResponseEntity<AccountResponse> getMyAccount(
            @PathVariable Long accountId,
            Authentication authentication) {

        Long userId = getAuthenticatedUserId(authentication);

        return ResponseEntity.ok(
                accountService.getMyAccount(accountId, userId)
        );
    }

    private Long getAuthenticatedUserId(
            Authentication authentication) {

        String email = authentication.getName();

        AppUser user = appUserRepository.findByEmail(email)
                .orElseThrow(() ->
                        new org.springframework.web.server
                                .ResponseStatusException(
                                        HttpStatus.NOT_FOUND,
                                        "Authenticated user not found"
                                )
                );

        return user.getId();
    }
}
