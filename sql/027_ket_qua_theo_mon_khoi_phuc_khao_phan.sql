-- V3.0.5.25.30: kết quả nhập theo từng môn + khối; phúc khảo theo phần thi; minh chứng do Admin tải lên.
-- Chạy sau migration 026 trên đúng Supabase project.

alter table public.ket_qua_kiem_tra add column if not exists diem_trac_nghiem numeric(4,2);
alter table public.ket_qua_kiem_tra add column if not exists diem_tu_luan numeric(4,2);
alter table public.ket_qua_kiem_tra add column if not exists so_bao_danh text;
alter table public.phuc_khao_kiem_tra add column if not exists phan_kiem_tra text not null default 'Toàn bài';
alter table public.phuc_khao_kiem_tra add column if not exists anh_minh_chung_admin text;

-- Cho phép một bài thi có hai yêu cầu riêng: trắc nghiệm và tự luận.
do $$ declare c record; begin
 for c in select conname from pg_constraint c0
  where c0.conrelid='public.phuc_khao_kiem_tra'::regclass and c0.contype='u'
  and pg_get_constraintdef(c0.oid)='UNIQUE (ket_qua_id)'
 loop execute format('alter table public.phuc_khao_kiem_tra drop constraint %I',c.conname); end loop;
end $$;
create unique index if not exists uq_phuc_khao_ketqua_phan on public.phuc_khao_kiem_tra(ket_qua_id,phan_kiem_tra);

create or replace function public.admin_nhap_ket_qua_v2(p_ma_cb text,p_mat_khau text,p_dot text,p_mon text,p_khoi text,p_nam_hoc text,p_loai text,p_ngay date,p_rows jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare item jsonb; n int:=0; hs text; total numeric; tn numeric; tl numeric; sbd text; actual_grade text;
begin
 if not public.qlnn_xac_nhan_admin(p_ma_cb,p_mat_khau) then return jsonb_build_object('ok',false,'message','Chỉ Admin mới được đăng tải kết quả.'); end if;
 if nullif(btrim(p_dot),'') is null or p_mon not in ('Toán','Văn','Tiếng Anh','Vật lý','Hoá học','Sinh học','Lịch Sử','Địa lý','GD KTPL','Tin học') or p_khoi not in ('10','11','12','Khối 10','Khối 11','Khối 12') or jsonb_typeof(p_rows)<>'array' then return jsonb_build_object('ok',false,'message','Thông tin đợt, môn, khối hoặc tệp không hợp lệ.'); end if;
 for item in select * from jsonb_array_elements(p_rows) loop
  hs:=nullif(btrim(item->>'ma_hs'),'');
  if hs is null then continue; end if;
  select trim(regexp_replace(coalesce(d.khoi,''),'[^0-9]','','g')) into actual_grade from public.danh_sach d where btrim(d.ma_hs)=hs and (d.trang_thai is null or lower(btrim(d.trang_thai)) not in ('inactive','nghi hoc','đã nghỉ','false','0')) limit 1;
  if not found or actual_grade<>trim(regexp_replace(p_khoi,'[^0-9]','','g')) then continue; end if;
  total:=nullif(item->>'diem','')::numeric; tn:=nullif(item->>'diem_trac_nghiem','')::numeric; tl:=nullif(item->>'diem_tu_luan','')::numeric; sbd:=nullif(btrim(item->>'so_bao_danh'),'');
  if total is null or total<0 or total>10 or (tn is not null and (tn<0 or tn>10)) or (tl is not null and (tl<0 or tl>10)) then continue; end if;
  insert into public.ket_qua_kiem_tra(ma_hs,nam_hoc,dot_kiem_tra,loai_kiem_tra,mon,diem,diem_trac_nghiem,diem_tu_luan,so_bao_danh,ngay_kiem_tra,ghi_chu)
  values(hs,coalesce(nullif(p_nam_hoc,''),'2026-2027'),btrim(p_dot),coalesce(nullif(p_loai,''),'Định kỳ'),p_mon,total,tn,tl,sbd,p_ngay,nullif(btrim(item->>'ghi_chu'),''))
  on conflict(ma_hs,dot_kiem_tra,mon,nam_hoc) do update set loai_kiem_tra=excluded.loai_kiem_tra,diem=excluded.diem,diem_trac_nghiem=excluded.diem_trac_nghiem,diem_tu_luan=excluded.diem_tu_luan,so_bao_danh=excluded.so_bao_danh,ngay_kiem_tra=excluded.ngay_kiem_tra,ghi_chu=excluded.ghi_chu,updated_at=now(); n:=n+1;
 end loop;
 return jsonb_build_object('ok',true,'count',n,'received',jsonb_array_length(p_rows),'skipped',jsonb_array_length(p_rows)-n);
exception when others then return jsonb_build_object('ok',false,'message','Lỗi nhập kết quả: '||sqlerrm); end $$;

create or replace function public.portal_gui_phuc_khao_phan(p_ma_hs text,p_mat_khau text,p_ket_qua_id bigint,p_phan text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare s public.danh_sach%rowtype; q public.ket_qua_kiem_tra%rowtype; w public.thoi_gian_phuc_khao%rowtype; nid bigint;
begin
 select * into s from public.danh_sach d where btrim(d.ma_hs)=btrim(p_ma_hs) and btrim(coalesce(d.mat_khau,''))=btrim(coalesce(p_mat_khau,'')) and (d.trang_thai is null or lower(btrim(d.trang_thai)) not in ('inactive','nghi hoc','đã nghỉ','false','0')) limit 1;
 if not found then return jsonb_build_object('ok',false,'message','Tài khoản không hợp lệ.'); end if;
 if p_phan not in ('Trắc nghiệm','Tự luận') then return jsonb_build_object('ok',false,'message','Phần thi không hợp lệ.'); end if;
 select * into q from public.ket_qua_kiem_tra where id=p_ket_qua_id and ma_hs=s.ma_hs;
 if not found then return jsonb_build_object('ok',false,'message','Bài kiểm tra không thuộc tài khoản này.'); end if;
 if (p_phan='Trắc nghiệm' and q.diem_trac_nghiem is null) or (p_phan='Tự luận' and q.diem_tu_luan is null) then return jsonb_build_object('ok',false,'message','Bài thi này không có điểm ở phần đã chọn.'); end if;
 select * into w from public.thoi_gian_phuc_khao where nam_hoc=q.nam_hoc and dot_kiem_tra=q.dot_kiem_tra;
 if not found then return jsonb_build_object('ok',false,'message','Đợt kiểm tra chưa thiết lập thời hạn phúc khảo.'); end if;
 if now()<w.bat_dau then return jsonb_build_object('ok',false,'message','Chưa đến thời gian nhận phúc khảo.'); end if;
 if now()>w.ket_thuc then return jsonb_build_object('ok',false,'message','Đã hết hạn phúc khảo.'); end if;
 insert into public.phuc_khao_kiem_tra(ket_qua_id,ma_hs,ly_do,phan_kiem_tra) values(q.id,s.ma_hs,'Đề nghị phúc khảo phần '||p_phan,p_phan) returning id into nid;
 return jsonb_build_object('ok',true,'id',nid);
exception when unique_violation then return jsonb_build_object('ok',false,'message','Phần thi này đã được gửi phúc khảo.');
 when others then return jsonb_build_object('ok',false,'message','Không gửi được yêu cầu: '||sqlerrm); end $$;

create or replace function public.portal_lay_du_lieu_v3(p_ma_hs text,p_mat_khau text,p_doi_tuong text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare r jsonb; results jsonb; appeals jsonb;
begin
 if p_doi_tuong not in ('Học sinh','Phụ huynh') then return null; end if;
 r:=public.portal_lay_du_lieu_v2(p_ma_hs,p_mat_khau,p_doi_tuong); if r is null then return null; end if;
 select coalesce(jsonb_agg(to_jsonb(q)||jsonb_build_object('phuc_khao_tu',w.bat_dau,'phuc_khao_den',w.ket_thuc) order by q.dot_kiem_tra desc,q.mon),'[]'::jsonb) into results
 from public.ket_qua_kiem_tra q left join public.thoi_gian_phuc_khao w on w.nam_hoc=q.nam_hoc and w.dot_kiem_tra=q.dot_kiem_tra where q.ma_hs=btrim(p_ma_hs);
 select coalesce(jsonb_agg(to_jsonb(p)||jsonb_build_object('mon',q.mon,'dot_kiem_tra',q.dot_kiem_tra,'diem',q.diem,'diem_trac_nghiem',q.diem_trac_nghiem,'diem_tu_luan',q.diem_tu_luan,'ghi_chu_ket_qua',q.ghi_chu) order by p.created_at desc),'[]'::jsonb) into appeals from public.phuc_khao_kiem_tra p join public.ket_qua_kiem_tra q on q.id=p.ket_qua_id where p.ma_hs=btrim(p_ma_hs);
 r:=jsonb_set(r,'{ket_qua}',results,true); r:=jsonb_set(r,'{phuc_khao}',appeals,true); return r;
end $$;

create or replace function public.admin_lay_phuc_khao(p_ma_cb text,p_mat_khau text)
returns jsonb language plpgsql security definer set search_path=public as $$ declare r jsonb; begin
 if not public.qlnn_xac_nhan_admin(p_ma_cb,p_mat_khau) then return jsonb_build_object('ok',false,'message','Không có quyền quản trị.'); end if;
 select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]'::jsonb) into r from (
  select p.id,p.ket_qua_id,p.ma_hs,p.ly_do,p.phan_kiem_tra,p.trang_thai,p.phan_hoi,p.created_at,p.anh_minh_chung_admin,
  q.mon,q.dot_kiem_tra,q.diem,q.diem_trac_nghiem,q.diem_tu_luan,q.so_bao_danh,q.ghi_chu as ghi_chu_ket_qua,q.id as ket_result_id,d.ho_ten,d.lop,d.khoi
  from public.phuc_khao_kiem_tra p join public.ket_qua_kiem_tra q on q.id=p.ket_qua_id left join public.danh_sach d on d.ma_hs=p.ma_hs order by p.created_at desc limit 5000
 ) x;
 return jsonb_build_object('ok',true,'rows',r); end $$;

create or replace function public.admin_cap_nhat_phuc_khao_v3(p_ma_cb text,p_mat_khau text,p_id bigint,p_trang_thai text,p_phan_hoi text,p_diem_phan_moi numeric,p_diem_toan_bai_moi numeric,p_ghi_chu text,p_anh_minh_chung_admin text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare p public.phuc_khao_kiem_tra%rowtype; q public.ket_qua_kiem_tra%rowtype;
begin
 if not public.qlnn_xac_nhan_admin(p_ma_cb,p_mat_khau) then return jsonb_build_object('ok',false,'message','Không có quyền quản trị.'); end if;
 select * into p from public.phuc_khao_kiem_tra where id=p_id; if not found then return jsonb_build_object('ok',false,'message','Không tìm thấy yêu cầu phúc khảo.'); end if;
 select * into q from public.ket_qua_kiem_tra where id=p.ket_qua_id;
 if p_diem_phan_moi is not null and (p_diem_phan_moi<0 or p_diem_phan_moi>10) then return jsonb_build_object('ok',false,'message','Điểm phần thi phải từ 0 đến 10.'); end if;
 if p_diem_toan_bai_moi is not null and (p_diem_toan_bai_moi<0 or p_diem_toan_bai_moi>10) then return jsonb_build_object('ok',false,'message','Điểm toàn bài phải từ 0 đến 10.'); end if;
 if p_anh_minh_chung_admin is not null and (length(p_anh_minh_chung_admin)>2800000 or p_anh_minh_chung_admin !~ '^data:image/(jpeg|png|webp);base64,') then return jsonb_build_object('ok',false,'message','Ảnh minh chứng không hợp lệ hoặc vượt 2 MB.'); end if;
 update public.phuc_khao_kiem_tra set trang_thai=p_trang_thai,phan_hoi=nullif(btrim(p_phan_hoi),''),anh_minh_chung_admin=coalesce(p_anh_minh_chung_admin,anh_minh_chung_admin),updated_at=now() where id=p_id;
 if p_diem_phan_moi is not null then
  if p.phan_kiem_tra='Trắc nghiệm' then update public.ket_qua_kiem_tra set diem_trac_nghiem=p_diem_phan_moi,updated_at=now() where id=q.id;
  elsif p.phan_kiem_tra='Tự luận' then update public.ket_qua_kiem_tra set diem_tu_luan=p_diem_phan_moi,updated_at=now() where id=q.id; end if;
 end if;
 if p_diem_toan_bai_moi is not null then update public.ket_qua_kiem_tra set diem=p_diem_toan_bai_moi,ghi_chu=nullif(btrim(p_ghi_chu),''),updated_at=now() where id=q.id;
 elsif nullif(btrim(p_ghi_chu),'') is not null then update public.ket_qua_kiem_tra set ghi_chu=btrim(p_ghi_chu),updated_at=now() where id=q.id; end if;
 insert into public.qlnn_thong_bao(ma_hs,tieu_de,noi_dung,loai,hien_popup,hien_chay_ngang,lien_ket)
 values(p.ma_hs,'Cập nhật kết quả phúc khảo','Yêu cầu phúc khảo phần '||p.phan_kiem_tra||' của môn '||q.mon||' trong đợt '||q.dot_kiem_tra||' đã được cập nhật: '||p_trang_thai||coalesce('. '||nullif(btrim(p_phan_hoi),''),''),'Phúc khảo',true,true,'results');
 return jsonb_build_object('ok',true);
exception when others then return jsonb_build_object('ok',false,'message','Không cập nhật được: '||sqlerrm); end $$;

-- Thông báo kết quả theo đợt: Admin chủ động gửi một lần sau khi đã nhập đủ các file môn/khối.
create table if not exists public.thong_bao_ket_qua_dot(
 id bigint generated by default as identity primary key, nam_hoc text not null, dot_kiem_tra text not null,
 created_at timestamptz not null default now(), nguoi_gui text, so_nguoi_nhan integer not null default 0,
 unique(nam_hoc,dot_kiem_tra)
);
alter table public.thong_bao_ket_qua_dot enable row level security;
revoke all on public.thong_bao_ket_qua_dot from anon,authenticated;
create or replace function public.admin_thong_bao_ket_qua_dot(p_ma_cb text,p_mat_khau text,p_nam_hoc text,p_dot text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare c public.can_bo%rowtype; n int:=0; existing public.thong_bao_ket_qua_dot%rowtype;
begin
 if not public.qlnn_xac_nhan_admin(p_ma_cb,p_mat_khau) then return jsonb_build_object('ok',false,'message','Chỉ Admin được gửi thông báo kết quả toàn trường.'); end if;
 select * into existing from public.thong_bao_ket_qua_dot where nam_hoc=coalesce(nullif(p_nam_hoc,''),'2026-2027') and dot_kiem_tra=btrim(p_dot);
 if found then return jsonb_build_object('ok',false,'already_sent',true,'message','Thông báo cho đợt này đã được gửi trước đó.'); end if;
 if not exists(select 1 from public.ket_qua_kiem_tra where nam_hoc=coalesce(nullif(p_nam_hoc,''),'2026-2027') and dot_kiem_tra=btrim(p_dot)) then return jsonb_build_object('ok',false,'message','Đợt này chưa có kết quả được tải lên.'); end if;
 select * into c from public.can_bo where btrim(ma_cb)=btrim(p_ma_cb) limit 1;
 insert into public.qlnn_thong_bao(ma_hs,tieu_de,noi_dung,loai,nguoi_gui,hien_popup,hien_chay_ngang,lien_ket)
 select d.ma_hs,'Đã có kết quả kiểm tra: '||btrim(p_dot),'Nhà trường đã đăng tải kết quả đợt '||btrim(p_dot)||'. Vui lòng đăng nhập để xem kết quả các môn đã tham gia.','Kết quả kiểm tra',c.ho_ten,true,true,'results'
 from public.danh_sach d where (d.trang_thai is null or lower(btrim(d.trang_thai)) not in ('inactive','nghi hoc','đã nghỉ','false','0'));
 get diagnostics n=row_count;
 insert into public.thong_bao_ket_qua_dot(nam_hoc,dot_kiem_tra,nguoi_gui,so_nguoi_nhan) values(coalesce(nullif(p_nam_hoc,''),'2026-2027'),btrim(p_dot),c.ma_cb,n);
 return jsonb_build_object('ok',true,'count',n);
end $$;

grant execute on function public.admin_nhap_ket_qua_v2(text,text,text,text,text,text,text,date,jsonb) to anon,authenticated;
grant execute on function public.portal_gui_phuc_khao_phan(text,text,bigint,text) to anon,authenticated;
grant execute on function public.portal_lay_du_lieu_v3(text,text,text) to anon,authenticated;
grant execute on function public.admin_lay_phuc_khao(text,text) to anon,authenticated;
grant execute on function public.admin_cap_nhat_phuc_khao_v3(text,text,bigint,text,text,numeric,numeric,text,text) to anon,authenticated;
grant execute on function public.admin_thong_bao_ket_qua_dot(text,text,text,text) to anon,authenticated;

-- Trả đủ cột điểm thành phần cho giao diện Admin; giới hạn 10.000 để tránh response không kiểm soát.
create or replace function public.admin_lay_ket_qua(p_ma_cb text,p_mat_khau text)
returns jsonb language plpgsql security definer set search_path=public as $$ declare r jsonb; begin
 if not public.qlnn_xac_nhan_admin(p_ma_cb,p_mat_khau) then return jsonb_build_object('ok',false,'message','Không có quyền quản trị.'); end if;
 select coalesce(jsonb_agg(to_jsonb(x) order by x.dot_kiem_tra desc,x.ma_hs,x.mon),'[]'::jsonb) into r
 from (select ma_hs,nam_hoc,dot_kiem_tra,mon,so_bao_danh,diem_trac_nghiem,diem_tu_luan,diem,ngay_kiem_tra,loai_kiem_tra,ghi_chu,updated_at from public.ket_qua_kiem_tra order by dot_kiem_tra desc,ma_hs,mon limit 10000) x;
 return jsonb_build_object('ok',true,'rows',r); end $$;
grant execute on function public.admin_lay_ket_qua(text,text) to anon,authenticated;

-- Không trả ảnh minh chứng gốc của Admin về cổng phụ huynh/học sinh; chỉ trả cờ có minh chứng.
create or replace function public.portal_lay_du_lieu_v3(p_ma_hs text,p_mat_khau text,p_doi_tuong text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare r jsonb; results jsonb; appeals jsonb;
begin
 if p_doi_tuong not in ('Học sinh','Phụ huynh') then return null; end if;
 r:=public.portal_lay_du_lieu_v2(p_ma_hs,p_mat_khau,p_doi_tuong); if r is null then return null; end if;
 select coalesce(jsonb_agg(to_jsonb(q)||jsonb_build_object('phuc_khao_tu',w.bat_dau,'phuc_khao_den',w.ket_thuc) order by q.dot_kiem_tra desc,q.mon),'[]'::jsonb) into results
 from public.ket_qua_kiem_tra q left join public.thoi_gian_phuc_khao w on w.nam_hoc=q.nam_hoc and w.dot_kiem_tra=q.dot_kiem_tra where q.ma_hs=btrim(p_ma_hs);
 select coalesce(jsonb_agg((to_jsonb(p)-'anh_minh_chung_admin'-'anh_minh_chung')||jsonb_build_object('mon',q.mon,'dot_kiem_tra',q.dot_kiem_tra,'diem',q.diem,'diem_trac_nghiem',q.diem_trac_nghiem,'diem_tu_luan',q.diem_tu_luan,'ghi_chu_ket_qua',q.ghi_chu,'co_minh_chung_admin',p.anh_minh_chung_admin is not null) order by p.created_at desc),'[]'::jsonb) into appeals
 from public.phuc_khao_kiem_tra p join public.ket_qua_kiem_tra q on q.id=p.ket_qua_id where p.ma_hs=btrim(p_ma_hs);
 r:=jsonb_set(r,'{ket_qua}',results,true); r:=jsonb_set(r,'{phuc_khao}',appeals,true); return r;
end $$;
grant execute on function public.portal_lay_du_lieu_v3(text,text,text) to anon,authenticated;
