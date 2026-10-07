// js/quantri-canbo.js
import { supabase } from './config.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const el=id=>document.getElementById(id); let rows=[], editingId=null;
const roles=['admin','ban_giam_hieu','giao_vien','giam_thi','gvcn','doan_doi','van_phong'];

function render(){
 el('content-staff').innerHTML=`<div class="panel-pad">
  <div class="filters grid grid-3"><div class="field"><label>Tìm kiếm</label><input id="cb_q" placeholder="Mã CB, họ tên, vai trò..."></div><div class="field"><label>Vai trò</label><select id="cb_role"><option value="">Tất cả</option>${roles.map(x=>`<option>${x}</option>`).join('')}</select></div><div class="actions"><button class="btn btn-primary" id="cb_add">+ Thêm cán bộ</button></div></div>
  <div class="table-wrap"><table class="data-table"><thead><tr><th>#</th><th>Mã CB</th><th>Họ tên</th><th>Vai trò</th><th>CN lớp</th><th>Lớp giảng dạy</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody id="cb_body"></tbody></table></div>
 </div>`;
 el('cb_q').oninput=filter;el('cb_role').onchange=filter;el('cb_add').onclick=()=>open();
 load();
}
async function load(){
 const {data,error}=await supabase.from('can_bo').select('*').order('ho_ten');
 if(error){window.ui.toast(error.message,'error');return} rows=data||[];filter();
}
function filter(){
 const q=(el('cb_q')?.value||'').toLowerCase(), role=el('cb_role')?.value||'';
 const a=rows.filter(r=>(!q||[r.ma_cb,r.ho_ten,r.vai_tro].some(v=>String(v||'').toLowerCase().includes(q)))&&(!role||String(r.vai_tro_list||[]).includes(role)||String(r.vai_tro||'')===role));
 el('cb_body').innerHTML=a.length?a.map((r,i)=>{const rl=Array.isArray(r.vai_tro_list)?r.vai_tro_list:[r.vai_tro].filter(Boolean);const gd=Array.isArray(r.lop_giang_day)?r.lop_giang_day:[];return `<tr><td>${i+1}</td><td><b>${esc(r.ma_cb)}</b></td><td>${esc(r.ho_ten)}</td><td>${rl.map(x=>`<span class="badge badge-blue">${esc(x)}</span>`).join(' ')}</td><td>${esc(r.lop_quan_ly||'')}</td><td>${gd.map(esc).join(', ')}</td><td>${r.trang_thai!==false?'<span class="badge badge-green">Đang hoạt động</span>':'<span class="badge badge-red">Khóa</span>'}</td><td><button class="btn btn-sm" data-edit="${r.id}">Sửa</button> <button class="btn btn-sm btn-danger" data-del="${r.id}">Xóa</button></td></tr>`}).join(''):`<tr><td colspan="8" class="empty">Không có dữ liệu.</td></tr>`;
 el('cb_body').querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>open(rows.find(x=>String(x.id)===b.dataset.edit)));
 el('cb_body').querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>remove(b.dataset.del));
}
function open(r=null){
 editingId=r?.id||null;const selected=Array.isArray(r?.vai_tro_list)?r.vai_tro_list:[r?.vai_tro].filter(Boolean), gd=Array.isArray(r?.lop_giang_day)?r.lop_giang_day.join(', '):'';
 window.ui.modal.open(editingId?'Sửa cán bộ':'Thêm cán bộ',`<div class="grid grid-2">
 <div class="field"><label>Mã cán bộ *</label><input id="cb_ma" value="${esc(r?.ma_cb)}"></div><div class="field"><label>Họ và tên *</label><input id="cb_ten" value="${esc(r?.ho_ten)}"></div>
 <div class="field"><label>Mật khẩu</label><input id="cb_pass" type="text" value="${esc(r?.mat_khau)}"></div><div class="field"><label>Lớp chủ nhiệm</label><input id="cb_gvcn" value="${esc(r?.lop_quan_ly)}" placeholder="VD: 10C5"></div>
 <div class="field" style="grid-column:1/-1"><label>Các lớp giảng dạy</label><input id="cb_day" value="${esc(gd)}" placeholder="VD: 10C1, 10C2, 11B3"></div>
 </div><div style="margin-top:15px"><label style="font-size:12px;font-weight:800;color:#475569">Vai trò (có thể chọn nhiều)</label><div class="check-grid" style="margin-top:7px">${roles.map(x=>`<label class="check"><input class="cb_role_chk" type="checkbox" value="${x}" ${selected.includes(x)?'checked':''}>${x}</label>`).join('')}</div></div>
 <div class="field" style="margin-top:15px"><label>Trạng thái</label><select id="cb_status"><option value="1" ${r?.trang_thai!==false?'selected':''}>Đang hoạt động</option><option value="0" ${r?.trang_thai===false?'selected':''}>Khóa</option></select></div>`,
 `<button class="btn" id="cb_cancel">Hủy</button><button class="btn btn-primary" id="cb_save">Lưu</button>`);
 el('cb_cancel').onclick=window.ui.modal.close;el('cb_save').onclick=save;
}
async function save(){
 const roles2=[...document.querySelectorAll('.cb_role_chk:checked')].map(x=>x.value);const ma=el('cb_ma').value.trim(),ten=el('cb_ten').value.trim();
 if(!ma||!ten)return window.ui.toast('Cần nhập mã cán bộ và họ tên.','error');
 const d={ma_cb:ma,ho_ten:ten,mat_khau:el('cb_pass').value,vai_tro:roles2[0]||'',vai_tro_list:roles2,lop_quan_ly:el('cb_gvcn').value.trim()||null,lop_giang_day:el('cb_day').value.split(',').map(x=>x.trim()).filter(Boolean),trang_thai:el('cb_status').value==='1'};
 const {error}=editingId?await supabase.from('can_bo').update(d).eq('id',editingId):await supabase.from('can_bo').insert(d);
 if(error)return window.ui.toast(error.message,'error');window.ui.modal.close();window.ui.toast('Đã lưu cán bộ.','success');load();
}
async function remove(id){if(!confirm('Xóa cán bộ này?'))return;const {error}=await supabase.from('can_bo').delete().eq('id',id);if(error)return window.ui.toast(error.message,'error');window.ui.toast('Đã xóa.','success');load()}
export function initStaff(){render()}
