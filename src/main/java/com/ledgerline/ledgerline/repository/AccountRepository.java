
package com.ledgerline.ledgerline.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.ledgerline.ledgerline.entity.Account;

public interface AccountRepository extends JpaRepository<Account, Long> {

    List<Account> findAllByOwnerId(Long ownerId);

    Optional<Account> findByAccountNumber(String accountNumber);

    Optional<Account> findByIdAndOwnerId(Long id, Long ownerId);

    boolean existsByAccountNumber(String accountNumber);
}