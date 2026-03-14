-- Add phone_number and pin_code columns to users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS phone_number TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS pin_code TEXT;

-- Update RLS to allow managers/admins to see phone numbers, but users can only see their own
-- (Actually, we probably want existing RLS which allows SELECT for authenticated users to remain, 
-- but we might want to ensure only admins can UPDATE phone numbers of others).
-- For now, the schema change is sufficient as RLS is handled elsewhere.
