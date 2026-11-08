
package com.ledgerline.ledgerline.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import com.ledgerline.ledgerline.entity.Role;
import com.ledgerline.ledgerline.repository.AppUserRepository;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class RegistrationSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private AppUserRepository appUserRepository;

    @Test
    void publicRegistrationShouldCreateAccountHolder() throws Exception {

        String email = "registration-" + UUID.randomUUID()
                + "@example.com";

        mockMvc.perform(
                post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                    "fullName": "Registration Test",
                                    "email": "%s",
                                    "password": "SecurePassword123"
                                }
                                """.formatted(email))
        )
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.email").value(email))
        .andExpect(jsonPath("$.role").value("ACCOUNT_HOLDER"));

        var savedUser = appUserRepository.findByEmail(email);

        assertTrue(savedUser.isPresent());
        assertEquals(Role.ACCOUNT_HOLDER, savedUser.get().getRole());
    }

    @Test
    void duplicateRegistrationShouldReturnConflict() throws Exception {

        String email = "duplicate-" + UUID.randomUUID()
                + "@example.com";

        String firstRequest = """
                {
                    "fullName": "Duplicate Test",
                    "email": "%s",
                    "password": "SecurePassword123"
                }
                """.formatted(email);

        String duplicateRequest = """
                {
                    "fullName": "Duplicate Test",
                    "email": "%s",
                    "password": "SecurePassword123"
                }
                """.formatted(email.toUpperCase());

        mockMvc.perform(
                post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(firstRequest)
        )
        .andExpect(status().isCreated());

        mockMvc.perform(
                post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(duplicateRequest)
        )
        .andExpect(status().isConflict());

        assertTrue(appUserRepository.findByEmail(email).isPresent());
        assertTrue(appUserRepository.findByEmail(email.toUpperCase()).isEmpty());
    }
}
