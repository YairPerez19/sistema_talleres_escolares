CREATE TABLE public.verification_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code_hash text NOT NULL,
  email text NOT NULL,
  expires_at timestamptz NOT NULL,
  attempts int DEFAULT 0,
  used boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.verification_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only - verification_codes"
  ON public.verification_codes
  FOR ALL
  USING (true)
  WITH CHECK (true);
