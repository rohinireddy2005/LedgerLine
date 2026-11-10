
package com.ledgerline.ledgerline.config;

import java.util.List;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
@Profile("test")
public class FinancialIntegrityInitializer implements ApplicationRunner {

    private final JdbcTemplate jdbcTemplate;

    public FinancialIntegrityInitializer(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(ApplicationArguments args) {

        List<String> statements = List.of(

                """
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM pg_constraint
                        WHERE conname = 'chk_accounts_balance_nonnegative'
                          AND conrelid = 'public.accounts'::regclass
                    ) THEN
                        ALTER TABLE accounts
                        ADD CONSTRAINT chk_accounts_balance_nonnegative
                        CHECK (balance >= 0);
                    END IF;
                END $$;
                """,

                """
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM pg_constraint
                        WHERE conname = 'chk_money_transactions_amount_positive'
                          AND conrelid = 'public.money_transactions'::regclass
                    ) THEN
                        ALTER TABLE money_transactions
                        ADD CONSTRAINT chk_money_transactions_amount_positive
                        CHECK (amount > 0);
                    END IF;
                END $$;
                """,

                """
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM pg_constraint
                        WHERE conname = 'chk_ledger_entries_amount_positive'
                          AND conrelid = 'public.ledger_entries'::regclass
                    ) THEN
                        ALTER TABLE ledger_entries
                        ADD CONSTRAINT chk_ledger_entries_amount_positive
                        CHECK (amount > 0);
                    END IF;
                END $$;
                """,

                """
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM pg_constraint
                        WHERE conname = 'chk_ledger_entries_balance_nonnegative'
                          AND conrelid = 'public.ledger_entries'::regclass
                    ) THEN
                        ALTER TABLE ledger_entries
                        ADD CONSTRAINT chk_ledger_entries_balance_nonnegative
                        CHECK (balance_after >= 0);
                    END IF;
                END $$;
                """,

                """
                CREATE OR REPLACE FUNCTION prevent_ledger_modification()
                RETURNS TRIGGER AS $$
                BEGIN
                    RAISE EXCEPTION
                        'Ledger entries are immutable. UPDATE and DELETE are not allowed.';
                END;
                $$ LANGUAGE plpgsql;
                """,

                """
                DROP TRIGGER IF EXISTS trg_prevent_ledger_modification
                ON ledger_entries;
                """,

                """
                CREATE TRIGGER trg_prevent_ledger_modification
                BEFORE UPDATE OR DELETE ON ledger_entries
                FOR EACH ROW
                EXECUTE FUNCTION prevent_ledger_modification();
                """,

                """
                CREATE OR REPLACE FUNCTION prevent_account_status_audit_modification()
                RETURNS TRIGGER AS $$
                BEGIN
                    RAISE EXCEPTION
                        'Account status audit records are immutable. UPDATE and DELETE are not allowed.';
                END;
                $$ LANGUAGE plpgsql;
                """,

                """
                DROP TRIGGER IF EXISTS trg_prevent_account_status_audit_modification
                ON account_status_audits;
                """,

                """
                CREATE TRIGGER trg_prevent_account_status_audit_modification
                BEFORE UPDATE OR DELETE ON account_status_audits
                FOR EACH ROW
                EXECUTE FUNCTION prevent_account_status_audit_modification();
                """
        );

        for (String statement : statements) {
            jdbcTemplate.execute(statement);
        }
    }
}
