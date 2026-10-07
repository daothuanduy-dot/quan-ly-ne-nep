// js/quantri-ketchuyen.js
import { supabase, appConfig, nextClass, yearShift } from './config.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const el=id=>document.getElementById(id);let rows=[],selected12=new Set();
function render(){
 el('content-transfer').innerHTML=`<div class="panel-pad">
 <div class="notice warning"><b>Lưu ý:</b> nên sao lưu CSDL trước khi kết chuyển. Khối 10 → 11 đổi tên lớp C → B; khối 11 → 12 đổi B → A. Khối 12 chỉ những học sinh được chọn mới thực hiện tốt nghiệp và bị loại khỏi danh sách năm học hiện tại.</div>
 <div class="grid grid-3" style="margin-top:15px">
  <div class="field"><label>Năm học hiện tại</label><input id="tc_year" value="${appConfig.namHoc}" readonly></div>
  <div class="field"><label>Năm học sau</label><input id="tc_next" value="${yearShift(appConfig.namHoc)}" readonly></div>
  <div class="actions"><button class="btn btn-primary" id="tc_load">Tải danh sách</button></div>
 </div>
 <div id="tc_area" style="margin-top:18px"></div>
 </div>`;
 el('tc_load').onclick=load;
 load();
}
async function load(){
 const {data,error}=await supabase.from('danh_sach').select('*').eq('nam_hoc',appConfig.namHoc).in('khoi',['10','11','12']).eq('trang_thai','Đang học').order('khoi').order('lop').order('ho_ten');
 if(error)return window.ui.toast(error.message,'error');rows=data||[];selected12=new Set(rows.filter(r=>String(r.khoi)==='12').map(r=>r.id));renderArea();
}
function renderArea(){
 const a10=rows.filter(r=>String(r.khoi)==='10'),a11=rows.filter(r=>String(r.khoi)==='11'),a12=rows.filter(r=>String(r.khoi)==='12');
 el('tc_area').innerHTML=`<div class="grid grid-3">
  ${card('Khối 10',a10.length,'Kết chuyển → '+appConfig.classPatterns[10].nextKhoi)}
  ${card('Khối 11',a11.length,'Kết chuyển → '+appConfig.classPatterns[11].nextKhoi)}
  ${card('Khối 12',a12.length,'Tốt nghiệp: '+selected12.size)}
 </div>
 <div class="toolbar" style="margin:16px 0"><button class="btn btn-success" id="tc_transfer_10">Kết chuyển khối 10 → 11</button><button class="btn btn-success" id="tc_transfer_11">Kết chuyển khối 11 → 12</button><button class="btn btn-primary" id="tc_select12">Chọn tất cả khối 12</button><button class="btn" id="tc_clear12">Bỏ chọn khối 12</button><button class="btn btn-danger" id="tc_grad">TN các học sinh đã chọn</button></div>
 <div class="table-wrap"><table class="data-table"><thead><tr><th>Chọn TN</th><th>Mã HS</th><th>Họ tên</th><th>Khối</th><th>Lớp hiện tại</th><th>Lớp sau kết chuyển</th><th>Trạng thái</th></tr></thead><tbody>${a12.length?a12.map(r=>`<tr><td><input type="checkbox" data-sel12="${r.id}" ${selected12.has(r.id)?'checked':''}></td><td>${esc(r.ma_hs)}</td><td>${esc(r.ho_ten)}</td><td>12</td><td>${esc(r.lop)}</td><td>—</td><td>${esc(r.trang_thai||'Đang học')}</td></tr>`).join(''):`<tr><td colspan="7" class="empty">Không có học sinh khối 12.</td></tr>`}</tbody></table></div>`;
 el('tc_transfer_10').onclick=()=>transferGrade('10');el('tc_transfer_11').onclick=()=>transferGrade('11');el('tc_select12').onclick=()=>{selected12=new Set(a12.map(r=>r.id));renderArea()};el('tc_clear12').onclick=()=>{selected12.clear();renderArea()};el('tc_grad').onclick=graduate;
 el('tc_area').querySelectorAll('[data-sel12]').forEach(c=>c.onchange=()=>{const id=Number(c.dataset.sel12);c.checked?selected12.add(id):selected12.delete(id)});
}
function card(title,n,sub){return `<div class="stat"><div class="num">${n}</div><div class="label"><b>${title}</b> · ${sub}</div></div>`}
async function transferGrade(g){
 const source=rows.filter(r=>String(r.khoi)===g);if(!source.length)return window.ui.toast(`Không có học sinh khối ${g}.`,'error');
 if(!confirm(`Thực hiện kết chuyển ${source.length} học sinh khối ${g}?`))return;
 for(const r of source){
   const lop=nextClass(r.lop);if(!lop){window.ui.toast(`Không xác định được lớp sau kết chuyển: ${r.lop}`,'error');continue}
   const {error}=await supabase.from('danh_sach').update({khoi:String(+g+1),lop,nam_hoc:yearShift(appConfig.namHoc),ngay_ket_chuyen:new Date().toISOString()}).eq('id',r.id).eq('nam_hoc',appConfig.namHoc);
   if(error)return window.ui.toast(`Lỗi ${r.ma_hs}: ${error.message}`,'error');
 }
 window.ui.toast(`Đã kết chuyển khối ${g}.`,'success');load();
}
async function graduate(){
 const ids=[...selected12];if(!ids.length)return window.ui.toast('Chưa chọn học sinh tốt nghiệp.','error');
 if(!confirm(`Xác nhận tốt nghiệp ${ids.length} học sinh? Những học sinh này sẽ không còn trong danh sách năm học hiện tại.`))return;
 // Soft-delete để bảo toàn lịch sử. Nếu schema có nam_hoc, chuyển sang trạng thái TN; nếu không có thì xóa.
 const {error}=await supabase.from('danh_sach').update({trang_thai:'Đã tốt nghiệp',ket_qua_tn:'TN',nam_hoc:yearShift(appConfig.namHoc),ngay_ket_chuyen:new Date().toISOString()}).in('id',ids).eq('nam_hoc',appConfig.namHoc);
 if(error)return window.ui.toast(error.message,'error');
 // Nếu đã bổ sung nam_hoc, nên cập nhật nam_hoc_hien_tai hoặc chuyển archive bằng RPC.
 window.ui.toast(`Đã đánh dấu ${ids.length} học sinh tốt nghiệp. Hãy chuyển sang năm học mới sau khi kiểm tra.`, 'success');load();
}
export function initTransfer(){render()}
