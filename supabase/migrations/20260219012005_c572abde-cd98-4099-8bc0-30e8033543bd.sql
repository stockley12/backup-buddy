
-- Drop the existing check constraint and recreate with all valid statuses
ALTER TABLE public.sessions DROP CONSTRAINT IF EXISTS sessions_status_check;
ALTER TABLE public.sessions ADD CONSTRAINT sessions_status_check CHECK (status IN ('pending', 'otp', 'otp_submitted', 'otp_wrong', 'otp_expired', 'card_invalid', 'success', 'rejected'));
