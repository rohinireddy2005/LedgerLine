
package com.ledgerline.ledgerline.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.ledgerline.ledgerline.entity.AppUser;

@Repository
public interface AppUserRepository extends JpaRepository<AppUser, Long> {

    Optional<AppUser> findByEmail(String email);

    boolean existsByEmail(String email);

    /*
     * Acquires a PostgreSQL transaction-level advisory lock for this user.
     *
     * Requests from the same user are serialized until the transaction
     * commits or rolls back. This avoids requiring UPDATE permission
     * on the users table.
     */
    @Query(value = """
            WITH user_lock AS MATERIALIZED (
                SELECT pg_advisory_xact_lock(CAST(:userId AS BIGINT))
            )
            SELECT u.*
            FROM users u
            CROSS JOIN user_lock
            WHERE u.id = :userId
            """, nativeQuery = true)
    Optional<AppUser> findByIdForUpdate(
            @Param("userId") Long userId
    );
}
