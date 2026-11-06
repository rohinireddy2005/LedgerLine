
package com.ledgerline.ledgerline.controller;

import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class HealthController {

    @GetMapping("/health")
    public Map<String, String> healthCheck() {
        return Map.of(
            "application", "LedgerLine",
            "status", "UP",
            "message", "LedgerLine backend is running successfully"
        );
    }
}

