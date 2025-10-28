-- Add contact person fields to trucks table
ALTER TABLE public.trucks
ADD COLUMN contact_person TEXT,
ADD COLUMN contact_person_phone TEXT;

-- Add payment direction to transactions to differentiate received vs paid
ALTER TABLE public.transactions
ADD COLUMN payment_direction TEXT NOT NULL DEFAULT 'received' CHECK (payment_direction IN ('received', 'paid')),
ADD COLUMN party_name TEXT;

-- Add index for better query performance on transactions
CREATE INDEX idx_transactions_user_date ON public.transactions(user_id, transaction_date DESC);
CREATE INDEX idx_transactions_load ON public.transactions(load_id);

COMMENT ON COLUMN public.trucks.contact_person IS 'Third party contact person responsible for the truck';
COMMENT ON COLUMN public.trucks.contact_person_phone IS 'Contact person phone number';
COMMENT ON COLUMN public.transactions.payment_direction IS 'Direction of payment: received (from load provider) or paid (to driver/contact)';
COMMENT ON COLUMN public.transactions.party_name IS 'Name of party involved in transaction (driver name or load provider name)';