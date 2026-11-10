
package com.ledgerline.ledgerline.config;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.boot.ApplicationArguments;
import org.springframework.core.env.Environment;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import com.ledgerline.ledgerline.entity.AppUser;
import com.ledgerline.ledgerline.entity.Role;
import com.ledgerline.ledgerline.repository.AppUserRepository;

@ExtendWith(MockitoExtension.class)
class RoleAccountInitializerTest {

    @Mock
    private AppUserRepository appUserRepository;

    @Mock
    private Environment environment;

    @Mock
    private ApplicationArguments applicationArguments;

    private BCryptPasswordEncoder passwordEncoder;

    private RoleAccountInitializer initializer;

    @BeforeEach
    void setUp() {
        passwordEncoder = new BCryptPasswordEncoder(4);

        initializer = new RoleAccountInitializer(
                appUserRepository,
                passwordEncoder,
                environment
        );
    }

    @Test
    void shouldSkipInitializationWhenAllSettingsAreMissing() {

        when(environment.getProperty(any(String.class)))
                .thenReturn(null);

        initializer.run(applicationArguments);

        verify(appUserRepository, never()).saveAndFlush(any());
    }

    @Test
    void shouldFailWhenOnlySomeSettingsAreConfigured() {

        when(environment.getProperty(any(String.class)))
                .thenReturn(null);

        when(environment.getProperty("LEDGERLINE_ADMIN_NAME"))
                .thenReturn("Admin User");

        assertThrows(
                IllegalStateException.class,
                () -> initializer.run(applicationArguments)
        );

        verify(appUserRepository, never()).saveAndFlush(any());
    }

    @Test
    void shouldCreateAdminAndAuditorWithEncodedPasswords() {

        configureValidSettings();

        when(appUserRepository.findByEmail("admin@example.com"))
                .thenReturn(Optional.empty());

        when(appUserRepository.findByEmail("auditor@example.com"))
                .thenReturn(Optional.empty());

        initializer.run(applicationArguments);

        ArgumentCaptor<AppUser> captor =
                ArgumentCaptor.forClass(AppUser.class);

        verify(appUserRepository, org.mockito.Mockito.times(2))
                .saveAndFlush(captor.capture());

        var createdUsers = captor.getAllValues();

        AppUser admin = createdUsers.get(0);
        AppUser auditor = createdUsers.get(1);

        assertEquals(Role.ADMIN, admin.getRole());
        assertEquals(Role.AUDITOR, auditor.getRole());

        assertEquals("admin@example.com", admin.getEmail());
        assertEquals("auditor@example.com", auditor.getEmail());

        assertTrue(passwordEncoder.matches(
                "AdminPassword123",
                admin.getPassword()
        ));

        assertTrue(passwordEncoder.matches(
                "AuditorPassword123",
                auditor.getPassword()
        ));

        assertFalse(admin.getPassword().equals("AdminPassword123"));
        assertFalse(auditor.getPassword().equals("AuditorPassword123"));
    }

    @Test
    void shouldNotModifyExistingAccountsWithCorrectRoles() {

        configureValidSettings();

        AppUser existingAdmin = new AppUser(
                "Existing Admin",
                "admin@example.com",
                "existing-admin-hash",
                Role.ADMIN
        );

        AppUser existingAuditor = new AppUser(
                "Existing Auditor",
                "auditor@example.com",
                "existing-auditor-hash",
                Role.AUDITOR
        );

        when(appUserRepository.findByEmail("admin@example.com"))
                .thenReturn(Optional.of(existingAdmin));

        when(appUserRepository.findByEmail("auditor@example.com"))
                .thenReturn(Optional.of(existingAuditor));

        initializer.run(applicationArguments);

        verify(appUserRepository, never()).saveAndFlush(any());

        assertEquals("existing-admin-hash", existingAdmin.getPassword());
        assertEquals("existing-auditor-hash", existingAuditor.getPassword());
    }

    @Test
    void shouldFailWhenExistingAccountHasConflictingRole() {

        configureValidSettings();

        AppUser conflictingUser = new AppUser(
                "Normal User",
                "admin@example.com",
                "existing-password-hash",
                Role.ACCOUNT_HOLDER
        );

        when(appUserRepository.findByEmail("admin@example.com"))
                .thenReturn(Optional.of(conflictingUser));

        assertThrows(
                IllegalStateException.class,
                () -> initializer.run(applicationArguments)
        );

        verify(appUserRepository, never()).saveAndFlush(any());
    }

    private void configureValidSettings() {

        when(environment.getProperty("LEDGERLINE_ADMIN_NAME"))
                .thenReturn("Admin User");

        when(environment.getProperty("LEDGERLINE_ADMIN_EMAIL"))
                .thenReturn("admin@example.com");

        when(environment.getProperty("LEDGERLINE_ADMIN_PASSWORD"))
                .thenReturn("AdminPassword123");

        when(environment.getProperty("LEDGERLINE_AUDITOR_NAME"))
                .thenReturn("Auditor User");

        when(environment.getProperty("LEDGERLINE_AUDITOR_EMAIL"))
                .thenReturn("auditor@example.com");

        when(environment.getProperty("LEDGERLINE_AUDITOR_PASSWORD"))
                .thenReturn("AuditorPassword123");
    }
}
