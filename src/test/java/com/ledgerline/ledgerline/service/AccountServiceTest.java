
package com.ledgerline.ledgerline.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import com.ledgerline.ledgerline.dto.AccountResponse;
import com.ledgerline.ledgerline.entity.Account;
import com.ledgerline.ledgerline.entity.AppUser;
import com.ledgerline.ledgerline.entity.Role;
import com.ledgerline.ledgerline.repository.AccountRepository;
import com.ledgerline.ledgerline.repository.AppUserRepository;

@ExtendWith(MockitoExtension.class)
class AccountServiceTest {

    @Mock
    private AccountRepository accountRepository;

    @Mock
    private AppUserRepository appUserRepository;

    @InjectMocks
    private AccountService accountService;

    private AppUser owner;
    private Account account;

    @BeforeEach
    void setUp() {

        owner = new AppUser(
                "Test User",
                "test@example.com",
                "encoded-password",
                Role.ACCOUNT_HOLDER
        );

        account = new Account("LL123456789012", owner);
    }

    @Test
    void userCanRetrieveOwnAccount() {

        Long accountId = 1L;
        Long ownerId = 10L;

        when(accountRepository.findByIdAndOwnerId(
                accountId, ownerId
        )).thenReturn(Optional.of(account));

        AccountResponse response =
                accountService.getMyAccount(accountId, ownerId);

        assertEquals(
                "LL123456789012",
                response.accountNumber()
        );

        assertEquals(
                "INR",
                response.currency()
        );

        verify(accountRepository)
                .findByIdAndOwnerId(accountId, ownerId);
    }

    @Test
    void userCannotRetrieveAnotherUsersAccount() {

        Long accountId = 1L;
        Long differentUserId = 20L;

        when(accountRepository.findByIdAndOwnerId(
                accountId, differentUserId
        )).thenReturn(Optional.empty());

        ResponseStatusException exception =
                assertThrows(
                        ResponseStatusException.class,
                        () -> accountService.getMyAccount(
                                accountId,
                                differentUserId
                        )
                );

        assertEquals(
                404,
                exception.getStatusCode().value()
        );

        verify(accountRepository)
                .findByIdAndOwnerId(accountId, differentUserId);
    }

    @Test
    void nonexistentAccountReturnsNotFound() {

        Long accountId = 999L;
        Long ownerId = 10L;

        when(accountRepository.findByIdAndOwnerId(
                accountId, ownerId
        )).thenReturn(Optional.empty());

        ResponseStatusException exception =
                assertThrows(
                        ResponseStatusException.class,
                        () -> accountService.getMyAccount(
                                accountId,
                                ownerId
                        )
                );

        assertEquals(
                404,
                exception.getStatusCode().value()
        );
    }
}
