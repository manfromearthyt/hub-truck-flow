-- Add truck active status tracking
ALTER TABLE trucks ADD COLUMN is_active BOOLEAN DEFAULT true;
CREATE INDEX idx_trucks_active ON trucks(user_id, is_active);

-- Add dual freight amounts to loads table for profit calculation
ALTER TABLE loads ADD COLUMN truck_freight_amount NUMERIC;
ALTER TABLE loads ADD COLUMN profit_amount NUMERIC GENERATED ALWAYS AS (freight_amount - COALESCE(truck_freight_amount, 0)) STORED;

-- Add payment sequence tracking to transactions (notes already exists)
ALTER TABLE transactions ADD COLUMN payment_sequence INTEGER;

-- Add constraint to ensure truck freight doesn't exceed provider freight
ALTER TABLE loads ADD CONSTRAINT check_freight_amounts 
  CHECK (truck_freight_amount IS NULL OR truck_freight_amount <= freight_amount);

-- Add constraint for positive payment amounts
ALTER TABLE transactions ADD CONSTRAINT check_positive_amount 
  CHECK (amount > 0);

-- Create function to automatically update truck status based on load assignments
CREATE OR REPLACE FUNCTION public.update_truck_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- When truck is assigned to a load, mark it as busy
  IF NEW.truck_id IS NOT NULL AND (OLD.truck_id IS NULL OR OLD.truck_id != NEW.truck_id) THEN
    UPDATE trucks SET is_active = false WHERE id = NEW.truck_id;
  END IF;
  
  -- When load is completed, make truck active again
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') AND NEW.truck_id IS NOT NULL THEN
    UPDATE trucks SET is_active = true WHERE id = NEW.truck_id;
  END IF;
  
  -- If truck is unassigned from a load, make it active
  IF OLD.truck_id IS NOT NULL AND NEW.truck_id IS NULL THEN
    UPDATE trucks SET is_active = true WHERE id = OLD.truck_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Attach trigger to loads table
CREATE TRIGGER truck_status_automation
AFTER INSERT OR UPDATE ON loads
FOR EACH ROW
EXECUTE FUNCTION update_truck_status();

-- Create view for quick payment summary lookups
CREATE VIEW load_payment_summary AS
SELECT 
  l.id as load_id,
  l.freight_amount as provider_freight,
  l.truck_freight_amount as truck_freight,
  l.profit_amount as expected_profit,
  COALESCE(SUM(CASE WHEN t.payment_direction = 'received' THEN t.amount ELSE 0 END), 0) as total_received_from_provider,
  COALESCE(SUM(CASE WHEN t.payment_direction = 'paid' THEN t.amount ELSE 0 END), 0) as total_paid_to_driver,
  l.freight_amount - COALESCE(SUM(CASE WHEN t.payment_direction = 'received' THEN t.amount ELSE 0 END), 0) as balance_to_receive,
  COALESCE(l.truck_freight_amount, 0) - COALESCE(SUM(CASE WHEN t.payment_direction = 'paid' THEN t.amount ELSE 0 END), 0) as balance_to_pay,
  COALESCE(SUM(CASE WHEN t.payment_direction = 'received' THEN t.amount ELSE 0 END), 0) - COALESCE(SUM(CASE WHEN t.payment_direction = 'paid' THEN t.amount ELSE 0 END), 0) as current_profit
FROM loads l
LEFT JOIN transactions t ON l.id = t.load_id
GROUP BY l.id, l.freight_amount, l.truck_freight_amount, l.profit_amount;