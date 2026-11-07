
package com.ledgerline.ledgerline.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import org.springframework.stereotype.Repository;

import jakarta.persistence.LockModeType;

import com.ledgerline.ledgerline.entity.Account;

@Repository
public interface AccountRepository extends JpaRepository<Account, Long> {

    List<Account> findAllByOwnerId(Long ownerId);

    Optional<Account> findByAccountNumber(String accountNumber);

    Optional<Account> findByIdAndOwnerId(Long id, Long ownerId);

    boolean existsByAccountNumber(String accountNumber);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT a FROM Account a WHERE a.id = :accountId")
    Optional<Account> findByIdForUpdate(
            @Param("accountId") Long accountId
    );

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT a FROM Account a WHERE a.id = :accountId AND a.owner.id = :ownerId")
    Optional<Account> findByIdAndOwnerIdForUpdate(
            @Param("accountId") Long accountId,
            @Param("ownerId") Long ownerId
    );
}
