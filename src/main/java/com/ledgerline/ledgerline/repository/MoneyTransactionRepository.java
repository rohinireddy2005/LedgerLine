package com.ledgerline.ledgerline.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
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

    @Query("""
            SELECT DISTINCT t FROM MoneyTransaction t
            LEFT JOIN t.sourceAccount sa
            LEFT JOIN t.destinationAccount da
            WHERE t.initiator.id = :userId
               OR (sa IS NOT NULL AND sa.owner.id = :userId)
               OR (da IS NOT NULL AND da.owner.id = :userId)
            ORDER BY t.createdAt DESC, t.id DESC
            """)
    List<MoneyTransaction> findAllByUserId(
            @Param("userId") Long userId
    );
}
