
package com.ledgerline.ledgerline.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.ledgerline.ledgerline.entity.LedgerEntry;

@Repository
public interface LedgerEntryRepository
        extends JpaRepository<LedgerEntry, Long> {

    List<LedgerEntry> findByAccountIdOrderByCreatedAtAscIdAsc(
            Long accountId
    );

    List<LedgerEntry> findByTransactionId(Long transactionId);
}
