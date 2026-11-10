
package com.ledgerline.ledgerline.config;

import java.util.Arrays;
import java.util.List;
import java.util.Locale;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.env.Environment;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.ledgerline.ledgerline.entity.AppUser;
import com.ledgerline.ledgerline.entity.Role;
import com.ledgerline.ledgerline.repository.AppUserRepository;

@Component
public class RoleAccountInitializer implements ApplicationRunner {

    private final AppUserRepository appUserRepository;
    private final PasswordEncoder passwordEncoder;
    private final Environment environment;

    public RoleAccountInitializer(
            AppUserRepository appUserRepository,
            PasswordEncoder passwordEncoder,
            Environment environment) {

        this.appUserRepository = appUserRepository;
        this.passwordEncoder = passwordEncoder;
        this.environment = environment;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {

        String adminName = getSetting("LEDGERLINE_ADMIN_NAME");
        String adminEmail = getSetting("LEDGERLINE_ADMIN_EMAIL");
        String adminPassword = getSetting("LEDGERLINE_ADMIN_PASSWORD");

        String auditorName = getSetting("LEDGERLINE_AUDITOR_NAME");
        String auditorEmail = getSetting("LEDGERLINE_AUDITOR_EMAIL");
        String auditorPassword = getSetting("LEDGERLINE_AUDITOR_PASSWORD");

        List<String> settings = Arrays.asList(
                adminName,
                adminEmail,
                adminPassword,
                auditorName,
                auditorEmail,
                auditorPassword
        );

        boolean allMissing = settings.stream()
                .allMatch(value -> value == null || value.isBlank());

        if (allMissing) {
            return;
        }

        validateConfiguration(settings);

        initializeRoleAccount(
                adminName,
                adminEmail,
                adminPassword,
                Role.ADMIN
        );

        initializeRoleAccount(
                auditorName,
                auditorEmail,
                auditorPassword,
                Role.AUDITOR
        );
    }

    private String getSetting(String name) {
        return environment.getProperty(name);
    }

    private void validateConfiguration(List<String> settings) {

        if (settings.stream().anyMatch(
                value -> value == null || value.isBlank())) {

            throw new IllegalStateException(
                    "Role account initialization requires all six "
                    + "LEDGERLINE_ADMIN_* and LEDGERLINE_AUDITOR_* "
                    + "environment variables."
            );
        }

        String adminName = settings.get(0).trim();
        String adminEmail = settings.get(1).trim();
        String adminPassword = settings.get(2);

        String auditorName = settings.get(3).trim();
        String auditorEmail = settings.get(4).trim();
        String auditorPassword = settings.get(5);

        if (adminName.length() > 100
                || auditorName.length() > 100
                || adminEmail.length() > 254
                || auditorEmail.length() > 254
                || adminPassword.length() < 12
                || auditorPassword.length() < 12) {

            throw new IllegalStateException(
                    "Invalid role account configuration. "
                    + "Names must be at most 100 characters, "
                    + "emails at most 254 characters, and "
                    + "passwords at least 12 characters."
            );
        }

        if (adminEmail.equalsIgnoreCase(auditorEmail)) {
            throw new IllegalStateException(
                    "ADMIN and AUDITOR accounts must use different emails."
            );
        }
    }

    private void initializeRoleAccount(
            String fullName,
            String email,
            String rawPassword,
            Role role) {

        String normalizedEmail =
                email.trim().toLowerCase(Locale.ROOT);

        var existingUser =
                appUserRepository.findByEmail(normalizedEmail);

        if (existingUser.isPresent()) {

            if (existingUser.get().getRole() != role) {
                throw new IllegalStateException(
                        "An existing account has a conflicting role "
                        + "for a configured privileged email."
                );
            }

            return;
        }

        AppUser user = new AppUser(
                fullName.trim(),
                normalizedEmail,
                passwordEncoder.encode(rawPassword),
                role
        );

        appUserRepository.saveAndFlush(user);
    }
}
