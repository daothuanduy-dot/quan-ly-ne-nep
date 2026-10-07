// js/quantri-tkb.js
import { supabase, appConfig } from './config.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const el=id=>document.getElementById(id);let rows=[],editingId=null;
const timeOpts=()=>['06:30','06:45','07:00','07:15','07:30','07:45','08:00','08:15','08:30','09:00','09:15','09:30','10:00','10:15','10:30','10:45','11:00','11:15','11:30','12:30','13:00','13:15','13:30','13:45','14:00','14:15','14:30','15:00','15:15','15:30','15:45','16:00','16:15','16:30','16:45','17:00'];
function render(){
 el('content-schedule').innerHTML=`<div class="panel-pad">
 <div class="notice">Thiết lập theo khối hoặc lớp. Khi quét QR, module quét có thể đối chiếu <b>khối/lớp + buổi + thứ + giờ hiện tại + khoảng tiết</b> để quyết định có ghi lượt điểm danh vào CSDL hay không.</div>
 <div class="toolbar" style="margin:15px 0"><button class="btn btn-primary" id="tg_add">+ Thêm cấu hình</button></div>
 <div class="table-wrap"><table class="data-table"><thead><tr><th>#</th><th>Khối</th><th>Lớp</th><th>Buổi</th><th>Từ tiết</th><th>Đến tiết</th><th>Bắt đầu điểm danh</th><th>Kết thúc</th><th>Thao tác</th></tr></thead><tbody id="tg_body"></tbody></table></div>
 </div>`;
 el('tg_add').onclick=()=>open();load();
}
async function load(){let q=supabase.from('cai_dat_thoi_gian').select('*').eq('nam_hoc',appConfig.namHoc).order('khoi').order('lop').order('buoi');const {data,error}=await q;if(error){window.ui.toast(error.message,'error');return}rows=data||[];filter()}
function filter(){el('tg_body').innerHTML=rows.length?rows.map((r,i)=>`<tr><td>${i+1}</td><td>${esc(r.khoi)}</td><td>${esc(r.lop||'Tất cả')}</td><td>${esc(r.buoi)}</td><td>${r.tu_tiet??''}</td><td>${r.den_tiet??''}</td><td>${esc(r.gio_bat_dau_diem_danh)}</td><td>${esc(r.gio_ket_thuc_diem_danh)}</td><td><button class="btn btn-sm" data-edit="${r.id}">Sửa</button> <button class="btn btn-sm btn-danger" data-del="${r.id}">Xóa</button></td></tr>`).join(''):`<tr><td colspan="9" class="empty">Chưa có cấu hình.</td></tr>`;el('tg_body').querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>open(rows.find(x=>String(x.id)===b.dataset.edit)));el('tg_body').querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>remove(b.dataset.del))}
function open(r=null){editingId=r?.id||null;const times=timeOpts();window.ui.modal.open(editingId?'Sửa thời gian học':'Thêm thời gian học',`<div class="grid grid-3">
 <div class="field"><label>Khối *</label><select id="tg_khoi">${['10','11','12'].map(x=>`<option ${r?.khoi==x?'selected':''}>${x}</option>`).join('')}</select></div>
 <div class="field"><label>Lớp (để trống = cả khối)</label><input id="tg_lop" value="${esc(r?.lop)}" placeholder="VD: 10C5"></div>
 <div class="field"><label>Buổi</label><select id="tg_buoi"><option ${r?.buoi==='Sáng'?'selected':''}>Sáng</option><option ${r?.buoi==='Chiều'?'selected':''}>Chiều</option></select></div>
 <div class="field"><label>Từ tiết</label><input id="tg_tu" type="number" min="1" max="15" value="${r?.tu_tiet??1}"></div><div class="field"><label>Đến tiết</label><input id="tg_den" type="number" min="1" max="15" value="${r?.den_tiet??5}"></div>
 <div class="field"><label>Bắt đầu ghi điểm danh</label><select id="tg_start">${times.map(t=>`<option ${r?.gio_bat_dau_diem_danh===t?'selected':''}>${t}</option>`).join('')}</select></div>
 <div class="field"><label>Kết thúc ghi điểm danh</label><select id="tg_end">${times.map(t=>`<option ${r?.gio_ket_thuc_diem_danh===t?'selected':''}>${t}</option>`).join('')}</select></div>
 </div><p class="hint" style="margin-top:12px">Có thể tạo cấu hình ưu tiên cho từng lớp; cấu hình khối dùng làm mặc định.</p>`,`<button class="btn" id="tg_cancel">Hủy</button><button class="btn btn-primary" id="tg_save">Lưu</button>`);el('tg_cancel').onclick=window.ui.modal.close;el('tg_save').onclick=save}
async function save(){const d={khoi:el('tg_khoi').value,lop:el('tg_lop').value.trim().toUpperCase()||null,buoi:el('tg_buoi').value,tu_tiet:+el('tg_tu').value,den_tiet:+el('tg_den').value,gio_bat_dau_diem_danh:el('tg_start').value,gio_ket_thuc_diem_danh:el('tg_end').value,updated_at:new Date().toISOString()};if(d.tu_tiet>d.den_tiet)return window.ui.toast('Từ tiết phải nhỏ hơn hoặc bằng đến tiết.','error');d.nam_hoc=appConfig.namHoc;const {error}=editingId?await supabase.from('cai_dat_thoi_gian').update(d).eq('id',editingId):await supabase.from('cai_dat_thoi_gian').insert(d);if(error)return window.ui.toast(error.message,'error');window.ui.modal.close();window.ui.toast('Đã lưu cấu hình.','success');load()}
async function remove(id){if(!confirm('Xóa cấu hình này?'))return;const {error}=await supabase.from('cai_dat_thoi_gian').delete().eq('id',id);if(error)return window.ui.toast(error.message,'error');load()}
export function initSchedule(){render()}
