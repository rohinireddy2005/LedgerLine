
package com.ledgerline.ledgerline.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.ledgerline.ledgerline.entity.AccountStatusAudit;

@Repository
public interface AccountStatusAuditRepository
        extends JpaRepository<AccountStatusAudit, Long> {

    Page<AccountStatusAudit> findAllByOrderByCreatedAtDescIdDesc(
            Pageable pageable
    );

    Page<AccountStatusAudit> findByAccountIdOrderByCreatedAtDescIdDesc(
            Long accountId,
            Pageable pageable
    );
}
