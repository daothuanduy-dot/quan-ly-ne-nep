import {supabase} from './config.js?v=3.0.5.25.26';
import {Auth} from './auth.js?v=3.0.5.25.26';
import {esc,toast} from './ui.js?v=3.0.5.25.26';
export async function init(root){
 const u=Auth.currentUser||{};const role=String(u.vai_tro||'').toLowerCase();const roles=Array.isArray(u.vai_tro_list)?u.vai_tro_list.map(x=>String(x).toLowerCase()):[];const admin=role==='admin'||role==='quản trị hệ thống'||roles.includes('admin');const gvcn=role.includes('gvcn')||role.includes('chủ nhiệm')||roles.some(x=>x.includes('gvcn')||x.includes('chủ nhiệm'));if(!admin&&!gvcn){root.innerHTML='<div class="danger-box">Chỉ Admin hoặc giáo viên chủ nhiệm được gửi thông báo.</div>';return;}
 const cls=String(u.lop_quan_ly||'');const {data:students,error}=await supabase.from('danh_sach').select('ma_hs,ho_ten,khoi,lop,trang_thai').order('lop').order('ho_ten').limit(5000);if(error){root.innerHTML=`<div class="danger-box">${esc(error.message)}</div>`;return;}
 const active=(students||[]).filter(x=>x.lop&&!['inactive','nghi hoc','đã nghỉ','false','0'].includes(String(x.trang_thai||'').toLowerCase()));const classes=[...new Set(active.map(x=>x.lop))].sort((a,b)=>a.localeCompare(b,'vi',{numeric:true})).filter(x=>admin||x===cls);
 root.innerHTML=`<div class="page-head"><div><h2>📢 Thông báo đến phụ huynh / học sinh</h2><p>Chọn phạm vi, lớp hoặc từng học sinh và đối tượng nhận trước khi gửi.</p></div></div>
 <div class="action-card"><div class="grid">
 <label>Tiêu đề<input id="ntTitle" maxlength="160" placeholder="Ví dụ: Lịch kiểm tra khảo sát tuần tới"></label>
 <label>Phạm vi<select id="ntScope">${admin?'<option value="Toàn trường">Toàn trường</option>':''}<option value="Lớp">Theo lớp</option><option value="Cá nhân">Chọn học sinh</option></select></label>
 <label style="grid-column:1/-1">Đối tượng nhận<div class="check-grid nt-recipient"><label class="check-item"><input type="checkbox" id="ntToStudent" checked> Gửi thông báo học sinh</label><label class="check-item"><input type="checkbox" id="ntToParent" checked> Gửi thông báo phụ huynh</label></div></label>
 <div id="ntTargetArea" style="grid-column:1/-1"></div>
 <label style="grid-column:1/-1">Nội dung<textarea id="ntBody" rows="5" placeholder="Nội dung cần học sinh/phụ huynh nắm bắt và thực hiện"></textarea></label></div>
 <div class="check-grid" style="margin:12px 0"><label class="check-item"><input id="ntPopup" type="checkbox" checked> Popup khi đăng nhập nếu chưa đọc</label><label class="check-item"><input id="ntTicker" type="checkbox" checked> Hiển thị trên thanh chạy ngang</label></div>
 <div class="action-row"><button id="ntSend" class="btn primary">📢 Gửi thông báo</button><span id="ntSelectionSummary" class="muted"></span></div><div id="ntResult"></div></div>`;
 const scope=root.querySelector('#ntScope'),area=root.querySelector('#ntTargetArea'),summary=root.querySelector('#ntSelectionSummary');
 const classStudents=()=>active.filter(x=>classes.includes(x.lop));
 const renderTargets=()=>{
  const s=scope.value;
  if(s==='Toàn trường'){
   area.innerHTML=`<div class="notice nt-scope-note"><b>Toàn trường</b><p>Thông báo sẽ gửi đến tất cả học sinh đang học và phụ huynh tương ứng. Không cần chọn lớp.</p></div>`;
  }else if(s==='Lớp'){
   area.innerHTML=`<section class="nt-target-panel"><div class="nt-target-head"><b>Chọn lớp nhận thông báo</b><div><button type="button" class="btn light btn-sm" id="ntSelectAllClasses">Chọn tất cả</button> <button type="button" class="btn light btn-sm" id="ntClearClasses">Bỏ chọn</button></div></div><div class="nt-target-list">${classes.map(c=>`<label class="check-item nt-target-option"><input type="checkbox" class="ntClass" value="${esc(c)}"><span><b>${esc(c)}</b><small>${classStudents().filter(x=>x.lop===c).length} học sinh</small></span></label>`).join('')}</div></section>`;
   area.querySelector('#ntSelectAllClasses').onclick=()=>{area.querySelectorAll('.ntClass').forEach(x=>x.checked=true);updateSummary()};area.querySelector('#ntClearClasses').onclick=()=>{area.querySelectorAll('.ntClass').forEach(x=>x.checked=false);updateSummary()};area.querySelectorAll('.ntClass').forEach(x=>x.onchange=updateSummary);
  }else{
   const available=classStudents();
   area.innerHTML=`<section class="nt-target-panel"><div class="nt-target-head"><b>Chọn học sinh nhận thông báo</b><div><button type="button" class="btn light btn-sm" id="ntSelectAllStudents">Chọn tất cả</button> <button type="button" class="btn light btn-sm" id="ntClearStudents">Bỏ chọn</button></div></div><input id="ntStudentSearch" class="nt-search" placeholder="Tìm theo họ tên, mã học sinh hoặc lớp..."><div class="nt-target-list nt-student-list">${available.map(x=>`<label class="check-item nt-target-option nt-student-option" data-search="${esc((x.ho_ten+' '+x.ma_hs+' '+x.lop).toLocaleLowerCase())}"><input type="checkbox" class="ntStudent" value="${esc(x.ma_hs)}"><span><b>${esc(x.ho_ten)}</b><small>${esc(x.lop)} · ${esc(x.ma_hs)}</small></span></label>`).join('')}</div></section>`;
   area.querySelector('#ntSelectAllStudents').onclick=()=>{area.querySelectorAll('.ntStudentOption').forEach(l=>{if(l.style.display!=='none')l.querySelector('input').checked=true});updateSummary()};area.querySelector('#ntClearStudents').onclick=()=>{area.querySelectorAll('.ntStudent').forEach(x=>x.checked=false);updateSummary()};area.querySelectorAll('.ntStudent').forEach(x=>x.onchange=updateSummary);area.querySelector('#ntStudentSearch').oninput=e=>{const q=e.target.value.toLocaleLowerCase().trim();area.querySelectorAll('.ntStudentOption').forEach(l=>l.style.display=l.dataset.search.includes(q)?'':'none');};
  }
  updateSummary();
 };
 function updateSummary(){const s=scope.value;let n=s==='Toàn trường'?active.length:s==='Lớp'?area.querySelectorAll('.ntClass:checked').length:area.querySelectorAll('.ntStudent:checked').length;summary.textContent=s==='Lớp'?`Đã chọn ${n} lớp`:s==='Cá nhân'?`Đã chọn ${n} học sinh`:`Dự kiến ${n} học sinh trong toàn trường`;}
 scope.onchange=renderTargets;root.querySelector('#ntToStudent').onchange=()=>{};root.querySelector('#ntToParent').onchange=()=>{};renderTargets();
 root.querySelector('#ntSend').onclick=async()=>{
  const title=root.querySelector('#ntTitle').value.trim(),body=root.querySelector('#ntBody').value.trim(),s=scope.value;const toStudent=root.querySelector('#ntToStudent').checked,toParent=root.querySelector('#ntToParent').checked;
  const classesSelected=s==='Lớp'?[...area.querySelectorAll('.ntClass:checked')].map(x=>x.value):[];const studentsSelected=s==='Cá nhân'?[...area.querySelectorAll('.ntStudent:checked')].map(x=>x.value):[];
  if(title.length<3||body.length<3)return toast('Nhập tiêu đề và nội dung thông báo.','err');if(!toStudent&&!toParent)return toast('Chọn ít nhất một đối tượng nhận: học sinh hoặc phụ huynh.','err');if(s==='Lớp'&&!classesSelected.length)return toast('Hãy tích chọn ít nhất một lớp.','err');if(s==='Cá nhân'&&!studentsSelected.length)return toast('Hãy tích chọn ít nhất một học sinh.','err');
  const targetDesc=s==='Toàn trường'?'toàn trường':s==='Lớp'?`${classesSelected.length} lớp`:`${studentsSelected.length} học sinh`;const recipients=[...(toStudent?['Học sinh']:[]),...(toParent?['Phụ huynh']:[])];if(!confirm(`Gửi thông báo đến ${targetDesc}, đối tượng: ${recipients.join(' và ')}?`))return;
  const btn=root.querySelector('#ntSend');btn.disabled=true;btn.textContent='Đang gửi…';
  const {data,error}=await supabase.rpc('admin_gui_thong_bao_v2',{p_ma_cb:u.ma_cb,p_mat_khau:u.credentialPassword||'',p_tieu_de:title,p_noi_dung:body,p_pham_vi:s,p_lop_list:classesSelected,p_ma_hs_list:studentsSelected,p_gui_hoc_sinh:toStudent,p_gui_phu_huynh:toParent,p_popup:root.querySelector('#ntPopup').checked,p_ticker:root.querySelector('#ntTicker').checked});
  btn.disabled=false;btn.textContent='📢 Gửi thông báo';if(error||!data?.ok)return toast(error?.message||data?.message||'Không gửi được. Hãy chạy SQL migration 024.','err');
  root.querySelector('#ntResult').innerHTML=`<div class="notice">Đã tạo <b>${data.count||0}</b> thông báo người nhận (${esc(recipients.join(' và '))}).</div>`;toast('Đã gửi thông báo.','ok');
 };
}
