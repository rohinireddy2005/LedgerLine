
package com.ledgerline.ledgerline.controller;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.ledgerline.ledgerline.dto.AuditAccountResponse;
import com.ledgerline.ledgerline.dto.AuditLedgerEntryResponse;
import com.ledgerline.ledgerline.dto.AuditTransactionResponse;
import com.ledgerline.ledgerline.service.AuditorService;

@RestController
@RequestMapping("/api/auditor")
public class AuditorController {

    private static final int MAX_PAGE_SIZE = 100;

    private final AuditorService auditorService;

    public AuditorController(AuditorService auditorService) {
        this.auditorService = auditorService;
    }

    @GetMapping("/transactions")
    public ResponseEntity<Page<AuditTransactionResponse>>
            getAllTransactions(
                    @RequestParam(defaultValue = "0") int page,
                    @RequestParam(defaultValue = "20") int size) {

        Pageable pageable = createPageable(page, size);

        return ResponseEntity.ok(
                auditorService.getAllTransactions(pageable)
        );
    }

    @GetMapping("/accounts")
    public ResponseEntity<Page<AuditAccountResponse>>
            getAllAccounts(
                    @RequestParam(defaultValue = "0") int page,
                    @RequestParam(defaultValue = "20") int size) {

        Pageable pageable = createPageable(page, size);

        return ResponseEntity.ok(
                auditorService.getAllAccounts(pageable)
        );
    }

    @GetMapping("/ledger/{accountId}")
    public ResponseEntity<Page<AuditLedgerEntryResponse>>
            getAccountLedger(
                    @PathVariable Long accountId,
                    @RequestParam(defaultValue = "0") int page,
                    @RequestParam(defaultValue = "20") int size) {

        Pageable pageable = createPageable(page, size);

        return ResponseEntity.ok(
                auditorService.getAccountLedger(accountId, pageable)
        );
    }

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
