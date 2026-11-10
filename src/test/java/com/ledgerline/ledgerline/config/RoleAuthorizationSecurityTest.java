
package com.ledgerline.ledgerline.config;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.UUID;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import com.ledgerline.ledgerline.entity.AppUser;
import com.ledgerline.ledgerline.entity.Role;
import com.ledgerline.ledgerline.repository.AppUserRepository;
import com.ledgerline.ledgerline.security.CustomUserDetailsService;
import com.ledgerline.ledgerline.security.JwtService;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class RoleAuthorizationSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private AppUserRepository appUserRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private CustomUserDetailsService userDetailsService;

    @Autowired
    private JwtService jwtService;

    private AppUser accountHolder;
    private AppUser admin;
    private AppUser auditor;

    private String accountHolderToken;
    private String adminToken;
    private String auditorToken;

    @BeforeEach
    void setUp() {

        String suffix = UUID.randomUUID().toString();

        String encodedPassword =
                passwordEncoder.encode("TestPassword123");

        accountHolder = appUserRepository.save(
                new AppUser(
                        "Test Account Holder",
                        "holder-" + suffix + "@example.com",
                        encodedPassword,
                        Role.ACCOUNT_HOLDER
                )
        );

        admin = appUserRepository.save(
                new AppUser(
                        "Test Admin",
                        "admin-" + suffix + "@example.com",
                        encodedPassword,
                        Role.ADMIN
                )
        );

        auditor = appUserRepository.save(
                new AppUser(
                        "Test Auditor",
                        "auditor-" + suffix + "@example.com",
                        encodedPassword,
                        Role.AUDITOR
                )
        );

        accountHolderToken = generateToken(accountHolder);
        adminToken = generateToken(admin);
        auditorToken = generateToken(auditor);
    }

    private String generateToken(AppUser user) {

        return jwtService.generateToken(
                userDetailsService.loadUserByUsername(user.getEmail())
        );
    }

    @AfterEach
    void cleanUp() {

        if (accountHolder != null) {
            appUserRepository.delete(accountHolder);
        }

        if (admin != null) {
            appUserRepository.delete(admin);
        }

        if (auditor != null) {
            appUserRepository.delete(auditor);
        }
    }

    // --------------------------------------------------
    // ACCOUNT HOLDER AUTHORIZATION
    // --------------------------------------------------

    @Test
    void accountHolderShouldAccessAccountHolderApi() throws Exception {

        mockMvc.perform(
                get("/api/accounts")
                        .header(
                                "Authorization",
                                "Bearer " + accountHolderToken
                        )
        ).andExpect(status().isOk());
    }

    @Test
    void adminShouldNotAccessAccountHolderApi() throws Exception {

        mockMvc.perform(
                get("/api/accounts")
                        .header(
                                "Authorization",
                                "Bearer " + adminToken
                        )
        ).andExpect(status().isForbidden());
    }

    @Test
    void auditorShouldNotAccessAccountHolderApi() throws Exception {

        mockMvc.perform(
                get("/api/accounts")
                        .header(
                                "Authorization",
                                "Bearer " + auditorToken
                        )
        ).andExpect(status().isForbidden());
    }

    // --------------------------------------------------
    // AUDITOR AUTHORIZATION
    // --------------------------------------------------

    @Test
    void auditorShouldAccessTransactionAuditApi() throws Exception {

        mockMvc.perform(
                get("/api/auditor/transactions")
                        .header(
                                "Authorization",
                                "Bearer " + auditorToken
                        )
        ).andExpect(status().isOk());
    }

    @Test
    void auditorShouldAccessAccountAuditApi() throws Exception {

        mockMvc.perform(
                get("/api/auditor/accounts")
                        .header(
                                "Authorization",
                                "Bearer " + auditorToken
                        )
        ).andExpect(status().isOk());
    }

    @Test
    void auditorShouldReachLedgerAuditService() throws Exception {

        mockMvc.perform(
                get("/api/auditor/ledger/999999999")
                        .header(
                                "Authorization",
                                "Bearer " + auditorToken
                        )
        ).andExpect(status().isNotFound());
    }

    @Test
    void adminShouldNotAccessAuditorApi() throws Exception {

        mockMvc.perform(
                get("/api/auditor/transactions")
                        .header(
                                "Authorization",
                                "Bearer " + adminToken
                        )
        ).andExpect(status().isForbidden());
    }

    @Test
    void accountHolderShouldNotAccessAuditorApi() throws Exception {

        mockMvc.perform(
                get("/api/auditor/transactions")
                        .header(
                                "Authorization",
                                "Bearer " + accountHolderToken
                        )
        ).andExpect(status().isForbidden());
    }

    @Test
    void unauthenticatedUserShouldNotAccessAuditorApi() throws Exception {

        mockMvc.perform(
                get("/api/auditor/transactions")
        ).andExpect(status().isUnauthorized());
    }

    @Test
    void negativePageNumberShouldReturnBadRequest() throws Exception {

        mockMvc.perform(
                get("/api/auditor/transactions")
                        .param("page", "-1")
                        .header(
                                "Authorization",
                                "Bearer " + auditorToken
                        )
        ).andExpect(status().isBadRequest());
    }

    @Test
    void zeroPageSizeShouldReturnBadRequest() throws Exception {

        mockMvc.perform(
                get("/api/auditor/accounts")
                        .param("size", "0")
                        .header(
                                "Authorization",
                                "Bearer " + auditorToken
                        )
        ).andExpect(status().isBadRequest());
    }

    @Test
    void pageSizeAboveMaximumShouldReturnBadRequest() throws Exception {

        mockMvc.perform(
                get("/api/auditor/transactions")
                        .param("size", "101")
                        .header(
                                "Authorization",
                                "Bearer " + auditorToken
                        )
        ).andExpect(status().isBadRequest());
    }

    // --------------------------------------------------
    // ADMIN AUTHORIZATION
    // --------------------------------------------------

    @Test
    void adminShouldAccessUserManagementApi() throws Exception {

        mockMvc.perform(
                get("/api/admin/users")
                        .header(
                                "Authorization",
                                "Bearer " + adminToken
                        )
        ).andExpect(status().isOk());
    }

    @Test
    void adminShouldAccessAccountManagementApi() throws Exception {

        mockMvc.perform(
                get("/api/admin/accounts")
                        .header(
                                "Authorization",
                                "Bearer " + adminToken
                        )
        ).andExpect(status().isOk());
    }

    @Test
    void adminShouldAccessAdministrativeAuditApi() throws Exception {

        mockMvc.perform(
                get("/api/admin/audits")
                        .header(
                                "Authorization",
                                "Bearer " + adminToken
                        )
        ).andExpect(status().isOk());
    }

    @Test
    void accountHolderShouldNotAccessAdminApi() throws Exception {

        mockMvc.perform(
                get("/api/admin/users")
                        .header(
                                "Authorization",
                                "Bearer " + accountHolderToken
                        )
        ).andExpect(status().isForbidden());
    }

    @Test
    void auditorShouldNotAccessAdminApi() throws Exception {

        mockMvc.perform(
                get("/api/admin/users")
                        .header(
                                "Authorization",
                                "Bearer " + auditorToken
                        )
        ).andExpect(status().isForbidden());
    }

    @Test
    void unauthenticatedUserShouldNotAccessAdminApi() throws Exception {

        mockMvc.perform(
                get("/api/admin/users")
        ).andExpect(status().isUnauthorized());
    }
}
