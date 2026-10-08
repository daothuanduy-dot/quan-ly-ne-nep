-- V3.0.5.14 - Login RPC hardened
-- Chạy trên đúng project Supabase của ứng dụng.
DROP FUNCTION IF EXISTS public.login_can_bo(text,text);
CREATE OR REPLACE FUNCTION public.login_can_bo(p_ma_cb text, p_mat_khau text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE v_result jsonb;
BEGIN
  SELECT to_jsonb(c) - 'mat_khau' INTO v_result
  FROM public.can_bo c
  WHERE trim(c.ma_cb) = trim(coalesce(p_ma_cb,''))
    AND trim(coalesce(c.mat_khau,'')) = trim(coalesce(p_mat_khau,''))
    AND coalesce(c.trang_thai,true) = true
  LIMIT 1;
  RETURN v_result;
END;
$$;
REVOKE ALL ON FUNCTION public.login_can_bo(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.login_can_bo(text,text) TO anon, authenticated;
NOTIFY pgrst, 'reload schema';
-- Test:
-- SELECT public.login_can_bo('3103016229','123456');
