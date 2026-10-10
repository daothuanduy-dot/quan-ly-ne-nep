import {supabase,PERMISSION_TABS,isAdminStaff,normalizeTabs,STAFF_ROLES,CLASS_MANAGEMENT_TYPES} from './config.js?v=3.0.5.25.33';import {DEFAULT_CRITERIA, DEFAULT_BASE_SCORES, applyDefaultCriteria} from './criteria-defaults.js?v=3.0.5.25.33';
import {esc,toast,modal,closeModal} from './ui.js?v=3.0.5.25.33';
let root,sub='students';
function isActiveStudent(r){const s=String(r&&r.trang_thai==null?'':r.trang_thai).normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();return !s||['active','dang hoc','hoc','true','1','hoat dong'].includes(s)}
export async function init(r){root=r;renderTabs();await open('students')}
function renderTabs(){root.innerHTML=`<div class="page-head"><div><h2>Quản Trị Hệ Thống</h2><p>7 chức năng quản trị được tổ chức thành một hàng sub-tab.</p></div></div><div class="subtabs">${[['students','👨‍🎓 Quản lý học sinh'],['import','📥 Nhập Excel'],['staff','👥 Quản lý người dùng'],['schedule','🕒 TKB & TG học'],['transfer','🔄 Kết chuyển & TN'],['criteria','📝 Quản lý tiêu chí'],['permissions','🔐 Phân quyền'],['examResults','📊 Kết quả kiểm tra'],['appeals','✍️ Phúc khảo'],['notices','📢 Thông báo']].map(x=>`<button data-a="${x[0]}">${x[1]}</button>`).join('')}</div><div id="adminBody"></div>`;root.querySelectorAll('[data-a]').forEach(b=>b.onclick=()=>open(b.dataset.a))}
async function open(k){sub=k;root.querySelectorAll('[data-a]').forEach(b=>b.classList.toggle('active',b.dataset.a===k));const b=root.querySelector('#adminBody');b.innerHTML='<div class="empty">Đang tải...</div>';if(k==='students')return students(b);if(k==='import')return imports(b);if(k==='staff')return staff(b);if(k==='schedule')return schedule(b);if(k==='transfer')return transfer(b);if(k==='criteria')return criteria(b);if(k==='permissions')return permissions(b);if(k==='examResults')return examResults(b);if(k==='appeals')return appealAdmin(b);if(k==='notices')return noticesAdmin(b)}
async function students(b){const {data,error}=await supabase.from('danh_sach').select('id,ma_hs,ho_ten,khoi,lop,ngay_sinh,ma_qr,trang_thai,nam_hoc,mat_khau').order('lop').order('ho_ten').limit(1000);if(error)return b.innerHTML=`<div class="danger-box">${esc(error.message)}</div>`;b.innerHTML=`<div class="toolbar"><input id="stSearch" placeholder="Tìm mã HS, họ tên, lớp"><button id="stAdd" class="btn primary">+ Thêm học sinh</button><span class="badge">${data.length} bản ghi hiển thị</span></div><div class="table-wrap"><table class="table"><thead><tr><th>Mã HS</th><th>Họ tên</th><th>Khối</th><th>Lớp</th><th>Mật khẩu</th><th>QR</th><th>Trạng thái</th><th></th></tr></thead><tbody>${data.map(x=>`<tr><td>${esc(x.ma_hs)}</td><td>${esc(x.ho_ten)}</td><td>${esc(x.khoi)}</td><td>${esc(x.lop)}</td><td><code>${esc(x.mat_khau||'123456')}</code></td><td>${esc(x.ma_qr||'')}</td><td>${esc(x.trang_thai||'')}</td><td><button class="btn light st-edit" data-id="${x.id}">Sửa</button></td></tr>`).join('')}</tbody></table></div>`;const filter=()=>b.querySelectorAll('tbody tr').forEach(tr=>tr.style.display=tr.textContent.toLowerCase().includes((b.querySelector('#stSearch').value||'').toLowerCase())?'':'none');b.querySelector('#stSearch').oninput=filter;b.querySelector('#stAdd').onclick=()=>studentForm(null);b.querySelectorAll('.st-edit').forEach(btn=>btn.onclick=()=>studentForm(data.find(x=>String(x.id)===btn.dataset.id)));}
async function studentForm(s){
 const x=s||{};
 const existing=s?await getStudentStaff(x.ma_hs):null;
 const isCb=!!(existing&&String(existing.vai_tro)==='Cán bộ lớp'&&existing.trang_thai!==false);
 const m=modal(s?'Sửa học sinh':'Thêm học sinh',`<div class="grid"><label>Mã học sinh<input id="f_ma" value="${esc(x.ma_hs)}"></label><label>Họ tên<input id="f_name" value="${esc(x.ho_ten)}"></label><label>Khối<input id="f_khoi" value="${esc(x.khoi)}"></label><label>Lớp<input id="f_lop" value="${esc(x.lop)}"></label><label>Ngày sinh<input id="f_ns" type="date" value="${esc(x.ngay_sinh)}"></label><label>Mã QR<input id="f_qr" value="${esc(x.ma_qr)}"></label><label>Mật khẩu phụ huynh/học sinh<input id="f_pw" type="text" value="${esc(x.mat_khau||'123456')}" autocomplete="off"></label><label>Trạng thái<select id="f_status"><option ${x.trang_thai==='Active'?'selected':''}>Active</option><option ${x.trang_thai==='Inactive'?'selected':''}>Inactive</option></select></label><label>Năm học<input id="f_year" value="${esc(x.nam_hoc||'2026-2027')}"></label></div><div class="staff-section" style="margin-top:14px"><div class="staff-section-title">Tài khoản cán bộ lớp</div><label style="display:flex;align-items:center;gap:10px;font-weight:700"><input id="f_cb_lop" type="checkbox" ${isCb?'checked':''}> Đánh dấu học sinh là <b>Cán bộ lớp</b></label><div class="scope-help">Khi tích chọn, hệ thống tự tạo/kích hoạt tài khoản Cán bộ lớp với mã tài khoản bằng Mã học sinh, mật khẩu mặc định <b>123456</b>, gắn đúng lớp và học sinh này. Khi bỏ chọn, tài khoản Cán bộ lớp hiện có sẽ được khóa, không xóa dữ liệu.</div><div id="f_cb_info" class="notice" style="margin-top:10px">${existing?`Tài khoản CB lớp: <b>${esc(existing.ma_cb)}</b>${existing.trang_thai===false?' (đang khóa)':' (đang hoạt động)'}`:'Chưa có tài khoản Cán bộ lớp.'}</div></div>`,`<button id="f_cancel" class="btn light">Hủy</button><button id="f_save" class="btn primary">Lưu</button>`);
 m.querySelector('#f_cancel').onclick=closeModal;
 m.querySelector('#f_save').onclick=async()=>{
  const payload={ma_hs:m.querySelector('#f_ma').value.trim(),ho_ten:m.querySelector('#f_name').value.trim(),khoi:m.querySelector('#f_khoi').value.trim(),lop:m.querySelector('#f_lop').value.trim(),ngay_sinh:m.querySelector('#f_ns').value||null,ma_qr:m.querySelector('#f_qr').value.trim()||null,trang_thai:m.querySelector('#f_status').value,nam_hoc:m.querySelector('#f_year').value.trim(),mat_khau:m.querySelector('#f_pw').value||'123456'};
  if(!payload.ma_hs||!payload.ho_ten)return toast('Mã học sinh và họ tên là bắt buộc.','err');
  if(!payload.lop&&m.querySelector('#f_cb_lop').checked)return toast('Cán bộ lớp phải có lớp của học sinh.','err');
  let q=supabase.from('danh_sach');const res=s?q.update(payload).eq('id',s.id):q.insert(payload);const {error}=await res;if(error)return toast(error.message,'err');
  const cbChecked=m.querySelector('#f_cb_lop').checked;
  const current=await getStudentStaff(payload.ma_hs);
  if(cbChecked){
   const cbPayload={ma_cb:payload.ma_hs,ho_ten:payload.ho_ten,mat_khau:current&&current.mat_khau?current.mat_khau:'123456',vai_tro:'Cán bộ lớp',vai_tro_list:['Cán bộ lớp'],lop_quan_ly:payload.lop,lop_giang_day:[],quyen_tabs:['chamdiem'],trang_thai:true,ma_hs:payload.ma_hs,loai_quan_ly_lop:'Cán bộ lớp'};
   const cbRes=current?await supabase.from('can_bo').update(cbPayload).eq('ma_cb',current.ma_cb):await supabase.from('can_bo').insert(cbPayload);
   if(cbRes.error)return toast('Đã lưu học sinh nhưng chưa tạo được tài khoản Cán bộ lớp: '+cbRes.error.message,'err');
  }else if(current&&String(current.vai_tro)==='Cán bộ lớp'){
   const off=await supabase.from('can_bo').update({trang_thai:false}).eq('ma_cb',current.ma_cb);
   if(off.error)return toast('Đã lưu học sinh nhưng không khóa được tài khoản Cán bộ lớp: '+off.error.message,'err');
  }
  closeModal();toast(cbChecked?'Đã lưu học sinh và tài khoản Cán bộ lớp.':'Đã lưu học sinh.','ok');await students(root.querySelector('#adminBody'));
 };
}
async function getStudentStaff(maHs){if(!maHs)return null;const {data,error}=await supabase.from('can_bo').select('ma_cb,ho_ten,mat_khau,vai_tro,trang_thai,ma_hs,lop_quan_ly').eq('ma_hs',maHs).eq('vai_tro','Cán bộ lớp').order('trang_thai',{ascending:false}).limit(1);if(error)return null;return data&&data[0]?data[0]:null;}
async function imports(b){b.innerHTML=`<div class="notice"><b>Nhập Excel:</b> file nên có các cột <code>ma_hs, ho_ten, khoi, lop, ngay_sinh, ma_qr</code>. Hệ thống hiển thị bản xem trước trước khi ghi.</div><label>Chọn file Excel<input id="excelFile" type="file" accept=".xlsx,.xls,.csv"></label><div id="preview"></div>`;b.querySelector('#excelFile').onchange=async e=>{const f=e.target.files[0];if(!f)return;if(!window.XLSX)return toast('Thư viện Excel chưa tải xong.','err');const buf=await f.arrayBuffer(),wb=XLSX.read(buf,{type:'array'}),ws=wb.Sheets[wb.SheetNames[0]],rows=XLSX.utils.sheet_to_json(ws,{defval:''});b.querySelector('#preview').innerHTML=`<div class="toolbar"><span class="badge">${rows.length} dòng</span><button id="importDo" class="btn primary">Ghi vào danh_sach</button></div><div class="table-wrap"><table class="table"><thead><tr>${Object.keys(rows[0]||{}).slice(0,8).map(k=>`<th>${esc(k)}</th>`).join('')}</tr></thead><tbody>${rows.slice(0,30).map(r=>`<tr>${Object.keys(rows[0]||{}).slice(0,8).map(k=>`<td>${esc(r[k])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;b.querySelector('#importDo').onclick=async()=>{const payload=rows.map(r=>({ma_hs:String(r.ma_hs||r['Mã HS']||'').trim(),mat_khau:String(r.mat_khau||r['Mật khẩu']||'123456'),ho_ten:String(r.ho_ten||r['Họ tên']||'').trim(),khoi:String(r.khoi||r['Khối']||'').trim()||null,lop:String(r.lop||r['Lớp']||'').trim()||null,ngay_sinh:r.ngay_sinh||r['Ngày sinh']||null,ma_qr:String(r.ma_qr||r['Mã QR']||'').trim()||null,trang_thai:'Active',nam_hoc:'2026-2027'})).filter(x=>x.ma_hs&&x.ho_ten);if(!payload.length)return toast('Không có dòng hợp lệ.','err');const {error}=await supabase.from('danh_sach').upsert(payload,{onConflict:'ma_hs'});if(error)return toast(error.message,'err');toast(`Đã nhập ${payload.length} học sinh.`,'ok');};};}
async function fetchAll(factory,chunk=1000){const all=[];let from=0;while(true){const {data,error}=await factory().range(from,from+chunk-1);if(error)throw error;const rows=data||[];all.push(...rows);if(rows.length<chunk)break;from+=chunk}return all}
async function staff(b){
 try{
  const [{data,error},classes]=await Promise.all([
   supabase.from('can_bo').select('ma_cb,ho_ten,mat_khau,vai_tro,vai_tro_list,lop_quan_ly,lop_giang_day,quyen_tabs,trang_thai,ma_hs,loai_quan_ly_lop').order('ho_ten'),
   loadClassList()
  ]);
  if(error)throw error;
  b.innerHTML=`<div class="page-head"><div><h3 style="margin:0">Quản lý người dùng</h3><p>Quản lý tài khoản, vai trò và phạm vi lớp được phép thao tác.</p></div><span class="badge">${data.length} tài khoản</span></div>
  <div class="notice"><b>Phạm vi sử dụng:</b> GVCN quản lý lớp chủ nhiệm; Giáo viên quản lý các lớp giảng dạy; Cán bộ lớp là tài khoản học sinh và chỉ được chấm điểm cá nhân trong lớp được phân công.</div>
  <div class="toolbar"><button id="cbAdd" class="btn primary">+ Thêm tài khoản</button></div>
  <div class="table-wrap"><table class="table"><thead><tr><th>Mã CB</th><th>Họ tên</th><th>Vai trò</th><th>Phạm vi lớp</th><th>Tài khoản học sinh</th><th>Trạng thái</th><th></th></tr></thead><tbody>${data.map(x=>`<tr><td>${esc(x.ma_cb)}</td><td>${esc(x.ho_ten)}</td><td>${esc(roleLabel(x.vai_tro))} ${isAdminStaff(x)?'<span class="badge admin">Admin</span>':''}</td><td>${esc(scopeLabel(x))}</td><td>${x.ma_hs?`<span class="badge blue">${esc(x.ma_hs)}</span>`:'—'}</td><td>${x.trang_thai?'<span class="badge ok">Hoạt động</span>':'<span class="badge">Khóa</span>'}</td><td><button class="btn light cb-edit" data-ma="${esc(x.ma_cb)}">Sửa</button></td></tr>`).join('')}</tbody></table></div>`;
  b.querySelector('#cbAdd').onclick=()=>staffForm(null,classes);
  b.querySelectorAll('.cb-edit').forEach(btn=>btn.onclick=()=>staffForm(data.find(x=>x.ma_cb===btn.dataset.ma),classes));
 }catch(e){b.innerHTML=`<div class="danger-box">${esc(e.message)}<br><small>Nếu lỗi liên quan <code>ma_hs</code> hoặc <code>loai_quan_ly_lop</code>, hãy chạy SQL migration 012 của V3.0.5.9.</small></div>`}
}
async function loadClassList(){
 const data=await fetchAll(()=>supabase.from('danh_sach').select('lop,trang_thai').not('lop','is',null).order('lop'));
 return [...new Set(data.filter(isActiveStudent).map(x=>String(x.lop||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'vi',{numeric:true,sensitivity:'base'}));
}
function roleLabel(v){return STAFF_ROLES.find(x=>x.key===v)?.label||v||''}
function scopeLabel(x){
 const role=String(x.vai_tro||'');
 if(role==='GVCN')return x.lop_quan_ly?`Chủ nhiệm: ${x.lop_quan_ly}`:'Chưa phân lớp';
 if(role==='Giáo viên')return Array.isArray(x.lop_giang_day)&&x.lop_giang_day.length?`Giảng dạy: ${x.lop_giang_day.join(', ')}`:'Chưa phân lớp';
 if(role==='Cán bộ lớp')return x.lop_quan_ly?`Cán bộ lớp: ${x.lop_quan_ly}`:'Chưa phân lớp';
 if(role==='Cờ đỏ')return 'Quét QR toàn trường';
 if(role==='Trực')return 'Theo dõi báo vắng';
 return 'Toàn hệ thống';
}
function staffForm(s,classes){
 const x=s||{};const role=x.vai_tro||'Giáo viên';
 const m=modal(s?'Sửa tài khoản':'Thêm tài khoản',`<div class="staff-form">
 <div class="staff-section"><div class="staff-section-title">Thông tin tài khoản</div><div class="grid">
 <label>Mã tài khoản<input id="c_ma" value="${esc(x.ma_cb)}" ${s?'readonly':''} required></label>
 <label>Họ tên<input id="c_name" value="${esc(x.ho_ten)}" required></label>
 <label>Mật khẩu<input id="c_pw" type="password" placeholder="${s?'Để trống nếu không đổi':'Mặc định 123456'}"></label>
 <label>Vai trò<select id="c_role">${STAFF_ROLES.map(r=>`<option value="${esc(r.key)}" ${r.key===role?'selected':''}>${esc(r.label)}</option>`).join('')}</select></label>
 </div></div>
 <div class="staff-section"><div class="staff-section-title">Phạm vi lớp</div>
 <div id="classScopeArea"></div></div>
 <div class="staff-section"><div class="grid"><label>Trạng thái<select id="c_status"><option value="true" ${x.trang_thai!==false?'selected':''}>Hoạt động</option><option value="false" ${x.trang_thai===false?'selected':''}>Khóa</option></select></label></div></div>
 </div>`,`<button id="c_cancel" class="btn light">Hủy</button><button id="c_save" class="btn primary">Lưu</button>`);
 const roleEl=m.querySelector('#c_role');
 const area=m.querySelector('#classScopeArea');
 const studentEl=m.querySelector('#c_student');
 function renderScope(){
  const r=roleEl.value;
  if(r==='GVCN'){
   area.innerHTML=`<label>Lớp chủ nhiệm<select id="c_class">${classOptions(classes,x.lop_quan_ly)}</select></label><div class="scope-help">GVCN có quyền cập nhật điểm/báo vắng cho lớp chủ nhiệm và xem thống kê toàn trường.</div>`;
  }else if(r==='Giáo viên'){
   const selected=Array.isArray(x.lop_giang_day)?x.lop_giang_day:normalizeTabs(x.lop_giang_day);
   area.innerHTML=`<label>Các lớp giảng dạy<select id="c_classes" multiple size="6">${classes.map(c=>`<option value="${esc(c)}" ${selected.includes(c)?'selected':''}>${esc(c)}</option>`).join('')}</select></label><div class="scope-help">Giáo viên chỉ được cập nhật điểm và báo vắng trong các lớp được chọn.</div>`;
  }else if(r==='Cán bộ lớp'){
   const note='Tài khoản Cán bộ lớp phải gắn với đúng 01 lớp và 01 học sinh trong lớp. Tài khoản chỉ được nhập điểm cá nhân cho học sinh của lớp được phân công và nhập điểm Sổ đầu bài của chính lớp đó.';
   area.innerHTML=`<label>Lớp cán bộ lớp<select id="c_class">${classOptions(classes,x.lop_quan_ly)}</select></label><label style="margin-top:10px;display:block">Học sinh liên kết<select id="c_student"><option value="">-- Chọn học sinh --</option></select></label><div class="scope-help">${note}</div>`;
   loadStudentsForClass(m,x.lop_quan_ly||'');
  }else if(r==='Cờ đỏ'){
   area.innerHTML=`<div class="notice"><b>Cờ đỏ:</b> không cần gán lớp và không cần liên kết học sinh. Tài khoản được phép mở chức năng <b>Quét QR thẻ HS</b> và quét học sinh ở <b>tất cả các lớp</b>.</div>`;
  }else if(r==='Trực'){
   area.innerHTML=`<div class="notice"><b>Cán bộ trực:</b> theo dõi tình trạng báo vắng của các lớp theo lịch học. Không được sửa điểm hoặc báo vắng thay cho giáo viên.</div>`;
  }else{
   area.innerHTML=`<div class="notice">Admin có phạm vi toàn hệ thống, không cần gán lớp.</div>`;
  }
  const cls=m.querySelector('#c_class');
  if(cls)cls.onchange=()=>{if(roleEl.value==='Cán bộ lớp')loadStudentsForClass(m,cls.value)};
 }
 async function loadStudentsForClass(mod,cls){
  const el=mod.querySelector('#c_student');if(!el)return;
  if(!cls){el.innerHTML='<option value="">-- Chọn lớp trước --</option>';return}
  const {data,error}=await supabase.from('danh_sach').select('ma_hs,ho_ten,ngay_sinh,lop,trang_thai').eq('lop',cls).order('ho_ten');
  if(error){el.innerHTML='<option value="">Không tải được học sinh</option>';return}
  const activeStudents=(data||[]).filter(isActiveStudent);
  el.innerHTML='<option value="">-- Chọn học sinh --</option>'+(activeStudents).map(st=>`<option value="${esc(st.ma_hs)}" ${st.ma_hs===x.ma_hs?'selected':''}>${esc(st.ho_ten)} — ${formatDate(st.ngay_sinh)}</option>`).join('');
 }
 renderScope();
 m.querySelector('#c_cancel').onclick=closeModal;
 m.querySelector('#c_save').onclick=async()=>{
  const r=roleEl.value;const payload={ma_cb:m.querySelector('#c_ma').value.trim(),ho_ten:m.querySelector('#c_name').value.trim(),vai_tro:r,trang_thai:m.querySelector('#c_status').value==='true'};
  if(!payload.ma_cb||!payload.ho_ten)return toast('Mã tài khoản và họ tên là bắt buộc.','err');
  const pw=m.querySelector('#c_pw').value;if(pw)payload.mat_khau=pw;
  if(r==='GVCN'){payload.lop_quan_ly=m.querySelector('#c_class')?.value||null;payload.lop_giang_day=[];payload.loai_quan_ly_lop='Chủ nhiệm';payload.ma_hs=null}
  else if(r==='Giáo viên'){payload.lop_quan_ly=null;payload.lop_giang_day=[...(m.querySelector('#c_classes')?.selectedOptions||[])].map(o=>o.value);payload.loai_quan_ly_lop='Giảng dạy';payload.ma_hs=null}
  else if(r==='Cán bộ lớp'){
   payload.lop_quan_ly=m.querySelector('#c_class')?.value||null;
   payload.lop_giang_day=[];
   payload.loai_quan_ly_lop='Cán bộ lớp';
   payload.ma_hs=m.querySelector('#c_student')?.value||null;
   if(!payload.lop_quan_ly)return toast('Cán bộ lớp phải chọn lớp phụ trách.','err');
   if(!payload.ma_hs)return toast('Cán bộ lớp phải chọn học sinh liên kết.','err');
   const {data:linked,error:linkError}=await supabase.from('danh_sach').select('ma_hs,lop').eq('ma_hs',payload.ma_hs).limit(1);
   if(linkError)return toast('Không kiểm tra được học sinh liên kết: '+linkError.message,'err');
   if(!linked?.[0]||String(linked[0].lop||'').trim()!==String(payload.lop_quan_ly).trim())return toast('Học sinh liên kết phải thuộc đúng lớp đã chọn.','err');
  }
  else if(r==='Cờ đỏ'){
   payload.lop_quan_ly=null;
   payload.lop_giang_day=[];
   payload.loai_quan_ly_lop='Cờ đỏ';
   payload.ma_hs=null;
  }
  else if(r==='Trực'){payload.lop_quan_ly=null;payload.lop_giang_day=[];payload.loai_quan_ly_lop='Trực';payload.ma_hs=null}
  else{payload.lop_quan_ly='ALL';payload.lop_giang_day=[];payload.loai_quan_ly_lop='';payload.ma_hs=null}
  if(!s)payload.quyen_tabs=defaultTabsForRole(r);
  const q=s?supabase.from('can_bo').update(payload).eq('ma_cb',s.ma_cb):supabase.from('can_bo').insert(payload);
  const {error}=await q;if(error)return toast(error.message,'err');closeModal();toast('Đã lưu tài khoản và phạm vi sử dụng.','ok');await staff(root.querySelector('#adminBody'));
 };
}
function classOptions(classes,selected){return '<option value="">-- Chọn lớp --</option>'+classes.map(c=>`<option value="${esc(c)}" ${c===selected?'selected':''}>${esc(c)}</option>`).join('')}
function formatDate(v){const m=String(v||'').match(/^(\d{4})-(\d{2})-(\d{2})/);return m?`${m[3]}/${m[2]}/${m[1]}`:''}
function defaultTabsForRole(r){if(r==='Admin')return PERMISSION_TABS.map(x=>x.key);if(r==='GVCN')return ['baovang','chamdiem','thongke','xeploai'];if(r==='Giáo viên')return ['baovang','chamdiem','thongke'];if(r==='Cán bộ lớp')return ['chamdiem'];if(r==='Cờ đỏ')return ['qr'];if(r==='Trực')return ['baovang'];return []}
async function schedule(b){
  let view='grid';
  let rows=[];
  let classes=[];
  try{classes=await loadClassList();}catch(e){return b.innerHTML=`<div class="danger-box">${esc(e.message)}</div>`}

  const days=[2,3,4,5,6];
  const dayName=n=>`Thứ ${n}`;
  const gradeOf=lop=>{const m=String(lop||'').match(/^(10|11|12)/);return m?`Khối ${m[1]}`:''};
  const scopeLabel=x=>x.lop?x.lop:(x.khoi?`${x.khoi} (tất cả lớp)`:'Toàn trường');
  const reload=async()=>{const q=await supabase.from('thoi_khoa_bieu').select('id,nam_hoc,thu,buoi,khoi,lop,trang_thai').eq('nam_hoc','2026-2027').order('thu').order('buoi').order('khoi').order('lop');if(q.error)return b.innerHTML=`<div class="danger-box">${esc(q.error.message)}</div>`;rows=q.data||[];render();};

  function render(){
    b.innerHTML=`<div class="notice">
      <b>Thiết lập thời khóa biểu — Năm học 2026-2027.</b> Chỉ khai báo <b>thứ + buổi + phạm vi áp dụng</b>. Có thể chọn <b>nhiều thứ (Thứ 2–Thứ 6)</b>, <b>nhiều buổi</b> và <b>nhiều lớp cùng lúc</b> trong một lần lưu.
      TKB là căn cứ duy nhất để cho phép/từ chối ghi nhận Báo vắng và Quét QR Đi muộn.
    </div>
    <div class="toolbar"><button id="tkbAdd" class="btn primary">+ Thiết lập lịch học</button><button id="tkbReload" class="btn light">↻ Cập nhật</button><span class="badge">${rows.filter(x=>x.trang_thai==='Hoạt động').length} cấu hình đang hoạt động</span></div>
    <div class="subtabs schedule-tabs"><button data-view="grid" class="${view==='grid'?'active':''}">📅 Lịch học</button><button data-view="time" class="${view==='time'?'active':''}">⏱ Thời gian điểm danh</button><button data-view="test" class="${view==='test'?'active':''}">🧪 Kiểm tra hôm nay</button></div>
    <div id="scheduleBody"></div>`;
    b.querySelectorAll('[data-view]').forEach(x=>x.onclick=()=>{view=x.dataset.view;render()});
    b.querySelector('#tkbAdd').onclick=()=>scheduleForm(null);
    b.querySelector('#tkbReload').onclick=reload;
    const body=b.querySelector('#scheduleBody');
    if(view==='grid')return renderGrid(body);
    if(view==='time')return renderTime(body);
    return renderToday(body);
  }

  function renderGrid(body){
    const groups={};
    rows.forEach(x=>{const key=`${x.thu}|${x.buoi}`;(groups[key]??=[]).push(x)});
    body.innerHTML=`<div class="notice"><b>Cách hiểu:</b> mỗi bản ghi xác định một phạm vi học. <b>Toàn trường</b> áp dụng cho mọi lớp; <b>khối</b> áp dụng cho mọi lớp trong khối; <b>lớp</b> áp dụng riêng lớp được chọn. Một lần thiết lập có thể tạo nhiều bản ghi cho nhiều ngày/buổi/lớp.</div>
      <div class="table-wrap"><table class="table"><thead><tr><th>Thứ</th><th>Buổi</th><th>Phạm vi</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>${rows.map(x=>`<tr><td><b>${esc(dayName(Number(x.thu)))}</b></td><td>${esc(x.buoi)}</td><td>${esc(scopeLabel(x))}</td><td>${x.trang_thai==='Hoạt động'?'<span class="badge ok">Hoạt động</span>':'<span class="badge">Tạm dừng</span>'}</td><td><button class="btn light tkb-edit" data-id="${esc(x.id)}">Sửa</button> <button class="btn danger tkb-del" data-id="${esc(x.id)}">Xóa</button></td></tr>`).join('')||'<tr><td colspan="5"><div class="empty">Chưa có lịch học. Hãy thiết lập lịch đầu tiên.</div></td></tr>'}</tbody></table></div>`;
    body.querySelectorAll('.tkb-edit').forEach(btn=>btn.onclick=()=>scheduleForm(rows.find(x=>String(x.id)===btn.dataset.id)));
    body.querySelectorAll('.tkb-del').forEach(btn=>btn.onclick=async()=>{const r=rows.find(x=>String(x.id)===btn.dataset.id);const m=modal('Xác nhận xóa lịch học',`<div class="notice warn">Lịch <b>${esc(dayName(Number(r.thu)))}</b> · <b>${esc(r.buoi)}</b> · <b>${esc(scopeLabel(r))}</b> sẽ bị xóa.<br>Thao tác này không xóa dữ liệu báo vắng/đi muộn đã phát sinh.</div>`,`<button id="xno" class="btn light">Hủy</button><button id="xyes" class="btn danger">Xóa lịch</button>`);m.querySelector('#xno').onclick=closeModal;m.querySelector('#xyes').onclick=async()=>{const q=await supabase.from('thoi_khoa_bieu').delete().eq('id',r.id);if(q.error)return toast(q.error.message,'err');closeModal();toast('Đã xóa lịch học.','ok');await reload()}});
  }

  async function renderTime(body){
    const q=await supabase.from('cai_dat_thoi_gian').select('*').eq('nam_hoc','2026-2027').order('khoi').order('lop').order('tu_tiet');
    if(q.error)return body.innerHTML=`<div class="danger-box">${esc(q.error.message)}</div>`;
    const a=q.data||[];
    body.innerHTML=`<div class="notice"><b>Thời gian điểm danh</b> chỉ xác định buổi hiện tại/cửa sổ thao tác. <b>TKB quyết định lớp có học hay không.</b><br>Quy ước mới: <b>buổi chiều bắt đầu lúc 14:00 và tiết đầu buổi chiều là tiết 2</b>. Bạn có thể cấu hình hàng loạt bên dưới.</div>
      <div class="toolbar"><button id="timeBulk" class="btn primary">⚙ Thiết lập giờ theo lớp</button><button id="timeReload" class="btn light">↻ Cập nhật</button><span class="badge">${a.length} cấu hình</span></div>
      <div class="table-wrap"><table class="table"><thead><tr><th>Khối</th><th>Lớp</th><th>Buổi</th><th>Tiết</th><th>Bắt đầu</th><th>Kết thúc</th><th>Trạng thái</th></tr></thead><tbody>${a.map(x=>`<tr><td>${esc(x.khoi)}</td><td>${esc(x.lop)}</td><td>${esc(x.buoi)}</td><td>${esc(x.tu_tiet)}-${esc(x.den_tiet)}</td><td>${esc(x.gio_bat_dau_diem_danh)}</td><td>${esc(x.gio_ket_thuc_diem_danh)}</td><td>${esc(x.trang_thai)}</td></tr>`).join('')||'<tr><td colspan="7"><div class="empty">Chưa có cấu hình.</div></td></tr>'}</tbody></table></div>`;
    body.querySelector('#timeReload').onclick=()=>renderTime(body);
    body.querySelector('#timeBulk').onclick=()=>timeBulkForm();
  }
  async function timeBulkForm(){
    const {data,error}=await supabase.from('danh_sach').select('lop,khoi').eq('trang_thai','Active').not('lop','is',null).order('lop');
    if(error)return toast(error.message,'err');
    const normalizeGrade=v=>{const m=String(v||'').match(/(?:Khối\s*)?(10|11|12)/i);return m?`Khối ${m[1]}`:''};
    const cls=[...new Map((data||[]).map(x=>{const lop=String(x.lop||'').trim();return [lop,{lop,khoi:normalizeGrade(x.khoi)||normalizeGrade(lop)}]}).filter(x=>x[0])).values()].sort((a,b)=>a.lop.localeCompare(b.lop,'vi',{numeric:true}));
    const m=modal('Thiết lập thời gian điểm danh',`<div class="notice"><b>Lưu ý:</b> phần này chỉ thiết lập <b>khung giờ điểm danh</b>, không tạo TKB. TKB ở tab “Lịch học” vẫn là điều kiện bắt buộc để Báo vắng/Quét QR được ghi dữ liệu.</div>
      <div class="grid"><label>Phạm vi áp dụng<select id="tm_scope">
        <option value="all">Toàn trường</option>
        <option value="grade">Theo khối</option>
        <option value="assignment">Theo phân công buổi học (TKB)</option>
        <option value="class">Chọn các lớp</option>
      </select></label><label id="tm_grade_wrap">Khối<select id="tm_grade"><option>Khối 10</option><option>Khối 11</option><option>Khối 12</option></select></label></div>
      <div id="tm_assignment_note" class="notice" style="display:none;margin-top:10px">Hệ thống sẽ tự lấy các lớp đang có lịch <b>Hoạt động</b> trong TKB theo từng buổi. Nếu chọn cả Sáng và Chiều, mỗi buổi sẽ áp dụng đúng cho các lớp có phân công buổi đó.</div>
      <div id="tm_classes" class="staff-section" style="display:none;margin-top:10px"><div class="staff-section-title">Lớp áp dụng <span id="tm_class_count" class="badge"></span></div><div class="toolbar"><button type="button" id="tm_all" class="btn light">Chọn tất cả lớp khối</button><button type="button" id="tm_none" class="btn light">Bỏ chọn</button></div><div id="tm_class_list" style="display:grid;grid-template-columns:repeat(4,minmax(100px,1fr));gap:6px;max-height:190px;overflow:auto;border:1px solid #ddd;border-radius:10px;padding:8px"></div></div>
      <div class="staff-section" style="margin-top:10px"><div class="staff-section-title">Buổi và khung giờ</div><div class="grid"><label><input id="tm_morning" type="checkbox" checked> Sáng</label><label><input id="tm_afternoon" type="checkbox" checked> Chiều</label><label>Tiết đầu sáng<input id="tm_m1" type="number" min="1" value="1"></label><label>Tiết cuối sáng<input id="tm_m2" type="number" min="1" value="5"></label><label>Bắt đầu sáng<input id="tm_ms" type="time" value="07:00"></label><label>Kết thúc sáng<input id="tm_me" type="time" value="11:30"></label><label>Tiết đầu chiều<input id="tm_a1" type="number" min="1" value="2"></label><label>Tiết cuối chiều<input id="tm_a2" type="number" min="2" value="5"></label><label>Bắt đầu chiều<input id="tm_as" type="time" value="14:00"></label><label>Kết thúc chiều<input id="tm_ae" type="time" value="17:30"></label></div></div>`,`<button id="tm_cancel" class="btn light">Hủy</button><button id="tm_save" class="btn primary">Lưu cấu hình</button>`);
    const scope=m.querySelector('#tm_scope'),gw=m.querySelector('#tm_grade_wrap'),cw=m.querySelector('#tm_classes'),cl=m.querySelector('#tm_class_list'),assignNote=m.querySelector('#tm_assignment_note');
    const renderClassChecks=(list,selected=[])=>{cl.innerHTML=list.length?list.map(x=>`<label class="check-item"><input class="tm_cls" type="checkbox" value="${esc(x.lop)}" data-grade="${esc(x.khoi)}" ${selected.includes(x.lop)?'checked':''}><span>${esc(x.lop)}</span></label>`).join(''):'<div class="empty">Không có lớp phù hợp.</div>';updateCount()};
    const updateCount=()=>{const el=m.querySelector('#tm_class_count');if(el)el.textContent=`${cl.querySelectorAll('.tm_cls:checked').length} lớp đã chọn`};
    const refreshClassArea=()=>{const isGrade=scope.value==='grade',isClass=scope.value==='class',isAssign=scope.value==='assignment';gw.style.display=isGrade?'block':'none';cw.style.display=(isGrade||isClass)?'block':'none';assignNote.style.display=isAssign?'block':'none';if(isGrade)renderClassChecks(cls.filter(x=>x.khoi===m.querySelector('#tm_grade').value));else if(isClass)renderClassChecks(cls);else cl.innerHTML='';updateCount();};
    scope.onchange=refreshClassArea;m.querySelector('#tm_grade').onchange=refreshClassArea;m.querySelector('#tm_all').onclick=()=>{cl.querySelectorAll('.tm_cls').forEach(x=>x.checked=true);updateCount()};m.querySelector('#tm_none').onclick=()=>{cl.querySelectorAll('.tm_cls').forEach(x=>x.checked=false);updateCount()};cl.onchange=updateCount;m.querySelector('#tm_cancel').onclick=closeModal;refreshClassArea();
    m.querySelector('#tm_save').onclick=async()=>{
      const sessions=[];if(m.querySelector('#tm_morning').checked)sessions.push({buoi:'Sáng',tu:Number(m.querySelector('#tm_m1').value),den:Number(m.querySelector('#tm_m2').value),start:m.querySelector('#tm_ms').value,end:m.querySelector('#tm_me').value});if(m.querySelector('#tm_afternoon').checked)sessions.push({buoi:'Chiều',tu:Number(m.querySelector('#tm_a1').value),den:Number(m.querySelector('#tm_a2').value),start:m.querySelector('#tm_as').value,end:m.querySelector('#tm_ae').value});
      if(!sessions.length)return toast('Chọn ít nhất một buổi.','err');
      if(sessions.some(x=>x.tu>x.den||!x.start||!x.end||x.start>=x.end))return toast('Khoảng tiết/giờ không hợp lệ.','err');
      const scopeValue=scope.value;
      let targets=scopeValue==='all'?cls:scopeValue==='grade'?cls.filter(x=>x.khoi===m.querySelector('#tm_grade').value):scopeValue==='class'?[...cl.querySelectorAll('.tm_cls:checked')].map(x=>cls.find(c=>c.lop===x.value)).filter(Boolean):[];
      if((scopeValue==='grade'||scopeValue==='class')&&!targets.length)return toast('Chưa có lớp áp dụng. Hãy kiểm tra khối hoặc tích chọn ít nhất một lớp.','err');
      let scheduleRows=null;
      if(scopeValue==='assignment'){
        const q=await supabase.from('thoi_khoa_bieu').select('thu,buoi,khoi,lop,trang_thai').eq('nam_hoc','2026-2027').eq('trang_thai','Hoạt động');
        if(q.error)return toast('Không đọc được TKB để xác định phân công buổi học: '+q.error.message,'err');
        scheduleRows=q.data||[];
        if(!scheduleRows.length)return toast('Chưa có TKB hoạt động. Hãy thiết lập Lịch học trước.','err');
      }
      const rows=[];const targetKeys=new Set();
      for(const ss of sessions){
        let sessionTargets=targets;
        if(scopeValue==='assignment'){
          const matched=new Set();scheduleRows.filter(r=>r.buoi===ss.buoi).forEach(r=>{if(r.lop)matched.add(r.lop);else if(r.khoi)cls.filter(c=>c.khoi===normalizeGrade(r.khoi)).forEach(c=>matched.add(c.lop));else cls.forEach(c=>matched.add(c.lop));});
          sessionTargets=cls.filter(c=>matched.has(c.lop));
          if(!sessionTargets.length)continue;
        }
        for(const t of sessionTargets){const key=`${t.lop}|${ss.buoi}`;if(targetKeys.has(key))continue;targetKeys.add(key);rows.push({khoi:t.khoi,lop:t.lop,buoi:ss.buoi,trang_thai:'Học',tu_tiet:ss.tu,den_tiet:ss.den,gio_bat_dau_diem_danh:ss.start,gio_ket_thuc_diem_danh:ss.end,nam_hoc:'2026-2027',updated_at:new Date().toISOString()});}
      }
      if(!rows.length)return toast(scopeValue==='assignment'?'Không có lớp nào được phân công trong các buổi đã chọn.':'Không tạo được cấu hình áp dụng.','err');
      for(const ss of sessions){for(const t of (scopeValue==='assignment'?rows.filter(r=>r.buoi===ss.buoi):rows.filter(r=>r.buoi===ss.buoi))){const d=await supabase.from('cai_dat_thoi_gian').delete().eq('nam_hoc','2026-2027').eq('lop',t.lop).eq('buoi',ss.buoi);if(d.error)return toast('Không cập nhật giờ: '+d.error.message,'err')}}
      const ins=await supabase.from('cai_dat_thoi_gian').insert(rows);if(ins.error)return toast('Không lưu cấu hình giờ: '+ins.error.message,'err');closeModal();toast(`Đã cấu hình ${rows.length} lớp. Chiều từ tiết ${sessions.find(x=>x.buoi==='Chiều')?.tu||2}, bắt đầu ${sessions.find(x=>x.buoi==='Chiều')?.start||'14:00'}.`,'ok');await renderTime(root.querySelector('#adminBody'));
    };
  }
  async function renderToday(body){const now=new Date(),dow=now.getDay(),thu=dow===0?8:dow+1,session=await detectCurrentSessionForSchedule(now);const scheduled=await resolveScheduledClasses(thu,session);body.innerHTML=`<div class="cards"><div class="action-card"><h3>📅 Hôm nay</h3><p>${now.toLocaleDateString('vi-VN')} · ${esc(dow===0?'Chủ nhật':dayName(thu))}</p></div><div class="action-card"><h3>☀️ Buổi</h3><p><b>${esc(session)}</b></p></div><div class="action-card"><h3>🏫 Lớp có lịch</h3><p><b style="font-size:24px">${scheduled.length}</b> lớp</p></div></div><div class="table-wrap" style="margin-top:14px"><table class="table"><thead><tr><th>Lớp</th><th>Phạm vi lịch</th></tr></thead><tbody>${scheduled.map(x=>`<tr><td><b>${esc(x.lop)}</b></td><td>${esc(x.source)}</td></tr>`).join('')||'<tr><td colspan="2"><div class="empty">Không có lớp nào có lịch học trong buổi hiện tại.</div></td></tr>'}</tbody></table></div><div class="notice" style="margin-top:12px">Đây chính là danh sách lớp mà Báo vắng/Quét QR sẽ được phép ghi dữ liệu.</div>`}
  async function detectCurrentSessionForSchedule(now){const t=now.toTimeString().slice(0,8);try{const q=await supabase.from('cai_dat_thoi_gian').select('buoi,gio_bat_dau_diem_danh,gio_ket_thuc_diem_danh').eq('nam_hoc','2026-2027').eq('trang_thai','Học');const hit=(q.data||[]).find(x=>String(x.gio_bat_dau_diem_danh||'').slice(0,8)<=t&&t<=String(x.gio_ket_thuc_diem_danh||'').slice(0,8));if(hit?.buoi)return hit.buoi}catch{}return now.getHours()<12?'Sáng':'Chiều'}

  async function resolveScheduledClasses(thu,session){
    const active=rows.filter(x=>Number(x.thu)===thu&&x.buoi===session&&x.trang_thai==='Hoạt động');
    const out=new Map();
    for(const r of active){
      if(r.lop){out.set(r.lop,{lop:r.lop,source:`Lớp ${r.lop}`});continue}
      if(r.khoi){classes.filter(c=>gradeOf(c)===r.khoi).forEach(c=>out.set(c,{lop:c,source:`${r.khoi} — áp dụng toàn khối`}));continue}
      classes.forEach(c=>out.set(c,{lop:c,source:'Toàn trường'}));
    }
    return [...out.values()].sort((a,b)=>a.lop.localeCompare(b.lop,'vi',{numeric:true}));
  }

  function classCheckboxes(selected=[]){return classes.map(c=>`<label class="check-item" style="display:flex;align-items:center;gap:8px;margin:0;padding:7px 9px"><input class="s_class" type="checkbox" value="${esc(c)}" ${selected.includes(c)?'checked':''}><span>${esc(c)}</span></label>`).join('')}
  function scheduleForm(row){
    const x=row||{};
    const initialGrade=x.khoi||'Khối 10';
    const initialSelected=x.lop?[x.lop]:[];
    const m=modal(row?'Sửa lịch học':'Thiết lập lịch học',`<div class="notice"><b>Thiết lập nhanh:</b> chọn nhiều ngày, nhiều buổi và phạm vi áp dụng. Hệ thống tự tạo các dòng TKB cần thiết; không nhập môn học hoặc tiết.</div>
      <div class="grid">
        <label>Phạm vi áp dụng<select id="s_scope"><option value="school" ${!x.khoi&&!x.lop?'selected':''}>Toàn trường</option><option value="grade" ${x.khoi&&!x.lop?'selected':''}>Theo khối</option><option value="class" ${x.lop?'selected':''}>Chọn các lớp</option></select></label>
        <label>Khối<select id="s_khoi"><option value="Khối 10" ${initialGrade==='Khối 10'?'selected':''}>Khối 10</option><option value="Khối 11" ${initialGrade==='Khối 11'?'selected':''}>Khối 11</option><option value="Khối 12" ${initialGrade==='Khối 12'?'selected':''}>Khối 12</option></select></label>
      </div>
      <div class="staff-section" style="margin-top:12px"><div class="staff-section-title">Ngày học trong tuần</div><div id="s_days" style="display:grid;grid-template-columns:repeat(5,minmax(90px,1fr));gap:8px">${days.map(d=>`<label class="check-item" style="margin:0"><input class="s_day" type="checkbox" value="${d}" ${Number(x.thu)===d?'checked':''}><span>${dayName(d)}</span></label>`).join('')}</div></div>
      <div class="staff-section" style="margin-top:12px"><div class="staff-section-title">Buổi học</div><div style="display:flex;gap:12px;flex-wrap:wrap"><label class="check-item" style="margin:0"><input class="s_session" type="checkbox" value="Sáng" ${x.buoi==='Sáng'?'checked':''}><span>☀️ Sáng</span></label><label class="check-item" style="margin:0"><input class="s_session" type="checkbox" value="Chiều" ${x.buoi==='Chiều'?'checked':''}><span>🌤️ Chiều</span></label></div></div>
      <div id="s_class_area" class="staff-section" style="margin-top:12px;display:none"><div class="staff-section-title">Các lớp áp dụng <span id="s_class_count" class="badge"></span></div><div class="toolbar" style="margin:8px 0"><button type="button" id="s_all" class="btn light">Chọn tất cả lớp khối</button><button type="button" id="s_none" class="btn light">Bỏ chọn</button></div><div id="s_classes" style="display:grid;grid-template-columns:repeat(4,minmax(100px,1fr));gap:6px;max-height:220px;overflow:auto;border:1px solid #ddd;border-radius:10px;padding:8px">${classCheckboxes(initialSelected)}</div></div>
      <div class="notice" style="margin-top:12px">Ví dụ: chọn <b>Thứ 2–Thứ 6 + Sáng + Khối 10</b> để áp dụng cả tuần cho khối 10. Hoặc chọn <b>Khối 11 → 11A1, 11A3, 11A5</b> để chỉ áp dụng cho các lớp được tích.</div>`,`<button id="s_cancel" class="btn light">Hủy</button><button id="s_save" class="btn primary">Lưu thiết lập</button>`);
    const scope=m.querySelector('#s_scope'), grade=m.querySelector('#s_khoi'), area=m.querySelector('#s_class_area'), clsWrap=m.querySelector('#s_classes');
    const updateClasses=()=>{
      const show=scope.value==='class';area.style.display=show?'block':'none';grade.closest('label').style.display=(scope.value==='school')?'none':'';
      if(show){const selected=[...clsWrap.querySelectorAll('.s_class:checked')].map(x=>x.value);const filtered=classes.filter(c=>gradeOf(c)===grade.value);clsWrap.innerHTML=filtered.length?classCheckboxes(selected.filter(c=>filtered.includes(c))):'<div class="empty">Không có lớp trong khối này.</div>';updateCount();}
    };
    const updateCount=()=>{const n=clsWrap.querySelectorAll('.s_class:checked').length;const el=m.querySelector('#s_class_count');if(el)el.textContent=`${n} lớp đã chọn`};
    scope.onchange=updateClasses;grade.onchange=()=>{if(scope.value==='class'){const filtered=classes.filter(c=>gradeOf(c)===grade.value);clsWrap.innerHTML=classCheckboxes([]);updateCount()}};
    m.querySelector('#s_all').onclick=()=>{clsWrap.querySelectorAll('.s_class').forEach(c=>c.checked=true);updateCount()};
    m.querySelector('#s_none').onclick=()=>{clsWrap.querySelectorAll('.s_class').forEach(c=>c.checked=false);updateCount()};
    clsWrap.onchange=updateCount;
    m.querySelector('#s_cancel').onclick=closeModal;
    updateClasses();updateCount();
    m.querySelector('#s_save').onclick=async()=>{
      const selectedDays=[...m.querySelectorAll('.s_day:checked')].map(x=>Number(x.value));
      const selectedSessions=[...m.querySelectorAll('.s_session:checked')].map(x=>x.value);
      const sc=scope.value;const khoi=grade.value;let targets=[];
      if(!selectedDays.length)return toast('Hãy chọn ít nhất một ngày từ Thứ 2 đến Thứ 6.','err');
      if(!selectedSessions.length)return toast('Hãy chọn ít nhất một buổi Sáng hoặc Chiều.','err');
      if(sc==='school')targets=[{khoi:null,lop:null,label:'Toàn trường'}];
      else if(sc==='grade')targets=[{khoi,lop:null,label:khoi}];
      else {const selected=[...m.querySelectorAll('.s_class:checked')].map(x=>x.value);if(!selected.length)return toast('Hãy chọn ít nhất một lớp.','err');targets=selected.map(lop=>({khoi:gradeOf(lop),lop,label:lop}));}
      const payloads=[];for(const d of selectedDays)for(const buoi of selectedSessions)for(const t of targets)payloads.push({nam_hoc:'2026-2027',thu:d,buoi,khoi:t.khoi,lop:t.lop,trang_thai:'Hoạt động',updated_at:new Date().toISOString()});
      const unique=[];const seen=new Set();for(const p of payloads){const key=`${p.thu}|${p.buoi}|${p.khoi||''}|${p.lop||''}`;if(!seen.has(key)){seen.add(key);unique.push(p)}}
      const existingKeys=new Set(rows.filter(r=>r.trang_thai==='Hoạt động').map(r=>`${r.thu}|${r.buoi}|${r.khoi||''}|${r.lop||''}`));
      const toInsert=unique.filter(p=>!existingKeys.has(`${p.thu}|${p.buoi}|${p.khoi||''}|${p.lop||''}`));
      if(!toInsert.length){closeModal();return rejectNotice('Không có thay đổi',`Toàn bộ ${unique.length} cấu hình bạn chọn đã tồn tại trong TKB.`)}
      const {error}=await supabase.from('thoi_khoa_bieu').insert(toInsert);
      if(error)return toast('Không lưu được TKB: '+error.message,'err');
      closeModal();toast(`Đã lưu ${toInsert.length} cấu hình TKB. ${unique.length-toInsert.length} cấu hình trùng được bỏ qua.`,'ok');await reload();
    };
  }
  function rejectNotice(title,msg){const m=modal(title,`<div class="notice warn">${esc(msg)}<br><b>Hệ thống không ghi thêm dữ liệu trùng vào CSDL.</b></div>`,`<button id="ack" class="btn primary">Đã hiểu</button>`);m.querySelector('#ack').onclick=closeModal}
  await reload();
}

async function transfer(b){b.innerHTML=`<div class="cards"><div class="action-card"><h3>🔄 Kết chuyển học sinh</h3><p>Gọi RPC <code>ket_chuyen_hoc_sinh</code> để kết chuyển một học sinh sang khối/lớp/năm học mới.</p><div class="action-row"><button id="transferOne" class="btn primary">Thực hiện</button></div></div><div class="action-card"><h3>🎓 Tốt nghiệp học sinh</h3><p>Gọi RPC <code>tot_nghiep_hoc_sinh</code>. V3.0.4 chưa tự động chạy hàng loạt.</p><div class="action-row"><button id="grad" class="btn warn">Mở thao tác</button></div></div></div>`;b.querySelector('#transferOne').onclick=()=>toast('Đã mở khung kết chuyển. Khi chốt quy trình hàng loạt sẽ bổ sung lựa chọn lớp đích.','ok');b.querySelector('#grad').onclick=()=>toast('Chức năng tốt nghiệp đang ở chế độ an toàn, chưa tự động cập nhật hàng loạt.','ok');}
async function criteria(b){const {data,error}=await supabase.from('danh_muc_diem').select('ma_hd,ten_hd,mang,loai,diem,doi_tuong').order('mang').order('loai').order('ten_hd');if(error)return b.innerHTML=`<div class="danger-box">${esc(error.message)}</div>`;b.innerHTML=`<div class="toolbar"><button id="crAdd" class="btn primary">+ Thêm tiêu chí</button><button id="crDefaults" class="btn light">📋 Áp dụng điểm mặc định theo văn bản</button><span class="badge">${data.length} tiêu chí</span></div><div class="table-wrap"><table class="table"><thead><tr><th>Mã</th><th>Nội dung</th><th>Mảng</th><th>Loại</th><th>Điểm</th><th>Đối tượng</th><th></th></tr></thead><tbody>${data.map(x=>`<tr><td>${esc(x.ma_hd)}</td><td>${esc(x.ten_hd)}</td><td>${esc(x.mang)}</td><td>${esc(x.loai)}</td><td>${Number(x.diem)>0?'+':''}${x.diem}</td><td>${esc(x.doi_tuong)}</td><td><button class="btn light cr-edit" data-ma="${esc(x.ma_hd)}">Sửa</button></td></tr>`).join('')}</tbody></table></div>`;b.querySelector('#crAdd').onclick=()=>criteriaForm(null);b.querySelector('#crDefaults').onclick=async()=>{if(!confirm('Áp dụng/cập nhật các điểm mặc định theo văn bản tiêu chí 2025-2026? Các tiêu chí cùng mã mặc định sẽ được cập nhật điểm, mảng, loại và đối tượng.'))return;const r=await applyDefaultCriteria();if(!r.ok)return toast(r.message,'err');toast(`Đã áp dụng ${r.count} tiêu chí mặc định.`,'ok');await criteria(b)};b.querySelectorAll('.cr-edit').forEach(btn=>btn.onclick=()=>criteriaForm(data.find(x=>x.ma_hd===btn.dataset.ma)));}
function criteriaForm(s){
 const x=s||{};
 const mangs=['Nề nếp','Học tập','Đoàn đội','Hoạt động tập thể'];
 const loais=['Khen thưởng','Vi phạm'];
 const doituongs=['Cá nhân','Tập thể'];
 const selected=(arr,val)=>arr.map(v=>`<option value="${esc(v)}" ${String(v)===String(val||'')?'selected':''}>${esc(v)}</option>`).join('');
 const m=modal(s?'Sửa tiêu chí':'Thêm tiêu chí',`<div class="grid">
   <label>Mã hoạt động<input id="d_ma" value="${esc(x.ma_hd)}" ${s?'readonly':''}></label>
   <label>Tên hoạt động<input id="d_name" value="${esc(x.ten_hd)}"></label>
   <label>Mảng<select id="d_mang">${selected(mangs,x.mang||'Nề nếp')}</select></label>
   <label>Loại<select id="d_loai">${selected(loais,x.loai||'Vi phạm')}</select></label>
   <label>Điểm<input id="d_score" type="number" step="0.5" value="${x.diem??0}"></label>
   <label>Đối tượng<select id="d_obj">${selected(doituongs,x.doi_tuong||'Cá nhân')}</select></label>
 </div>`,`<button id="d_cancel" class="btn light">Hủy</button><button id="d_save" class="btn primary">Lưu</button>`);
 m.querySelector('#d_cancel').onclick=closeModal;
 m.querySelector('#d_save').onclick=async()=>{
   const ma=m.querySelector('#d_ma').value.trim(),name=m.querySelector('#d_name').value.trim(),score=Number(m.querySelector('#d_score').value||0);
   if(!ma||!name)return toast('Mã hoạt động và tên hoạt động không được để trống.','err');
   if(score===0)return toast('Điểm không được bằng 0. Hãy nhập điểm cộng hoặc điểm trừ.','err');
   const payload={ma_hd:ma,ten_hd:name,mang:m.querySelector('#d_mang').value,loai:m.querySelector('#d_loai').value,diem:score,doi_tuong:m.querySelector('#d_obj').value};
   const q=s?supabase.from('danh_muc_diem').update(payload).eq('ma_hd',s.ma_hd):supabase.from('danh_muc_diem').insert(payload);
   const {error}=await q;if(error)return toast(error.message,'err');
   closeModal();toast('Đã lưu tiêu chí.','ok');await criteria(root.querySelector('#adminBody'));
 };
}
async function permissions(b){const {data,error}=await supabase.from('can_bo').select('ma_cb,ho_ten,vai_tro,vai_tro_list,quyen_tabs,trang_thai').order('ho_ten');if(error)return b.innerHTML=`<div class="danger-box">${esc(error.message)}</div>`;let selected=data[0]?.ma_cb||'';const render=()=>{const s=data.find(x=>x.ma_cb===selected);const admin=isAdminStaff(s);const q=admin?PERMISSION_TABS.map(x=>x.key):normalizeTabs(s?.quyen_tabs);b.innerHTML=`<div class="notice"><b>Phân quyền JSONB:</b> chỉ sử dụng <code>can_bo.quyen_tabs</code>. Admin toàn quyền theo vai trò.</div><div class="toolbar"><select id="permUser">${data.map(x=>`<option value="${esc(x.ma_cb)}" ${x.ma_cb===selected?'selected':''}>${esc(x.ho_ten)} — ${esc(x.ma_cb)} — ${esc(x.vai_tro)}</option>`).join('')}</select></div><div class="check-grid">${PERMISSION_TABS.map(p=>`<div class="check-item"><label><input class="perm-check" value="${p.key}" type="checkbox" ${q.includes(p.key)?'checked':''} ${admin?'disabled':''}><span><b>${esc(p.label)}</b><br><small>${p.key}</small></span></label></div>`).join('')}</div>${admin?'<div class="notice" style="margin-top:12px">Tài khoản Admin không cần ghi quyền vào JSONB.</div>':'<div class="action-row"><button id="permSave" class="btn primary">Lưu quyền</button></div>'}`;b.querySelector('#permUser').onchange=e=>{selected=e.target.value;render()};b.querySelector('#permSave')?.addEventListener('click',async()=>{const q=[...b.querySelectorAll('.perm-check:checked')].map(x=>x.value);const {error}=await supabase.from('can_bo').update({quyen_tabs:q}).eq('ma_cb',selected);if(error)return toast(error.message,'err');data.find(x=>x.ma_cb===selected).quyen_tabs=q;toast('Đã lưu quyền.','ok');render()});};render();}


async function examResults(b){
 const subjects=['Toán','Văn','Tiếng Anh','Vật lý','Hoá học','Sinh học','Lịch Sử','Địa lý','GD KTPL','Tin học'];
 let students=[];try{students=await fetchAll(()=>supabase.from('danh_sach').select('ma_hs,ho_ten,khoi,lop,trang_thai').order('ma_hs'),500);}catch(e){}
 const grades=['10','11','12'];
 b.innerHTML=`<div class="notice"><b>Nhập kết quả theo từng môn và khối:</b> Mỗi file chỉ dùng cho một đợt + một môn + một khối. Cột bắt buộc: <code>ma_hs, diem</code>; có thể thêm <code>so_bao_danh, diem_trac_nghiem, diem_tu_luan, ngay_kiem_tra, ghi_chu</code>. Không có dòng nghĩa là học sinh không thi môn đó. Không dùng SBD để xác định học sinh.</div>
 <div class="exam-appeal-window"><h3>1. Đợt kiểm tra và thời hạn phúc khảo</h3><div class="exam-window-grid"><label>Tên đợt kiểm tra<input id="roundName" placeholder="VD: Khảo sát tháng 10/2026"></label><label>Loại kiểm tra<select id="roundType"><option>Khảo sát</option><option>Định kỳ</option><option>Giữa kỳ</option><option>Cuối kỳ</option><option>Thi thử</option></select></label><label>Môn thi<select id="uploadSubject">${subjects.map(x=>`<option>${x}</option>`).join('')}</select></label><label>Khối thi<select id="uploadGrade">${grades.map(x=>`<option value="${x}">Khối ${x}</option>`).join('')}</select></label><label>Ngày kiểm tra<input id="roundDate" type="date"></label><label>Năm học<input id="roundYear" value="2026-2027"></label><label>Mở phúc khảo từ<input id="appealWindowStart" type="datetime-local"></label><label>Đóng phúc khảo lúc<input id="appealWindowEnd" type="datetime-local"></label><button id="appealWindowSave" class="btn light">Lưu thời hạn phúc khảo</button></div><div id="appealWindowMessage" class="muted"></div></div>
 <div class="exam-appeal-window"><h3>2. Tải file kết quả môn/khối đã chọn</h3><p>Điểm trắc nghiệm, tự luận và điểm toàn bài được lưu riêng. SBD lưu theo từng đợt, không cố định theo học sinh.</p><div class="toolbar"><label>Chọn file Excel/CSV<input id="examFile" type="file" accept=".xlsx,.xls,.csv"></label><button id="examReload" class="btn light">Tải danh sách kết quả</button></div><div id="examPreview"></div></div>
 <div class="exam-appeal-window"><h3>3. Thông báo kết quả cho học sinh/phụ huynh</h3><p>Chỉ gửi một thông báo chung cho cả đợt sau khi Admin đã tải lên đủ các file môn/khối. Không gửi thông báo riêng cho từng môn hoặc từng điểm.</p><button id="notifyRoundResults" class="btn primary">📢 Thông báo đợt đã có kết quả</button><div id="notifyRoundStatus" class="muted"></div></div><div id="examExisting"></div>`;
 const staff=()=>window.App?.Auth?.currentUser||{};
 b.querySelector('#appealWindowSave').onclick=async()=>{const round=b.querySelector('#roundName').value.trim(),start=b.querySelector('#appealWindowStart').value,end=b.querySelector('#appealWindowEnd').value,msg=b.querySelector('#appealWindowMessage');msg.textContent='';if(!round||!start||!end)return msg.textContent='Nhập tên đợt và thời gian bắt đầu/kết thúc.';if(new Date(end)<=new Date(start))return msg.textContent='Thời điểm kết thúc phải sau thời điểm bắt đầu.';const st=staff();const {data,error}=await supabase.rpc('admin_dat_thoi_gian_phuc_khao',{p_ma_cb:st.ma_cb,p_mat_khau:st.credentialPassword||'',p_nam_hoc:b.querySelector('#roundYear').value.trim()||'2026-2027',p_dot_kiem_tra:round,p_bat_dau:new Date(start).toISOString(),p_ket_thuc:new Date(end).toISOString()});if(error||!data?.ok)return msg.textContent=error?.message||data?.message||'Không lưu được thời hạn phúc khảo. Chạy SQL migration 026.';msg.textContent='Đã lưu thời hạn phúc khảo cho đợt '+round;toast('Đã lưu thời hạn phúc khảo.','ok');};
 b.querySelector('#examFile').onchange=async e=>{const f=e.target.files?.[0];if(!f)return;if(!window.XLSX)return toast('Thư viện Excel chưa tải xong.','err');const wb=XLSX.read(await f.arrayBuffer(),{type:'array',cellDates:true}),sheet=wb.Sheets[wb.SheetNames[0]],raw=XLSX.utils.sheet_to_json(sheet,{defval:''});const get=(r,...keys)=>{for(const k of keys)if(r[k]!==undefined&&r[k]!=='')return r[k];return ''};const dateIso=v=>{if(!v)return null;if(v instanceof Date&&!Number.isNaN(v.getTime()))return v.toISOString().slice(0,10);if(typeof v==='number'){const d=XLSX.SSF.parse_date_code(v);return d?`${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`:null;}const d=new Date(v);return Number.isNaN(d.getTime())?null:d.toISOString().slice(0,10)};const payload=raw.map(r=>({ma_hs:String(get(r,'ma_hs','Mã HS','Mã học sinh')).trim(),so_bao_danh:String(get(r,'so_bao_danh','SBD','Số báo danh')).trim()||null,diem_trac_nghiem:get(r,'diem_trac_nghiem','Điểm trắc nghiệm')===''?null:Number(get(r,'diem_trac_nghiem','Điểm trắc nghiệm')),diem_tu_luan:get(r,'diem_tu_luan','Điểm tự luận')===''?null:Number(get(r,'diem_tu_luan','Điểm tự luận')),diem:Number(get(r,'diem','Điểm toàn bài','Điểm')),ngay_kiem_tra:dateIso(get(r,'ngay_kiem_tra','Ngày kiểm tra'))||b.querySelector('#roundDate').value||null,ghi_chu:String(get(r,'ghi_chu','Ghi chú')||'')}));const valid=payload.filter(x=>x.ma_hs&&Number.isFinite(x.diem)&&x.diem>=0&&x.diem<=10&&(x.diem_trac_nghiem==null||(Number.isFinite(x.diem_trac_nghiem)&&x.diem_trac_nghiem>=0&&x.diem_trac_nghiem<=10))&&(x.diem_tu_luan==null||(Number.isFinite(x.diem_tu_luan)&&x.diem_tu_luan>=0&&x.diem_tu_luan<=10)));const invalid=payload.length-valid.length; b.querySelector('#examPreview').innerHTML=`<div class="notice">File: <b>${esc(f.name)}</b><br>Đợt: <b>${esc(b.querySelector('#roundName').value||'(chưa nhập)')}</b> · Môn: <b>${esc(b.querySelector('#uploadSubject').value)}</b> · Khối: <b>${esc(b.querySelector('#uploadGrade').value)}</b><br>Đọc được <b>${valid.length}</b> dòng hợp lệ; bỏ qua <b>${invalid}</b> dòng thiếu mã hoặc điểm không hợp lệ. ${valid.length?'Kiểm tra mẫu trước khi lưu.':''}</div><div class="table-wrap sticky-table-wrap"><table class="table"><thead><tr><th>Mã HS</th><th>SBD</th><th>Trắc nghiệm</th><th>Tự luận</th><th>Điểm</th></tr></thead><tbody>${valid.slice(0,20).map(x=>`<tr><td>${esc(x.ma_hs)}</td><td>${esc(x.so_bao_danh||'—')}</td><td>${x.diem_trac_nghiem??'—'}</td><td>${x.diem_tu_luan??'—'}</td><td>${x.diem}</td></tr>`).join('')}</tbody></table></div><button id="examSave" class="btn primary">Lưu ${valid.length} kết quả cho môn/khối này</button>`;
 b.querySelector('#examSave').onclick=async()=>{const round=b.querySelector('#roundName').value.trim();if(!round)return toast('Nhập tên đợt kiểm tra trước khi lưu.','err');if(!valid.length)return toast('Không có dòng hợp lệ để nhập.','err');if(!confirm(`Lưu ${valid.length} kết quả cho ${b.querySelector('#uploadSubject').value}, khối ${b.querySelector('#uploadGrade').value}, đợt ${round}?`))return;const st=staff();const {data,error}=await supabase.rpc('admin_nhap_ket_qua_v2',{p_ma_cb:st.ma_cb,p_mat_khau:st.credentialPassword||'',p_dot:round,p_mon:b.querySelector('#uploadSubject').value,p_khoi:b.querySelector('#uploadGrade').value,p_nam_hoc:b.querySelector('#roundYear').value.trim()||'2026-2027',p_loai:b.querySelector('#roundType').value,p_ngay:b.querySelector('#roundDate').value||null,p_rows:valid});if(error||!data?.ok)return toast(error?.message||data?.message||'Không lưu được. Hãy chạy SQL migration 027.','err');toast(`Đã cập nhật ${data.count} kết quả; bỏ qua ${data.skipped||0} dòng không thuộc khối/không hợp lệ.`,'ok');await loadExisting();};};
 b.querySelector('#notifyRoundResults').onclick=async()=>{const round=b.querySelector('#roundName').value.trim();if(!round)return toast('Nhập tên đợt kiểm tra cần thông báo.','err');if(!confirm(`Gửi một thông báo chung đến học sinh/phụ huynh: đợt “${round}” đã có kết quả? Thao tác này chỉ được thực hiện một lần cho mỗi đợt.`))return;const st=staff();const {data,error}=await supabase.rpc('admin_thong_bao_ket_qua_dot',{p_ma_cb:st.ma_cb,p_mat_khau:st.credentialPassword||'',p_nam_hoc:b.querySelector('#roundYear').value.trim()||'2026-2027',p_dot:round});const status=b.querySelector('#notifyRoundStatus');if(error||!data?.ok){status.textContent=error?.message||data?.message||'Không gửi được thông báo.';return;}status.textContent=`Đã gửi một thông báo chung đến ${data.count} tài khoản học sinh/phụ huynh.`;toast('Đã gửi thông báo kết quả theo đợt.','ok');};
 async function loadExisting(){const el=b.querySelector('#examExisting'),st=staff();const {data:response,error}=await supabase.rpc('admin_lay_ket_qua',{p_ma_cb:st.ma_cb,p_mat_khau:st.credentialPassword||''});const rows=response?.rows||[];if(error||!response?.ok){el.innerHTML=`<div class="danger-box">${esc(error?.message||response?.message||'Không tải được kết quả.')}</div>`;return;}el.innerHTML=`<h3>Kết quả đã đăng tải (${rows.length} bản ghi gần nhất)</h3><div class="toolbar"><button id="downloadExamRows" class="btn light">⬇ Tải Excel danh sách</button></div><div class="table-wrap sticky-table-wrap"><table class="table"><thead><tr><th>Mã HS</th><th>Đợt</th><th>Môn</th><th>SBD</th><th>Trắc nghiệm</th><th>Tự luận</th><th>Điểm</th><th>Ngày</th><th>Ghi chú</th></tr></thead><tbody>${rows.map(x=>`<tr><td>${esc(x.ma_hs)}</td><td>${esc(x.dot_kiem_tra)}</td><td>${esc(x.mon)}</td><td>${esc(x.so_bao_danh||'—')}</td><td>${x.diem_trac_nghiem??'—'}</td><td>${x.diem_tu_luan??'—'}</td><td>${x.diem}</td><td>${esc(x.ngay_kiem_tra||'')}</td><td>${esc(x.ghi_chu||'—')}</td></tr>`).join('')}</tbody></table></div>`;el.querySelector('#downloadExamRows').onclick=()=>{if(!window.XLSX)return toast('Thư viện Excel chưa tải xong.','err');const data=rows.map(x=>({'Mã học sinh':x.ma_hs,'Đợt kiểm tra':x.dot_kiem_tra,'Môn':x.mon,'SBD':x.so_bao_danh||'','Điểm trắc nghiệm':x.diem_trac_nghiem??'','Điểm tự luận':x.diem_tu_luan??'','Điểm toàn bài':x.diem,'Ngày kiểm tra':x.ngay_kiem_tra||'','Ghi chú':x.ghi_chu||''}));const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(data),'Ket qua');XLSX.writeFile(wb,'Ket_qua_kiem_tra.xlsx');};}
 b.querySelector('#examReload').onclick=loadExisting;await loadExisting();
}

async function appealAdmin(b){
 const staff=window.App?.Auth?.currentUser||{};const {data:response,error}=await supabase.rpc('admin_lay_phuc_khao',{p_ma_cb:staff.ma_cb,p_mat_khau:staff.credentialPassword||''});const data=response?.rows||[];if(error||!response?.ok)return b.innerHTML=`<div class="danger-box">${esc(error?.message||response?.message||'Hãy chạy SQL migration 027.')}</div>`;
 b.innerHTML=`<div class="notice">Danh sách phúc khảo theo từng phần thi. Học sinh chỉ tích chọn phần Trắc nghiệm hoặc Tự luận; Admin cập nhật kết quả và đính kèm ảnh bài thi làm minh chứng sau khi rà soát.</div><div class="toolbar"><input id="appealSearchAdmin" placeholder="Tìm mã HS, họ tên, lớp, môn hoặc đợt"><select id="appealStatusFilter"><option value="">Tất cả trạng thái</option><option>Đã gửi</option><option>Đang xem xét</option><option>Đã xử lý</option><option>Từ chối</option></select><button id="appealExport" class="btn light">⬇ Tải Excel phúc khảo</button><span class="badge">${data.length} yêu cầu</span></div><div class="table-wrap sticky-table-wrap"><table class="table"><thead><tr><th>Ngày gửi</th><th>Mã HS</th><th>Họ tên / lớp</th><th>Đợt</th><th>Môn</th><th>Phần thi</th><th>SBD</th><th>Điểm phần</th><th>Điểm toàn bài</th><th>Trạng thái</th><th>Phản hồi</th><th>Điểm phần mới</th><th>Điểm toàn bài mới</th><th>Ghi chú cập nhật</th><th>Ảnh minh chứng của Admin</th><th>Lưu</th></tr></thead><tbody>${data.map(x=>{const partScore=x.phan_kiem_tra==='Trắc nghiệm'?x.diem_trac_nghiem:x.phan_kiem_tra==='Tự luận'?x.diem_tu_luan:x.diem;return `<tr data-search="${esc([x.ma_hs,x.ho_ten,x.lop,x.khoi,x.mon,x.dot_kiem_tra,x.phan_kiem_tra].join(' ').toLowerCase())}"><td>${esc(x.created_at||'')}</td><td>${esc(x.ma_hs)}</td><td>${esc(x.ho_ten||'')}<br>${esc(x.lop||'')}</td><td>${esc(x.dot_kiem_tra||'')}</td><td>${esc(x.mon||'')}</td><td><b>${esc(x.phan_kiem_tra||'Toàn bài')}</b></td><td>${esc(x.so_bao_danh||'—')}</td><td>${partScore??'—'}</td><td>${x.diem??'—'}</td><td><select class="appeal-status" data-id="${x.id}">${['Đã gửi','Đang xem xét','Đã xử lý','Từ chối'].map(v=>`<option ${v===x.trang_thai?'selected':''}>${v}</option>`).join('')}</select></td><td><textarea class="appeal-reply" data-id="${x.id}" rows="2" placeholder="Phản hồi">${esc(x.phan_hoi||'')}</textarea></td><td><input class="appeal-new-part-score" data-id="${x.id}" type="number" min="0" max="10" step="0.25" placeholder="Giữ nguyên" style="width:100px"></td><td><input class="appeal-new-total-score" data-id="${x.id}" type="number" min="0" max="10" step="0.25" placeholder="Giữ nguyên" style="width:100px"></td><td><textarea class="appeal-score-note" data-id="${x.id}" rows="2" placeholder="Ghi chú kết quả mới">${esc(x.ghi_chu_ket_qua||'')}</textarea></td><td><div class="appeal-admin-evidence">${x.anh_minh_chung_admin?`<button class="btn light appeal-view-admin-image" data-id="${x.id}">Xem ảnh hiện có</button>`:''}<input type="file" class="appeal-admin-image" data-id="${x.id}" accept="image/jpeg,image/png,image/webp"><small>Ảnh do Admin tải lên, tối đa 2 MB</small></div></td><td><button class="btn primary appeal-save" data-id="${x.id}">Lưu</button></td></tr>`}).join('')}</tbody></table></div>`;
 b.querySelectorAll('.appeal-view-admin-image').forEach(btn=>btn.onclick=()=>{const item=data.find(x=>String(x.id)===btn.dataset.id);if(item?.anh_minh_chung_admin)modal('Minh chứng do Admin đính kèm',`<img src="${item.anh_minh_chung_admin}" alt="Minh chứng phúc khảo" style="display:block;max-width:100%;max-height:75vh;margin:auto;object-fit:contain">`)});
 const filter=()=>b.querySelectorAll('tbody tr').forEach(tr=>{const term=b.querySelector('#appealSearchAdmin').value.toLowerCase(),status=b.querySelector('#appealStatusFilter').value;tr.style.display=(tr.dataset.search.includes(term)&&(!status||tr.querySelector('.appeal-status').value===status))?'':'none'});b.querySelector('#appealSearchAdmin').oninput=filter;b.querySelector('#appealStatusFilter').onchange=filter;
 b.querySelector('#appealExport').onclick=()=>{if(!window.XLSX)return toast('Thư viện Excel chưa tải xong.','err');const exportRows=data.map(x=>({'Ngày gửi':x.created_at,'Mã HS':x.ma_hs,'Họ tên':x.ho_ten,'Lớp':x.lop,'Khối':x.khoi,'Đợt kiểm tra':x.dot_kiem_tra,'Môn':x.mon,'Phần phúc khảo':x.phan_kiem_tra,'SBD':x.so_bao_danh,'Điểm trắc nghiệm':x.diem_trac_nghiem,'Điểm tự luận':x.diem_tu_luan,'Điểm toàn bài':x.diem,'Trạng thái':x.trang_thai,'Phản hồi':x.phan_hoi||'','Ghi chú cập nhật':x.ghi_chu_ket_qua||''}));const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(exportRows),'Phuc khao');XLSX.writeFile(wb,'Danh_sach_phuc_khao.xlsx');};
 b.querySelectorAll('.appeal-save').forEach(btn=>btn.onclick=async()=>{const id=btn.dataset.id,status=b.querySelector(`.appeal-status[data-id="${id}"]`).value,reply=b.querySelector(`.appeal-reply[data-id="${id}"]`).value.trim(),scoreRaw=b.querySelector(`.appeal-new-part-score[data-id="${id}"]`).value.trim(),totalRaw=b.querySelector(`.appeal-new-total-score[data-id="${id}"]`).value.trim(),note=b.querySelector(`.appeal-score-note[data-id="${id}"]`).value.trim(),file=b.querySelector(`.appeal-admin-image[data-id="${id}"]`).files?.[0];const partScore=scoreRaw===''?null:Number(scoreRaw),totalScore=totalRaw===''?null:Number(totalRaw);if(partScore!==null&&(!Number.isFinite(partScore)||partScore<0||partScore>10))return toast('Điểm phần thi phải từ 0 đến 10.','err');if(totalScore!==null&&(!Number.isFinite(totalScore)||totalScore<0||totalScore>10))return toast('Điểm toàn bài phải từ 0 đến 10.','err');if((partScore!==null||totalScore!==null)&&note.length<3)return toast('Khi cập nhật điểm cần ghi chú giải thích kết quả mới.','err');let imageData=null;if(file){if(!['image/jpeg','image/png','image/webp'].includes(file.type))return toast('Ảnh chỉ được JPG, PNG hoặc WebP.','err');if(file.size>2*1024*1024)return toast('Ảnh minh chứng vượt quá 2 MB.','err');imageData=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result));r.onerror=reject;r.readAsDataURL(file)});}btn.disabled=true;const {data,error}=await supabase.rpc('admin_cap_nhat_phuc_khao_v3',{p_ma_cb:staff.ma_cb,p_mat_khau:staff.credentialPassword||'',p_id:Number(id),p_trang_thai:status,p_phan_hoi:reply,p_diem_phan_moi:partScore,p_diem_toan_bai_moi:totalScore,p_ghi_chu:note||null,p_anh_minh_chung_admin:imageData});btn.disabled=false;if(error||!data?.ok)return toast(error?.message||data?.message||'Không cập nhật được. Hãy chạy SQL migration 027.','err');toast('Đã lưu kết quả xử lý phúc khảo và minh chứng của Admin.','ok');await appealAdmin(b);});
}

async function noticesAdmin(b){
 const staff=window.App?.Auth?.currentUser||{};const role=String(staff.vai_tro||'').toLowerCase();const roles=Array.isArray(staff.vai_tro_list)?staff.vai_tro_list.map(x=>String(x).toLowerCase()):[];const admin=isAdminStaff(staff);const gvcn=role.includes('gvcn')||role.includes('chủ nhiệm')||roles.some(x=>x.includes('gvcn')||x.includes('chủ nhiệm'));
 if(!admin&&!gvcn){b.innerHTML='<div class="danger-box">Chỉ Admin hoặc giáo viên chủ nhiệm được gửi thông báo.</div>';return;}
 let students;try{students=await fetchAll(()=>supabase.from('danh_sach').select('ma_hs,ho_ten,khoi,lop,trang_thai').order('ma_hs'),500);}catch(error){return b.innerHTML=`<div class="danger-box">${esc(error.message)}</div>`;}
 const classes=[...new Set((students||[]).map(x=>x.lop).filter(Boolean))].sort();const ownClass=staff.lop_quan_ly||'';
 b.innerHTML=`<div class="notice"><b>Gửi thông báo đến phụ huynh/học sinh.</b> Có thể hiển thị popup khi đăng nhập, chạy ngang màn hình và lưu trong chuông thông báo. Khi gửi toàn trường chỉ Admin được phép; GVCN chỉ gửi lớp mình chủ nhiệm.</div><div class="action-card"><div class="grid"><label>Tiêu đề<input id="noticeTitle" maxlength="160" placeholder="Ví dụ: Lịch kiểm tra khảo sát tuần tới"></label><label>Phạm vi<select id="noticeScope">${admin?'<option>Toàn trường</option>':''}<option value="Lớp">Lớp</option><option value="Học sinh">Học sinh</option></select></label><label id="noticeTargetLabel">Lớp nhận thông báo<select id="noticeTarget">${classes.filter(c=>admin||c===ownClass).map(c=>`<option value="${esc(c)}" ${c===ownClass?'selected':''}>${esc(c)}</option>`).join('')}</select></label><label style="grid-column:1/-1">Nội dung<textarea id="noticeBody" rows="5" placeholder="Nhập nội dung cần học sinh/phụ huynh nắm bắt và thực hiện"></textarea></label></div><div class="check-grid" style="margin:12px 0"><label class="check-item"><input type="checkbox" id="noticePopup" checked> Popup khi đăng nhập nếu chưa đọc</label><label class="check-item"><input type="checkbox" id="noticeTicker" checked> Hiển thị trên thanh chạy ngang</label></div><button id="noticeSend" class="btn primary">📢 Gửi thông báo</button><div id="noticeStatus"></div></div><h3>Gửi thông báo</h3><p class="muted">Mỗi thông báo được lưu vào tài khoản của từng học sinh trong phạm vi đã chọn; phụ huynh và học sinh cùng tài khoản sẽ thấy nội dung.</p>`;
 const scope=b.querySelector('#noticeScope'),targetLabel=b.querySelector('#noticeTargetLabel');const fillTarget=()=>{const val=scope.value;targetLabel.innerHTML=val==='Toàn trường'?'<span class="muted">Áp dụng toàn bộ học sinh đang học.</span>':val==='Lớp'?`<label>Lớp nhận thông báo<select id="noticeTarget">${classes.filter(c=>admin||c===ownClass).map(c=>`<option value="${esc(c)}" ${c===ownClass?'selected':''}>${esc(c)}</option>`).join('')}</select></label>`:`<label>Học sinh nhận thông báo<select id="noticeTarget">${students.filter(x=>(admin||x.lop===ownClass)&&(!x.trang_thai||!['inactive','nghi hoc','đã nghỉ'].includes(String(x.trang_thai).toLowerCase()))).map(x=>`<option value="${esc(x.ma_hs)}">${esc(x.ho_ten)} — ${esc(x.lop)} (${esc(x.ma_hs)})</option>`).join('')}</select></label>`;};scope.onchange=fillTarget;
 b.querySelector('#noticeSend').onclick=async()=>{const title=b.querySelector('#noticeTitle').value.trim(),body=b.querySelector('#noticeBody').value.trim(),ph=scope.value,target=ph==='Toàn trường'?'':b.querySelector('#noticeTarget')?.value||'';if(title.length<3||body.length<3)return toast('Nhập tiêu đề và nội dung thông báo.','err');if(ph!=='Toàn trường'&&!target)return toast('Chọn lớp hoặc học sinh nhận thông báo.','err');if(!confirm(`Gửi thông báo “${title}” đến ${ph==='Toàn trường'?'toàn trường':ph==='Lớp'?'lớp '+target:'học sinh '+target} ?`))return;const {data,error}=await supabase.rpc('admin_gui_thong_bao',{p_ma_cb:staff.ma_cb,p_mat_khau:staff.credentialPassword||'',p_tieu_de:title,p_noi_dung:body,p_pham_vi:ph,p_lop:target,p_popup:b.querySelector('#noticePopup').checked,p_ticker:b.querySelector('#noticeTicker').checked});if(error||!data?.ok)return toast(error?.message||data?.message||'Không gửi được. Hãy chạy SQL 023.','err');toast(`Đã gửi thông báo đến ${data.count} tài khoản học sinh.`, 'ok');b.querySelector('#noticeStatus').innerHTML=`<div class="notice">Đã gửi thành công đến <b>${data.count}</b> học sinh. Thông báo đã lưu trong hệ thống.</div>`;};
}
