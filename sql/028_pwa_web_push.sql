-- PWA Web Push subscriptions. Does not modify existing school/student/result tables.
create table if not exists public.qlnn_push_subscriptions (
  id bigserial primary key,
  account_id text not null,
  role text not null check (role in ('staff','parent','student')),
  endpoint text not null unique,
  subscription jsonb not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_success_at timestamptz,
  last_error text
);
create index if not exists qlnn_push_subscriptions_account_role_idx on public.qlnn_push_subscriptions(account_id, role);
alter table public.qlnn_push_subscriptions enable row level security;
revoke all on public.qlnn_push_subscriptions from anon, authenticated;

create or replace function public.qlnn_register_push_subscription(
  p_ma_tai_khoan text,
  p_mat_khau text,
  p_vai_tro text,
  p_subscription jsonb,
  p_user_agent text default null
) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare v_ok boolean := false; v_endpoint text;
begin
  if coalesce(trim(p_ma_tai_khoan),'')='' or coalesce(p_mat_khau,'')='' then
    return jsonb_build_object('ok',false,'message','Thiếu thông tin tài khoản.');
  end if;
  if p_subscription is null or coalesce(p_subscription->>'endpoint','')='' or p_subscription->'keys' is null then
    return jsonb_build_object('ok',false,'message','Thông tin đăng ký thiết bị không hợp lệ.');
  end if;
  if p_vai_tro='staff' then
    select exists(select 1 from public.can_bo c where c.ma_cb=p_ma_tai_khoan and c.mat_khau=p_mat_khau and coalesce(c.trang_thai,true)=true) into v_ok;
  elsif p_vai_tro in ('parent','student') then
    select exists(select 1 from public.danh_sach d where d.ma_hs=p_ma_tai_khoan and d.mat_khau=p_mat_khau and lower(coalesce(d.trang_thai,'active')) not in ('inactive','locked','khóa','khoa','nghỉ học','nghi hoc')) into v_ok;
  else
    return jsonb_build_object('ok',false,'message','Vai trò không hợp lệ.');
  end if;
  if not v_ok then return jsonb_build_object('ok',false,'message','Không xác thực được tài khoản để đăng ký thiết bị. Hãy đăng nhập lại.'); end if;
  v_endpoint := p_subscription->>'endpoint';
  insert into public.qlnn_push_subscriptions(account_id,role,endpoint,subscription,user_agent,updated_at,last_error)
  values (p_ma_tai_khoan,p_vai_tro,v_endpoint,p_subscription,left(p_user_agent,500),now(),null)
  on conflict(endpoint) do update set account_id=excluded.account_id, role=excluded.role, subscription=excluded.subscription, user_agent=excluded.user_agent, updated_at=now(), last_error=null;
  return jsonb_build_object('ok',true,'message','Đã đăng ký thiết bị nhận thông báo.');
end; $$;
revoke all on function public.qlnn_register_push_subscription(text,text,text,jsonb,text) from public;
grant execute on function public.qlnn_register_push_subscription(text,text,text,jsonb,text) to anon, authenticated;
