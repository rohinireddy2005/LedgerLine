-- LedgerLine: Financial Database Integrity Protections
-- PostgreSQL database
-- Execute after Hibernate creates the database tables.

-- 1. Prevent negative account balances.
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

-- 2. Require positive transaction amounts.
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

-- 3. Require positive ledger amounts.
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

-- 4. Prevent negative resulting ledger balances.
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

-- 5. Create function to prevent ledger modification.
CREATE OR REPLACE FUNCTION prevent_ledger_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION
        'Ledger entries are immutable. UPDATE and DELETE are not allowed.';
END;
$$ LANGUAGE plpgsql;

-- 6. Create append-only ledger trigger.
DROP TRIGGER IF EXISTS trg_prevent_ledger_modification
ON ledger_entries;

CREATE TRIGGER trg_prevent_ledger_modification
BEFORE UPDATE OR DELETE
ON ledger_entries
FOR EACH ROW
EXECUTE FUNCTION prevent_ledger_modification();