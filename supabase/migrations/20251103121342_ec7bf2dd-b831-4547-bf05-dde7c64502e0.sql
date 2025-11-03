-- Fix 1: Update truck_status trigger to validate ownership
CREATE OR REPLACE FUNCTION public.update_truck_status()
RETURNS TRIGGER AS $$
DECLARE
  truck_owner_id uuid;
BEGIN
  -- When truck is assigned to a load, mark it as busy
  IF NEW.truck_id IS NOT NULL AND (OLD.truck_id IS NULL OR OLD.truck_id != NEW.truck_id) THEN
    -- CRITICAL: Verify truck belongs to same user as load
    SELECT user_id INTO truck_owner_id FROM trucks WHERE id = NEW.truck_id;
    
    IF truck_owner_id IS NULL THEN
      RAISE EXCEPTION 'Truck not found';
    END IF;
    
    IF truck_owner_id != NEW.user_id THEN
      RAISE EXCEPTION 'Cannot assign truck from different user';
    END IF;
    
    UPDATE trucks SET is_active = false WHERE id = NEW.truck_id;
  END IF;
  
  -- When load is completed, make truck active again
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') AND NEW.truck_id IS NOT NULL THEN
    -- Verify ownership before updating
    SELECT user_id INTO truck_owner_id FROM trucks WHERE id = NEW.truck_id;
    
    IF truck_owner_id IS NULL THEN
      RAISE EXCEPTION 'Truck not found';
    END IF;
    
    IF truck_owner_id != NEW.user_id THEN
      RAISE EXCEPTION 'Cannot update truck from different user';
    END IF;
    
    UPDATE trucks SET is_active = true WHERE id = NEW.truck_id;
  END IF;
  
  -- If truck is unassigned from a load, make it active
  IF OLD.truck_id IS NOT NULL AND NEW.truck_id IS NULL THEN
    SELECT user_id INTO truck_owner_id FROM trucks WHERE id = OLD.truck_id;
    
    IF truck_owner_id IS NOT NULL AND truck_owner_id = OLD.user_id THEN
      UPDATE trucks SET is_active = true WHERE id = OLD.truck_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- Fix 2: Drop the security definer view (unused and insecure)
DROP VIEW IF EXISTS load_payment_summary;

-- Fix 3: Add database constraints for defense in depth (using DO blocks to avoid errors if they exist)
DO $$ 
BEGIN
  ALTER TABLE loads ADD CONSTRAINT check_positive_freight CHECK (freight_amount > 0);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
  ALTER TABLE loads ADD CONSTRAINT check_positive_truck_freight CHECK (truck_freight_amount IS NULL OR truck_freight_amount > 0);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
  ALTER TABLE loads ADD CONSTRAINT check_weight_positive CHECK (material_weight > 0);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
  ALTER TABLE trucks ADD CONSTRAINT check_positive_capacity CHECK (carrying_capacity > 0 AND carrying_capacity <= 1000);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
  ALTER TABLE trucks ADD CONSTRAINT check_positive_length CHECK (truck_length > 0 AND truck_length <= 100);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
  ALTER TABLE transactions ADD CONSTRAINT check_amount_reasonable CHECK (amount > 0 AND amount <= 100000000);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;