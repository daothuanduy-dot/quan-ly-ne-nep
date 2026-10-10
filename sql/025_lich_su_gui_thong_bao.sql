-- V3.0.5.25.27: Lưu nhóm gửi và hiển thị lịch sử thông báo trong giao diện gửi.
alter table public.qlnn_thong_bao add column if not exists nhom_gui_id uuid;
alter table public.qlnn_thong_bao add column if not exists pham_vi_gui text;
alter table public.qlnn_thong_bao add column if not exists lop_gui text[];

-- Gắn nhóm cho dữ liệu cũ để lịch sử cũ cũng hiển thị được.
update public.qlnn_thong_bao
set nhom_gui_id = md5(coalesce(tieu_de,'') || '|' || coalesce(noi_dung,'') || '|' || coalesce(nguoi_gui,'') || '|' || coalesce(created_at::text,''))::uuid
where nhom_gui_id is null;
create index if not exists idx_qlnn_thong_bao_nhom_gui on public.qlnn_thong_bao(nhom_gui_id,created_at desc);

create or replace function public.admin_gui_thong_bao_v3(
 p_ma_cb text,p_mat_khau text,p_tieu_de text,p_noi_dung text,p_pham_vi text,
 p_lop_list text[],p_ma_hs_list text[],p_gui_hoc_sinh boolean,p_gui_phu_huynh boolean,p_popup boolean,p_ticker boolean
) returns jsonb language plpgsql security definer set search_path=public as $$
declare c public.can_bo%rowtype; isadmin boolean; isgvcn boolean; n integer:=0; ns integer:=0; x record; v_batch uuid:=gen_random_uuid();
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
  ns:=ns+1;
  if coalesce(p_gui_hoc_sinh,false) then
   insert into public.qlnn_thong_bao(ma_hs,tieu_de,noi_dung,loai,nguoi_gui,hien_popup,hien_chay_ngang,lien_ket,doi_tuong_nhan,nhom_gui_id,pham_vi_gui,lop_gui)
   values(x.ma_hs,btrim(p_tieu_de),btrim(p_noi_dung),'Thông báo',c.ho_ten,p_popup,p_ticker,'notices','Học sinh',v_batch,p_pham_vi,coalesce(p_lop_list,'{}'::text[])); n:=n+1;
  end if;
  if coalesce(p_gui_phu_huynh,false) then
   insert into public.qlnn_thong_bao(ma_hs,tieu_de,noi_dung,loai,nguoi_gui,hien_popup,hien_chay_ngang,lien_ket,doi_tuong_nhan,nhom_gui_id,pham_vi_gui,lop_gui)
   values(x.ma_hs,btrim(p_tieu_de),btrim(p_noi_dung),'Thông báo',c.ho_ten,p_popup,p_ticker,'notices','Phụ huynh',v_batch,p_pham_vi,coalesce(p_lop_list,'{}'::text[])); n:=n+1;
  end if;
 end loop;
 if ns=0 then return jsonb_build_object('ok',false,'message','Không tìm thấy học sinh phù hợp trong phạm vi đã chọn.'); end if;
 return jsonb_build_object('ok',true,'count',n,'students',ns,'batch_id',v_batch);
end $$;

create or replace function public.admin_lay_lich_su_thong_bao(p_ma_cb text,p_mat_khau text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare c public.can_bo%rowtype; isadmin boolean; isgvcn boolean; r jsonb;
begin
 select * into c from public.can_bo where btrim(ma_cb)=btrim(p_ma_cb) and coalesce(mat_khau,'')=coalesce(p_mat_khau,'') and coalesce(trang_thai,true)=true limit 1;
 if not found then return jsonb_build_object('ok',false,'message','Không xác thực được tài khoản cán bộ.'); end if;
 isadmin:=lower(coalesce(c.vai_tro,'')) in ('admin','quản trị hệ thống') or coalesce(c.vai_tro_list,'{}'::text[]) @> array['Admin']::text[];
 isgvcn:=lower(coalesce(c.vai_tro,'')) in ('gvcn','giáo viên chủ nhiệm') or coalesce(c.vai_tro_list,'{}'::text[]) && array['GVCN','Giáo viên chủ nhiệm']::text[];
 if not isadmin and not isgvcn then return jsonb_build_object('ok',false,'message','Không có quyền xem lịch sử gửi thông báo.'); end if;
 select coalesce(jsonb_agg(to_jsonb(z) order by z.created_at desc),'[]'::jsonb) into r
 from (
  select nhom_gui_id,min(created_at) created_at,max(tieu_de) tieu_de,max(noi_dung) noi_dung,max(nguoi_gui) nguoi_gui,
   max(pham_vi_gui) pham_vi_gui,
   (array_agg(lop_gui) filter(where lop_gui is not null and cardinality(lop_gui)>0))[1] lop_gui,
   array_agg(distinct doi_tuong_nhan) filter(where doi_tuong_nhan is not null) doi_tuong,
   count(*) so_luot_nhan,count(distinct ma_hs) so_hoc_sinh,bool_or(hien_popup) popup,bool_or(hien_chay_ngang) ticker
  from public.qlnn_thong_bao
  where (isadmin or nguoi_gui=c.ho_ten) and (isadmin or pham_vi_gui is null or pham_vi_gui<>'Toàn trường')
    and (isadmin or exists(select 1 from public.danh_sach d where d.ma_hs=qlnn_thong_bao.ma_hs and d.lop=c.lop_quan_ly))
  group by nhom_gui_id
  order by min(created_at) desc limit 200
 ) z;
 return jsonb_build_object('ok',true,'rows',r);
end $$;

grant execute on function public.admin_gui_thong_bao_v3(text,text,text,text,text,text[],text[],boolean,boolean,boolean,boolean) to anon,authenticated;
grant execute on function public.admin_lay_lich_su_thong_bao(text,text) to anon,authenticated;
