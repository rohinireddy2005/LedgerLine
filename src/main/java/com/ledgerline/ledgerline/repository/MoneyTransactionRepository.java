package com.ledgerline.ledgerline.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.ledgerline.ledgerline.entity.MoneyTransaction;

@Repository
public interface MoneyTransactionRepository
        extends JpaRepository<MoneyTransaction, Long> {

    Optional<MoneyTransaction> findByInitiatorIdAndIdempotencyKey(
            Long initiatorId,
            String idempotencyKey
    );

    List<MoneyTransaction>
    findBySourceAccountIdOrDestinationAccountIdOrderByCreatedAtDesc(
            Long sourceAccountId,
            Long destinationAccountId
    );

    Page<MoneyTransaction> findAllByOrderByCreatedAtDescIdDesc(
            Pageable pageable
    );
}