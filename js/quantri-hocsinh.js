// js/quantri-hocsinh.js
import { supabase, appConfig } from './config.js';

let rows=[], editingId=null;

const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const el=id=>document.getElementById(id);

function formHtml(r={}){
  return `<div class="grid grid-3">
    <div class="field"><label>Mã học sinh *</label><input id="hs_ma" value="${esc(r.ma_hs)}"></div>
    <div class="field"><label>Họ và tên *</label><input id="hs_ten" value="${esc(r.ho_ten)}"></div>
    <div class="field"><label>Ngày sinh</label><input id="hs_ns" type="date" value="${esc(r.ngay_sinh)}"></div>
    <div class="field"><label>Khối</label><select id="hs_khoi"><option value="">-- Chọn --</option>${['10','11','12'].map(x=>`<option ${r.khoi==x?'selected':''}>${x}</option>`).join('')}</select></div>
    <div class="field"><label>Lớp *</label><input id="hs_lop" value="${esc(r.lop)}" placeholder="VD: 10C5"></div>
    <div class="field"><label>Mã QR</label><input id="hs_qr" value="${esc(r.ma_qr)}"></div>
    <div class="field"><label>Email</label><input id="hs_email" value="${esc(r.email)}"></div>
    <div class="field"><label>Mật khẩu</label><input id="hs_pass" type="text" value="${esc(r.mat_khau)}"></div>
    <div class="field"><label>Lớp quản lý</label><input id="hs_lopql" value="${esc(r.lop_quan_ly)}"></div>
    <div class="field"><label>Vai trò</label><input id="hs_role" value="${esc(r.vai_tro)}"></div>
    <div class="field"><label>Trạng thái</label><select id="hs_status"><option value="Đang học" ${r.trang_thai!=='Nghỉ'?'selected':''}>Đang học</option><option value="Nghỉ" ${r.trang_thai==='Nghỉ'?'selected':''}>Nghỉ</option></select></div>
  </div>
  <div class="check-grid" style="margin-top:15px">
    ${[['quyen_bao_vang','Báo vắng'],['quyen_cham_diem','Chấm điểm'],['quyen_thong_ke','Thống kê'],['quyen_thong_ke_tot','Thống kê tốt'],['quyen_quet_qr','Quét QR']].map(([k,t])=>`<label class="check"><input type="checkbox" id="hs_${k}" ${r[k]?'checked':''}>${t}</label>`).join('')}
  </div>`;
}

function render(){
  el('content-students').innerHTML=`<div class="panel-pad">
    <div class="filters grid grid-4">
      <div class="field"><label>Tìm kiếm</label><input id="hs_search" placeholder="Mã HS, họ tên, lớp..."></div>
      <div class="field"><label>Khối</label><select id="hs_filter_khoi"><option value="">Tất cả</option><option>10</option><option>11</option><option>12</option></select></div>
      <div class="field"><label>Lớp</label><input id="hs_filter_lop" placeholder="VD: 10C5"></div>
      <div class="actions"><button class="btn btn-primary" id="hs_add">+ Thêm học sinh</button></div>
    </div>
    <div class="grid grid-4" style="margin-bottom:14px">
      <div class="stat"><div class="num" id="hs_total">0</div><div class="label">Tổng học sinh</div></div>
      <div class="stat"><div class="num" id="hs_10">0</div><div class="label">Khối 10</div></div>
      <div class="stat"><div class="num" id="hs_11">0</div><div class="label">Khối 11</div></div>
      <div class="stat"><div class="num" id="hs_12">0</div><div class="label">Khối 12</div></div>
    </div>
    <div class="table-wrap"><table class="data-table"><thead><tr><th>#</th><th>Mã HS</th><th>Họ tên</th><th>Ngày sinh</th><th>Khối</th><th>Lớp</th><th>Mã QR</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody id="hs_body"></tbody></table></div>
  </div>`;
  ['hs_search','hs_filter_khoi','hs_filter_lop'].forEach(id=>el(id).addEventListener('input',filterRender));
  el('hs_add').onclick=()=>openForm();
  load();
}
async function load(){
  const {data,error}=await supabase.from('danh_sach').select('*').eq('nam_hoc',appConfig.namHoc).order('khoi').order('lop').order('ho_ten');
  if(error){window.ui.toast(error.message,'error');return}
  rows=data||[]; filterRender();
}
function filterRender(){
  const q=(el('hs_search')?.value||'').toLowerCase().trim(), k=el('hs_filter_khoi')?.value||'', l=(el('hs_filter_lop')?.value||'').toLowerCase().trim();
  const a=rows.filter(r=>(!q||[r.ma_hs,r.ho_ten,r.lop,r.ma_qr].some(v=>String(v||'').toLowerCase().includes(q)))&&(!k||String(r.khoi)===k)&&(!l||String(r.lop||'').toLowerCase().includes(l)));
  ['total','10','11','12'].forEach(x=>{const id='hs_'+x;if(el(id))el(id).textContent=x==='total'?a.length:a.filter(r=>String(r.khoi)===x).length});
  el('hs_body').innerHTML=a.length?a.map((r,i)=>`<tr><td>${i+1}</td><td><b>${esc(r.ma_hs)}</b></td><td>${esc(r.ho_ten)}</td><td>${esc(r.ngay_sinh)}</td><td>${esc(r.khoi)}</td><td>${esc(r.lop)}</td><td>${esc(r.ma_qr||'')}</td><td><span class="badge ${r.trang_thai==='Nghỉ'?'badge-red':'badge-green'}">${esc(r.trang_thai||'Đang học')}</span></td><td class="actions-cell"><button class="btn btn-sm" data-edit="${r.id}">Sửa</button> <button class="btn btn-sm btn-danger" data-del="${r.id}">Xóa</button></td></tr>`).join(''):`<tr><td colspan="9" class="empty">Không có dữ liệu.</td></tr>`;
  el('hs_body').querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>openForm(rows.find(x=>String(x.id)===b.dataset.edit)));
  el('hs_body').querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>remove(b.dataset.del));
}
function openForm(r=null){
  editingId=r?.id||null;
  window.ui.modal.open(editingId?'Sửa học sinh':'Thêm học sinh',formHtml(r||{}),`<button class="btn" id="m_cancel">Hủy</button><button class="btn btn-primary" id="m_save">Lưu dữ liệu</button>`);
  el('m_cancel').onclick=window.ui.modal.close; el('m_save').onclick=save;
}
async function save(){
  const d={nam_hoc:appConfig.namHoc,ma_hs:el('hs_ma').value.trim(),ho_ten:el('hs_ten').value.trim(),ngay_sinh:el('hs_ns').value||null,khoi:el('hs_khoi').value,lop:el('hs_lop').value.trim().toUpperCase(),ma_qr:el('hs_qr').value.trim()||null,email:el('hs_email').value.trim()||null,mat_khau:el('hs_pass').value,lop_quan_ly:el('hs_lopql').value.trim()||null,vai_tro:el('hs_role').value.trim()||null,trang_thai:el('hs_status').value};
  ['quyen_bao_vang','quyen_cham_diem','quyen_thong_ke','quyen_thong_ke_tot','quyen_quet_qr'].forEach(k=>d[k]=el('hs_'+k).checked);
  if(!d.ma_hs||!d.ho_ten||!d.lop)return window.ui.toast('Vui lòng nhập Mã HS, Họ tên và Lớp.','error');
  let q=editingId?supabase.from('danh_sach').update(d).eq('id',editingId):supabase.from('danh_sach').insert(d);
  const {error}=await q;
  if(error)return window.ui.toast(error.message,'error');
  window.ui.modal.close();window.ui.toast('Đã lưu học sinh.','success');load();
}
async function remove(id){
  if(!confirm('Xóa học sinh này khỏi danh sách?'))return;
  const {error}=await supabase.from('danh_sach').delete().eq('id',id);
  if(error)return window.ui.toast(error.message,'error');window.ui.toast('Đã xóa.','success');load();
}
export function initStudents(){render()}
