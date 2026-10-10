-- V3.0.5.25.24: thêm môn Tin học và cấp lại mật khẩu tài khoản phụ huynh/học sinh bởi GVCN.
-- Chạy trên Supabase SQL Editor sau migration 021.

alter table public.ket_qua_kiem_tra drop constraint if exists ket_qua_kiem_tra_mon_check;
alter table public.ket_qua_kiem_tra add constraint ket_qua_kiem_tra_mon_check
 check (mon in ('Toán','Văn','Tiếng Anh','Vật lý','Hoá học','Sinh học','Lịch Sử','Địa lý','GD KTPL','Tin học'));

create or replace function public.login_hoc_sinh(p_ma_hs text,p_mat_khau text,p_vai_tro text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare s public.danh_sach%rowtype;
begin
 if p_vai_tro not in ('parent','student') then return null; end if;
 select * into s from public.danh_sach d
 where btrim(d.ma_hs)=btrim(p_ma_hs)
   and btrim(coalesce(d.mat_khau,''))=btrim(coalesce(p_mat_khau,''))
   and (d.trang_thai is null or lower(btrim(d.trang_thai)) not in ('inactive','nghi hoc','đã nghỉ','false','0','nghỉ học'))
 limit 1;
 if not found then return null; end if;
 return jsonb_build_object('ma_hs',s.ma_hs,'ho_ten',s.ho_ten,'khoi',s.khoi,'lop',s.lop,'nam_hoc',s.nam_hoc);
end $$;
grant execute on function public.login_hoc_sinh(text,text,text) to anon,authenticated;

create or replace function public.gvcn_lay_hoc_sinh_reset_mat_khau(p_ma_cb text,p_mat_khau text,p_lop text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare c public.can_bo%rowtype; r jsonb;
begin
 select * into c from public.can_bo where btrim(ma_cb)=btrim(p_ma_cb) and coalesce(mat_khau,'')=coalesce(p_mat_khau,'') and coalesce(trang_thai,true)=true;
 if not found or not (lower(coalesce(c.vai_tro,'')) in ('gvcn','giáo viên chủ nhiệm') or coalesce(c.vai_tro_list,'{}'::text[]) @> array['GVCN']::text[]) or btrim(coalesce(c.lop_quan_ly,''))<>btrim(coalesce(p_lop,'')) then
  return jsonb_build_object('ok',false,'message','Tài khoản không có quyền chủ nhiệm lớp này.','rows','[]'::jsonb);
 end if;
 select coalesce(jsonb_agg(jsonb_build_object('ma_hs',d.ma_hs,'ho_ten',d.ho_ten,'lop',d.lop,'has_password',coalesce(btrim(d.mat_khau),'')<>'' ) order by d.ho_ten),'[]'::jsonb)
 into r from public.danh_sach d where btrim(d.lop)=btrim(p_lop) and (d.trang_thai is null or lower(btrim(d.trang_thai)) not in ('inactive','nghi hoc','đã nghỉ','false','0','nghỉ học'));
 return jsonb_build_object('ok',true,'rows',r);
end $$;

create or replace function public.gvcn_reset_mat_khau_phu_huynh(p_ma_cb text,p_mat_khau text,p_ma_hs text,p_lop text,p_mat_khau_moi text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare c public.can_bo%rowtype;
begin
 select * into c from public.can_bo where btrim(ma_cb)=btrim(p_ma_cb) and coalesce(mat_khau,'')=coalesce(p_mat_khau,'') and coalesce(trang_thai,true)=true;
 if not found or not (lower(coalesce(c.vai_tro,'')) in ('gvcn','giáo viên chủ nhiệm') or coalesce(c.vai_tro_list,'{}'::text[]) @> array['GVCN']::text[]) or btrim(coalesce(c.lop_quan_ly,''))<>btrim(coalesce(p_lop,'')) then
  return jsonb_build_object('ok',false,'message','Tài khoản không có quyền chủ nhiệm lớp này.');
 end if;
 if length(coalesce(p_mat_khau_moi,''))<6 then return jsonb_build_object('ok',false,'message','Mật khẩu mới phải có ít nhất 6 ký tự.'); end if;
 update public.danh_sach set mat_khau=p_mat_khau_moi where btrim(ma_hs)=btrim(p_ma_hs) and btrim(coalesce(lop,''))=btrim(p_lop);
 if not found then return jsonb_build_object('ok',false,'message','Không tìm thấy học sinh thuộc lớp chủ nhiệm.'); end if;
 return jsonb_build_object('ok',true);
end $$;
grant execute on function public.gvcn_lay_hoc_sinh_reset_mat_khau(text,text,text) to anon,authenticated;
grant execute on function public.gvcn_reset_mat_khau_phu_huynh(text,text,text,text,text) to anon,authenticated;

create or replace function public.admin_nhap_ket_qua(p_ma_cb text,p_mat_khau text,p_rows jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare item jsonb; n int:=0; hs text; monv text; diemv numeric; roundv text;
begin
 if not public.qlnn_xac_nhan_admin(p_ma_cb,p_mat_khau) then return jsonb_build_object('ok',false,'message','Chỉ quản trị hệ thống mới được đăng tải kết quả.'); end if;
 if jsonb_typeof(p_rows)<>'array' then return jsonb_build_object('ok',false,'message','Dữ liệu tải lên không hợp lệ.'); end if;
 for item in select * from jsonb_array_elements(p_rows) loop
  hs:=nullif(btrim(item->>'ma_hs'),''); monv:=btrim(item->>'mon'); roundv:=nullif(btrim(item->>'dot_kiem_tra'),''); diemv:=nullif(item->>'diem','')::numeric;
  if hs is null or roundv is null or monv not in ('Toán','Văn','Tiếng Anh','Vật lý','Hoá học','Sinh học','Lịch Sử','Địa lý','GD KTPL','Tin học') or diemv is null or diemv<0 or diemv>10 then continue; end if;
  if not exists(select 1 from public.danh_sach d where d.ma_hs=hs) then continue; end if;
  insert into public.ket_qua_kiem_tra(ma_hs,nam_hoc,dot_kiem_tra,loai_kiem_tra,mon,diem,ngay_kiem_tra,ghi_chu)
  values(hs,coalesce(nullif(item->>'nam_hoc',''),'2026-2027'),roundv,coalesce(nullif(item->>'loai_kiem_tra',''),'Định kỳ'),monv,diemv,nullif(item->>'ngay_kiem_tra','')::date,nullif(item->>'ghi_chu',''))
  on conflict(ma_hs,dot_kiem_tra,mon,nam_hoc) do update set loai_kiem_tra=excluded.loai_kiem_tra,diem=excluded.diem,ngay_kiem_tra=excluded.ngay_kiem_tra,ghi_chu=excluded.ghi_chu,updated_at=now(); n:=n+1;
 end loop;
 return jsonb_build_object('ok',true,'count',n);
exception when others then return jsonb_build_object('ok',false,'message','Lỗi nhập kết quả: '||sqlerrm);
end $$;
grant execute on function public.admin_nhap_ket_qua(text,text,jsonb) to anon,authenticated;
