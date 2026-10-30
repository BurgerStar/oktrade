DROP POLICY IF EXISTS "Anyone reads market overrides" ON public.market_overrides;

CREATE POLICY "Admins read market overrides"
ON public.market_overrides
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

REVOKE SELECT ON public.market_overrides FROM anon;

-- Public, minimal view of listing flags (no internal admin notes)
CREATE OR REPLACE FUNCTION public.public_market_flags()
RETURNS TABLE(symbol text, hidden boolean, featured boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT m.symbol, m.hidden, m.featured
  FROM public.market_overrides m
  WHERE m.hidden = true OR m.featured = true
$$;

REVOKE ALL ON FUNCTION public.public_market_flags() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_market_flags() TO anon, authenticated;