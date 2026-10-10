-- V3.0.5.25.26: Chọn nhiều lớp/học sinh và gửi riêng cho học sinh hoặc phụ huynh.
alter table public.qlnn_thong_bao add column if not exists doi_tuong_nhan text not null default 'Ca hai';

create or replace function public.admin_gui_thong_bao_v2(
 p_ma_cb text,p_mat_khau text,p_tieu_de text,p_noi_dung text,p_pham_vi text,
 p_lop_list text[],p_ma_hs_list text[],p_gui_hoc_sinh boolean,p_gui_phu_huynh boolean,p_popup boolean,p_ticker boolean
) returns jsonb language plpgsql security definer set search_path=public as $$
declare c public.can_bo%rowtype; isadmin boolean; isgvcn boolean; n integer:=0; x record; aud text;
begin
 select * into c from public.can_bo where btrim(ma_cb)=btrim(p_ma_cb) and coalesce(mat_khau,'')=coalesce(p_mat_khau,'') and coalesce(trang_thai,true)=true limit 1;
 if not found then return jsonb_build_object('ok',false,'message','Không xác thực được tài khoản cán bộ.'); end if;
 isadmin:=lower(coalesce(c.vai_tro,'')) in ('admin','quản trị hệ thống') or coalesce(c.vai_tro_list,'{}'::text[]) @> array['Admin']::text[];
 isgvcn:=lower(coalesce(c.vai_tro,'')) in ('gvcn','giáo viên chủ nhiệm') or coalesce(c.vai_tro_list,'{}'::text[]) && array['GVCN','Giáo viên chủ nhiệm']::text[];
 if not isadmin and not isgvcn then return jsonb_build_object('ok',false,'message','Chỉ Admin hoặc giáo viên chủ nhiệm được gửi thông báo.'); end if;
 if length(btrim(coalesce(p_tieu_de,'')))<3 or length(btrim(coalesce(p_noi_dung,'')))<3 then return jsonb_build_object('ok',false,'message','Cần nhập tiêu đề và nội dung thông báo.'); end if;
 if not coalesce(p_gui_hoc_sinh,false) and not coalesce(p_gui_phu_huynh,false) then return jsonb_build_object('ok',false,'message','Chọn học sinh hoặc phụ huynh nhận thông báo.'); end if;
 if p_pham_vi='Toàn trường' and not isadmin then return jsonb_build_object('ok',false,'message','Chỉ Admin được gửi thông báo toàn trường.'); end if;
 if p_pham_vi not in ('Toàn trường','Lớp','Cá nhân') then return jsonb_build_object('ok',false,'message','Phạm vi không hợp lệ.'); end if;
 if p_pham_vi='Lớp' and coalesce(cardinality(p_lop_list),0)=0 then return jsonb_build_object('ok',false,'message','Chưa chọn lớp nhận thông báo.'); end if;
 if p_pham_vi='Cá nhân' and coalesce(cardinality(p_ma_hs_list),0)=0 then return jsonb_build_object('ok',false,'message','Chưa chọn học sinh nhận thông báo.'); end if;
 if not isadmin and p_pham_vi='Lớp' and exists(select 1 from unnest(p_lop_list) z(lop) where z.lop is distinct from c.lop_quan_ly) then return jsonb_build_object('ok',false,'message','GVCN chỉ được gửi thông báo cho lớp chủ nhiệm.'); end if;
 if not isadmin and p_pham_vi='Cá nhân' and exists(select 1 from unnest(p_ma_hs_list) z(ma_hs) where not exists(select 1 from public.danh_sach d where d.ma_hs=z.ma_hs and d.lop=c.lop_quan_ly)) then return jsonb_build_object('ok',false,'message','GVCN chỉ được gửi thông báo cho học sinh lớp chủ nhiệm.'); end if;
 for x in select distinct d.ma_hs from public.danh_sach d where (p_pham_vi='Toàn trường' or (p_pham_vi='Lớp' and d.lop=any(coalesce(p_lop_list,'{}'::text[]))) or (p_pham_vi='Cá nhân' and d.ma_hs=any(coalesce(p_ma_hs_list,'{}'::text[])))) and (d.trang_thai is null or lower(btrim(d.trang_thai)) not in ('inactive','nghi hoc','đã nghỉ','false','0')) loop
  if coalesce(p_gui_hoc_sinh,false) then
   insert into public.qlnn_thong_bao(ma_hs,tieu_de,noi_dung,loai,nguoi_gui,hien_popup,hien_chay_ngang,lien_ket,doi_tuong_nhan) values(x.ma_hs,btrim(p_tieu_de),btrim(p_noi_dung),'Thông báo',c.ho_ten,p_popup,p_ticker,'notices','Học sinh'); n:=n+1;
  end if;
  if coalesce(p_gui_phu_huynh,false) then
   insert into public.qlnn_thong_bao(ma_hs,tieu_de,noi_dung,loai,nguoi_gui,hien_popup,hien_chay_ngang,lien_ket,doi_tuong_nhan) values(x.ma_hs,btrim(p_tieu_de),btrim(p_noi_dung),'Thông báo',c.ho_ten,p_popup,p_ticker,'notices','Phụ huynh'); n:=n+1;
  end if;
 end loop;
 return jsonb_build_object('ok',true,'count',n);
end $$;

create or replace function public.portal_lay_du_lieu_v2(p_ma_hs text,p_mat_khau text,p_doi_tuong text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare r jsonb; notices jsonb;
begin
 if p_doi_tuong not in ('Học sinh','Phụ huynh') then return null; end if;
 r:=public.portal_lay_du_lieu(p_ma_hs,p_mat_khau);
 if r is null then return null; end if;
 select coalesce(jsonb_agg(to_jsonb(z) order by z.created_at desc),'[]'::jsonb) into notices
 from (select id,tieu_de,noi_dung,loai,nguoi_gui,created_at,da_doc_at,hien_popup,hien_chay_ngang,lien_ket from public.qlnn_thong_bao where ma_hs=btrim(p_ma_hs) and (doi_tuong_nhan='Ca hai' or doi_tuong_nhan=p_doi_tuong) order by created_at desc limit 100) z;
 return jsonb_set(r,'{thong_bao}',notices,true);
end $$;

create or replace function public.portal_danh_dau_da_doc_v2(p_ma_hs text,p_mat_khau text,p_ids bigint[],p_doi_tuong text)
returns jsonb language plpgsql security definer set search_path=public as $$
begin
 if p_doi_tuong not in ('Học sinh','Phụ huynh') or not exists(select 1 from public.danh_sach d where btrim(d.ma_hs)=btrim(p_ma_hs) and btrim(coalesce(d.mat_khau,''))=btrim(coalesce(p_mat_khau,''))) then return jsonb_build_object('ok',false,'message','Tài khoản không hợp lệ.'); end if;
 update public.qlnn_thong_bao set da_doc_at=now() where ma_hs=btrim(p_ma_hs) and id=any(coalesce(p_ids,'{}'::bigint[])) and da_doc_at is null and (doi_tuong_nhan='Ca hai' or doi_tuong_nhan=p_doi_tuong);
 return jsonb_build_object('ok',true);
end $$;

grant execute on function public.admin_gui_thong_bao_v2(text,text,text,text,text,text[],text[],boolean,boolean,boolean,boolean) to anon,authenticated;
grant execute on function public.portal_lay_du_lieu_v2(text,text,text) to anon,authenticated;
grant execute on function public.portal_danh_dau_da_doc_v2(text,text,bigint[],text) to anon,authenticated;
