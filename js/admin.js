import {supabase,PERMISSION_TABS,isAdminStaff,normalizeTabs,STAFF_ROLES,CLASS_MANAGEMENT_TYPES} from './config.js';import {esc,toast,modal,closeModal} from './ui.js';
let root,sub='students';
export async function init(r){root=r;renderTabs();await open('students')}
function renderTabs(){root.innerHTML=`<div class="page-head"><div><h2>Quản Trị Hệ Thống</h2><p>7 chức năng quản trị được tổ chức thành một hàng sub-tab.</p></div></div><div class="subtabs">${[['students','👨‍🎓 Quản lý học sinh'],['import','📥 Nhập Excel'],['staff','👥 Quản lý cán bộ'],['schedule','🕒 TKB & TG học'],['transfer','🔄 Kết chuyển & TN'],['criteria','📝 Quản lý tiêu chí'],['permissions','🔐 Phân quyền']].map(x=>`<button data-a="${x[0]}">${x[1]}</button>`).join('')}</div><div id="adminBody"></div>`;root.querySelectorAll('[data-a]').forEach(b=>b.onclick=()=>open(b.dataset.a))}
async function open(k){sub=k;root.querySelectorAll('[data-a]').forEach(b=>b.classList.toggle('active',b.dataset.a===k));const b=root.querySelector('#adminBody');b.innerHTML='<div class="empty">Đang tải...</div>';if(k==='students')return students(b);if(k==='import')return imports(b);if(k==='staff')return staff(b);if(k==='schedule')return schedule(b);if(k==='transfer')return transfer(b);if(k==='criteria')return criteria(b);if(k==='permissions')return permissions(b)}
async function students(b){const {data,error}=await supabase.from('danh_sach').select('id,ma_hs,ho_ten,khoi,lop,ngay_sinh,ma_qr,trang_thai,nam_hoc').order('lop').order('ho_ten').limit(1000);if(error)return b.innerHTML=`<div class="danger-box">${esc(error.message)}</div>`;b.innerHTML=`<div class="toolbar"><input id="stSearch" placeholder="Tìm mã HS, họ tên, lớp"><button id="stAdd" class="btn primary">+ Thêm học sinh</button><span class="badge">${data.length} bản ghi hiển thị</span></div><div class="table-wrap"><table class="table"><thead><tr><th>Mã HS</th><th>Họ tên</th><th>Khối</th><th>Lớp</th><th>QR</th><th>Trạng thái</th><th></th></tr></thead><tbody>${data.map(x=>`<tr><td>${esc(x.ma_hs)}</td><td>${esc(x.ho_ten)}</td><td>${esc(x.khoi)}</td><td>${esc(x.lop)}</td><td>${esc(x.ma_qr||'')}</td><td>${esc(x.trang_thai||'')}</td><td><button class="btn light st-edit" data-id="${x.id}">Sửa</button></td></tr>`).join('')}</tbody></table></div>`;const filter=()=>b.querySelectorAll('tbody tr').forEach(tr=>tr.style.display=tr.textContent.toLowerCase().includes((b.querySelector('#stSearch').value||'').toLowerCase())?'':'none');b.querySelector('#stSearch').oninput=filter;b.querySelector('#stAdd').onclick=()=>studentForm(null);b.querySelectorAll('.st-edit').forEach(btn=>btn.onclick=()=>studentForm(data.find(x=>String(x.id)===btn.dataset.id)));}
function studentForm(s){const x=s||{};const m=modal(s?'Sửa học sinh':'Thêm học sinh',`<div class="grid"><label>Mã học sinh<input id="f_ma" value="${esc(x.ma_hs)}"></label><label>Họ tên<input id="f_name" value="${esc(x.ho_ten)}"></label><label>Khối<input id="f_khoi" value="${esc(x.khoi)}"></label><label>Lớp<input id="f_lop" value="${esc(x.lop)}"></label><label>Ngày sinh<input id="f_ns" type="date" value="${esc(x.ngay_sinh)}"></label><label>Mã QR<input id="f_qr" value="${esc(x.ma_qr)}"></label><label>Trạng thái<select id="f_status"><option ${x.trang_thai==='Active'?'selected':''}>Active</option><option ${x.trang_thai==='Inactive'?'selected':''}>Inactive</option></select></label><label>Năm học<input id="f_year" value="${esc(x.nam_hoc||'2026-2027')}"></label></div>`,`<button id="f_cancel" class="btn light">Hủy</button><button id="f_save" class="btn primary">Lưu</button>`);m.querySelector('#f_cancel').onclick=closeModal;m.querySelector('#f_save').onclick=async()=>{const payload={ma_hs:m.querySelector('#f_ma').value.trim(),ho_ten:m.querySelector('#f_name').value.trim(),khoi:m.querySelector('#f_khoi').value.trim(),lop:m.querySelector('#f_lop').value.trim(),ngay_sinh:m.querySelector('#f_ns').value||null,ma_qr:m.querySelector('#f_qr').value.trim()||null,trang_thai:m.querySelector('#f_status').value,nam_hoc:m.querySelector('#f_year').value.trim()};let q=supabase.from('danh_sach');const res=s?q.update(payload).eq('id',s.id):q.insert(payload);const {error}=await res;if(error)return toast(error.message,'err');closeModal();toast('Đã lưu học sinh.','ok');await students(root.querySelector('#adminBody'));}}
async function imports(b){b.innerHTML=`<div class="notice"><b>Nhập Excel:</b> file nên có các cột <code>ma_hs, ho_ten, khoi, lop, ngay_sinh, ma_qr</code>. Hệ thống hiển thị bản xem trước trước khi ghi.</div><label>Chọn file Excel<input id="excelFile" type="file" accept=".xlsx,.xls,.csv"></label><div id="preview"></div>`;b.querySelector('#excelFile').onchange=async e=>{const f=e.target.files[0];if(!f)return;if(!window.XLSX)return toast('Thư viện Excel chưa tải xong.','err');const buf=await f.arrayBuffer(),wb=XLSX.read(buf,{type:'array'}),ws=wb.Sheets[wb.SheetNames[0]],rows=XLSX.utils.sheet_to_json(ws,{defval:''});b.querySelector('#preview').innerHTML=`<div class="toolbar"><span class="badge">${rows.length} dòng</span><button id="importDo" class="btn primary">Ghi vào danh_sach</button></div><div class="table-wrap"><table class="table"><thead><tr>${Object.keys(rows[0]||{}).slice(0,8).map(k=>`<th>${esc(k)}</th>`).join('')}</tr></thead><tbody>${rows.slice(0,30).map(r=>`<tr>${Object.keys(rows[0]||{}).slice(0,8).map(k=>`<td>${esc(r[k])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;b.querySelector('#importDo').onclick=async()=>{const payload=rows.map(r=>({ma_hs:String(r.ma_hs||r['Mã HS']||'').trim(),ho_ten:String(r.ho_ten||r['Họ tên']||'').trim(),khoi:String(r.khoi||r['Khối']||'').trim()||null,lop:String(r.lop||r['Lớp']||'').trim()||null,ngay_sinh:r.ngay_sinh||r['Ngày sinh']||null,ma_qr:String(r.ma_qr||r['Mã QR']||'').trim()||null,trang_thai:'Active',nam_hoc:'2026-2027'})).filter(x=>x.ma_hs&&x.ho_ten);if(!payload.length)return toast('Không có dòng hợp lệ.','err');const {error}=await supabase.from('danh_sach').upsert(payload,{onConflict:'ma_hs'});if(error)return toast(error.message,'err');toast(`Đã nhập ${payload.length} học sinh.`,'ok');};};}
async function fetchAll(factory,chunk=1000){const all=[];let from=0;while(true){const {data,error}=await factory().range(from,from+chunk-1);if(error)throw error;const rows=data||[];all.push(...rows);if(rows.length<chunk)break;from+=chunk}return all}
async function staff(b){
 try{
  const [{data,error},classes]=await Promise.all([
   supabase.from('can_bo').select('ma_cb,ho_ten,mat_khau,vai_tro,vai_tro_list,lop_quan_ly,lop_giang_day,quyen_tabs,trang_thai,ma_hs,loai_quan_ly_lop').order('ho_ten'),
   loadClassList()
  ]);
  if(error)throw error;
  b.innerHTML=`<div class="page-head"><div><h3 style="margin:0">Quản lý cán bộ</h3><p>Chuẩn hóa vai trò và phạm vi lớp được phép thao tác.</p></div><span class="badge">${data.length} tài khoản</span></div>
  <div class="notice"><b>Phạm vi sử dụng:</b> GVCN quản lý lớp chủ nhiệm; Giáo viên quản lý các lớp giảng dạy; Cán bộ lớp là tài khoản học sinh và chỉ được chấm điểm cá nhân trong lớp được phân công.</div>
  <div class="toolbar"><button id="cbAdd" class="btn primary">+ Thêm tài khoản</button></div>
  <div class="table-wrap"><table class="table"><thead><tr><th>Mã CB</th><th>Họ tên</th><th>Vai trò</th><th>Phạm vi lớp</th><th>Tài khoản học sinh</th><th>Trạng thái</th><th></th></tr></thead><tbody>${data.map(x=>`<tr><td>${esc(x.ma_cb)}</td><td>${esc(x.ho_ten)}</td><td>${esc(roleLabel(x.vai_tro))} ${isAdminStaff(x)?'<span class="badge admin">Admin</span>':''}</td><td>${esc(scopeLabel(x))}</td><td>${x.ma_hs?`<span class="badge blue">${esc(x.ma_hs)}</span>`:'—'}</td><td>${x.trang_thai?'<span class="badge ok">Hoạt động</span>':'<span class="badge">Khóa</span>'}</td><td><button class="btn light cb-edit" data-ma="${esc(x.ma_cb)}">Sửa</button></td></tr>`).join('')}</tbody></table></div>`;
  b.querySelector('#cbAdd').onclick=()=>staffForm(null,classes);
  b.querySelectorAll('.cb-edit').forEach(btn=>btn.onclick=()=>staffForm(data.find(x=>x.ma_cb===btn.dataset.ma),classes));
 }catch(e){b.innerHTML=`<div class="danger-box">${esc(e.message)}<br><small>Nếu lỗi liên quan <code>ma_hs</code> hoặc <code>loai_quan_ly_lop</code>, hãy chạy SQL migration 008 của V3.0.5.5 trước.</small></div>`}
}
async function loadClassList(){
 const data=await fetchAll(()=>supabase.from('danh_sach').select('lop').eq('trang_thai','Active').not('lop','is',null).order('lop'));
 return [...new Set(data.map(x=>String(x.lop||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'vi',{numeric:true,sensitivity:'base'}));
}
function roleLabel(v){return STAFF_ROLES.find(x=>x.key===v)?.label||v||''}
function scopeLabel(x){
 const role=String(x.vai_tro||'');
 if(role==='GVCN')return x.lop_quan_ly?`Chủ nhiệm: ${x.lop_quan_ly}`:'Chưa phân lớp';
 if(role==='Giáo viên')return Array.isArray(x.lop_giang_day)&&x.lop_giang_day.length?`Giảng dạy: ${x.lop_giang_day.join(', ')}`:'Chưa phân lớp';
 if(role==='Cán bộ lớp')return x.lop_quan_ly?`Cán bộ lớp: ${x.lop_quan_ly}`:'Chưa phân lớp';
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
 <div class="staff-section hidden" id="studentLinkSection"><div class="staff-section-title">Liên kết tài khoản học sinh</div>
 <label>Học sinh thuộc lớp <select id="c_student"><option value="">-- Chọn học sinh --</option></select></label>
 <div class="notice">Tài khoản này là <b>Cán bộ lớp (học sinh)</b>. Hệ thống chỉ cho phép cập nhật điểm <b>cá nhân</b> và xem thống kê của lớp được phân công.</div>
 </div>
 <div class="staff-section"><div class="grid"><label>Trạng thái<select id="c_status"><option value="true" ${x.trang_thai!==false?'selected':''}>Hoạt động</option><option value="false" ${x.trang_thai===false?'selected':''}>Khóa</option></select></label></div></div>
 </div>`,`<button id="c_cancel" class="btn light">Hủy</button><button id="c_save" class="btn primary">Lưu</button>`);
 const roleEl=m.querySelector('#c_role');
 const area=m.querySelector('#classScopeArea');
 const studentSection=m.querySelector('#studentLinkSection');
 const studentEl=m.querySelector('#c_student');
 function renderScope(){
  const r=roleEl.value;
  if(r==='GVCN'){
   area.innerHTML=`<label>Lớp chủ nhiệm<select id="c_class">${classOptions(classes,x.lop_quan_ly)}</select></label><div class="scope-help">GVCN có quyền cập nhật điểm/báo vắng cho lớp chủ nhiệm và xem thống kê toàn trường.</div>`;
   studentSection.classList.add('hidden');
  }else if(r==='Giáo viên'){
   const selected=Array.isArray(x.lop_giang_day)?x.lop_giang_day:normalizeTabs(x.lop_giang_day);
   area.innerHTML=`<label>Các lớp giảng dạy<select id="c_classes" multiple size="6">${classes.map(c=>`<option value="${esc(c)}" ${selected.includes(c)?'selected':''}>${esc(c)}</option>`).join('')}</select></label><div class="scope-help">Giáo viên chỉ được cập nhật điểm và báo vắng trong các lớp được chọn.</div>`;
   studentSection.classList.add('hidden');
  }else if(r==='Cán bộ lớp'){
   area.innerHTML=`<label>Lớp cán bộ lớp<select id="c_class">${classOptions(classes,x.lop_quan_ly)}</select></label><div class="scope-help">Tài khoản học sinh chỉ được chấm điểm cá nhân cho học sinh cùng lớp.</div>`;
   studentSection.classList.remove('hidden');
   loadStudentsForClass(m,x.lop_quan_ly||'');
  }else{
   area.innerHTML=`<div class="notice">Admin có phạm vi toàn hệ thống, không cần gán lớp.</div>`;
   studentSection.classList.add('hidden');
  }
  const cls=m.querySelector('#c_class'); if(cls)cls.onchange=()=>{if(roleEl.value==='Cán bộ lớp')loadStudentsForClass(m,cls.value)};
 }
 async function loadStudentsForClass(mod,cls){
  const el=mod.querySelector('#c_student');if(!el)return;
  if(!cls){el.innerHTML='<option value="">-- Chọn lớp trước --</option>';return}
  const {data,error}=await supabase.from('danh_sach').select('ma_hs,ho_ten,ngay_sinh,lop').eq('trang_thai','Active').eq('lop',cls).order('ho_ten');
  if(error){el.innerHTML='<option value="">Không tải được học sinh</option>';return}
  el.innerHTML='<option value="">-- Chọn học sinh --</option>'+(data||[]).map(st=>`<option value="${esc(st.ma_hs)}" ${st.ma_hs===x.ma_hs?'selected':''}>${esc(st.ho_ten)} — ${formatDate(st.ngay_sinh)}</option>`).join('');
 }
 renderScope();
 m.querySelector('#c_cancel').onclick=closeModal;
 m.querySelector('#c_save').onclick=async()=>{
  const r=roleEl.value;const payload={ma_cb:m.querySelector('#c_ma').value.trim(),ho_ten:m.querySelector('#c_name').value.trim(),vai_tro:r,trang_thai:m.querySelector('#c_status').value==='true'};
  if(!payload.ma_cb||!payload.ho_ten)return toast('Mã tài khoản và họ tên là bắt buộc.','err');
  const pw=m.querySelector('#c_pw').value;if(pw)payload.mat_khau=pw;
  if(r==='GVCN'){payload.lop_quan_ly=m.querySelector('#c_class')?.value||null;payload.lop_giang_day=[];payload.loai_quan_ly_lop='Chủ nhiệm';payload.ma_hs=null}
  else if(r==='Giáo viên'){payload.lop_quan_ly=null;payload.lop_giang_day=[...(m.querySelector('#c_classes')?.selectedOptions||[])].map(o=>o.value);payload.loai_quan_ly_lop='Giảng dạy';payload.ma_hs=null}
  else if(r==='Cán bộ lớp'){payload.lop_quan_ly=m.querySelector('#c_class')?.value||null;payload.lop_giang_day=[];payload.loai_quan_ly_lop='Cán bộ lớp';payload.ma_hs=m.querySelector('#c_student')?.value||null;if(!payload.lop_quan_ly||!payload.ma_hs)return toast('Cán bộ lớp phải có lớp và học sinh liên kết.','err')}
  else{payload.lop_quan_ly='ALL';payload.lop_giang_day=[];payload.loai_quan_ly_lop='';payload.ma_hs=null}
  if(!s)payload.quyen_tabs=defaultTabsForRole(r);
  const q=s?supabase.from('can_bo').update(payload).eq('ma_cb',s.ma_cb):supabase.from('can_bo').insert(payload);
  const {error}=await q;if(error)return toast(error.message,'err');closeModal();toast('Đã lưu tài khoản và phạm vi sử dụng.','ok');await staff(root.querySelector('#adminBody'));
 };
}
function classOptions(classes,selected){return '<option value="">-- Chọn lớp --</option>'+classes.map(c=>`<option value="${esc(c)}" ${c===selected?'selected':''}>${esc(c)}</option>`).join('')}
function formatDate(v){const m=String(v||'').match(/^(\d{4})-(\d{2})-(\d{2})/);return m?`${m[3]}/${m[2]}/${m[1]}`:''}
function defaultTabsForRole(r){if(r==='Admin')return PERMISSION_TABS.map(x=>x.key);if(r==='GVCN')return ['baovang','chamdiem','thongke','xeploai'];if(r==='Giáo viên')return ['baovang','chamdiem','thongke'];if(r==='Cán bộ lớp')return ['chamdiem','thongke'];return []}
async function schedule(b){const {data,error}=await supabase.from('cai_dat_thoi_gian').select('*').order('khoi').order('lop').order('tu_tiet');if(error)return b.innerHTML=`<div class="danger-box">${esc(error.message)}</div>`;b.innerHTML=`<div class="notice">Cấu hình thời gian điểm danh hiện dùng bảng <code>cai_dat_thoi_gian</code>. V3.0.4 chỉ chỉnh các trường đã xác nhận từ schema.</div><div class="toolbar"><button id="tgAdd" class="btn primary">+ Thêm cấu hình</button></div><div class="table-wrap"><table class="table"><thead><tr><th>Khối</th><th>Lớp</th><th>Buổi</th><th>Tiết</th><th>Bắt đầu</th><th>Kết thúc</th><th>Trạng thái</th></tr></thead><tbody>${data.map(x=>`<tr><td>${esc(x.khoi)}</td><td>${esc(x.lop)}</td><td>${esc(x.buoi)}</td><td>${x.tu_tiet}-${x.den_tiet}</td><td>${esc(x.gio_bat_dau_diem_danh)}</td><td>${esc(x.gio_ket_thuc_diem_danh)}</td><td>${esc(x.trang_thai)}</td></tr>`).join('')}</tbody></table></div>`;b.querySelector('#tgAdd').onclick=()=>toast('Form thêm cấu hình TKB sẽ được hoàn thiện sau khi chốt nghiệp vụ TKB chi tiết.','ok');}
async function transfer(b){b.innerHTML=`<div class="cards"><div class="action-card"><h3>🔄 Kết chuyển học sinh</h3><p>Gọi RPC <code>ket_chuyen_hoc_sinh</code> để kết chuyển một học sinh sang khối/lớp/năm học mới.</p><div class="action-row"><button id="transferOne" class="btn primary">Thực hiện</button></div></div><div class="action-card"><h3>🎓 Tốt nghiệp học sinh</h3><p>Gọi RPC <code>tot_nghiep_hoc_sinh</code>. V3.0.4 chưa tự động chạy hàng loạt.</p><div class="action-row"><button id="grad" class="btn warn">Mở thao tác</button></div></div></div>`;b.querySelector('#transferOne').onclick=()=>toast('Đã mở khung kết chuyển. Khi chốt quy trình hàng loạt sẽ bổ sung lựa chọn lớp đích.','ok');b.querySelector('#grad').onclick=()=>toast('Chức năng tốt nghiệp đang ở chế độ an toàn, chưa tự động cập nhật hàng loạt.','ok');}
async function criteria(b){const {data,error}=await supabase.from('danh_muc_diem').select('ma_hd,ten_hd,mang,loai,diem,doi_tuong').order('mang').order('loai').order('ten_hd');if(error)return b.innerHTML=`<div class="danger-box">${esc(error.message)}</div>`;b.innerHTML=`<div class="toolbar"><button id="crAdd" class="btn primary">+ Thêm tiêu chí</button><span class="badge">${data.length} tiêu chí</span></div><div class="table-wrap"><table class="table"><thead><tr><th>Mã</th><th>Nội dung</th><th>Mảng</th><th>Loại</th><th>Điểm</th><th>Đối tượng</th><th></th></tr></thead><tbody>${data.map(x=>`<tr><td>${esc(x.ma_hd)}</td><td>${esc(x.ten_hd)}</td><td>${esc(x.mang)}</td><td>${esc(x.loai)}</td><td>${Number(x.diem)>0?'+':''}${x.diem}</td><td>${esc(x.doi_tuong)}</td><td><button class="btn light cr-edit" data-ma="${esc(x.ma_hd)}">Sửa</button></td></tr>`).join('')}</tbody></table></div>`;b.querySelector('#crAdd').onclick=()=>criteriaForm(null);b.querySelectorAll('.cr-edit').forEach(btn=>btn.onclick=()=>criteriaForm(data.find(x=>x.ma_hd===btn.dataset.ma)));}
function criteriaForm(s){const x=s||{};const m=modal(s?'Sửa tiêu chí':'Thêm tiêu chí',`<div class="grid"><label>Mã hoạt động<input id="d_ma" value="${esc(x.ma_hd)}" ${s?'readonly':''}></label><label>Tên hoạt động<input id="d_name" value="${esc(x.ten_hd)}"></label><label>Mảng<input id="d_mang" value="${esc(x.mang||'Nề nếp')}"></label><label>Loại<input id="d_loai" value="${esc(x.loai||'Vi phạm')}"></label><label>Điểm<input id="d_score" type="number" step="0.5" value="${x.diem??0}"></label><label>Đối tượng<input id="d_obj" value="${esc(x.doi_tuong||'Cá nhân')}"></label></div>`,`<button id="d_cancel" class="btn light">Hủy</button><button id="d_save" class="btn primary">Lưu</button>`);m.querySelector('#d_cancel').onclick=closeModal;m.querySelector('#d_save').onclick=async()=>{const payload={ma_hd:m.querySelector('#d_ma').value.trim(),ten_hd:m.querySelector('#d_name').value.trim(),mang:m.querySelector('#d_mang').value.trim(),loai:m.querySelector('#d_loai').value.trim(),diem:Number(m.querySelector('#d_score').value||0),doi_tuong:m.querySelector('#d_obj').value.trim()};const q=s?supabase.from('danh_muc_diem').update(payload).eq('ma_hd',s.ma_hd):supabase.from('danh_muc_diem').insert(payload);const {error}=await q;if(error)return toast(error.message,'err');closeModal();toast('Đã lưu tiêu chí.','ok');await criteria(root.querySelector('#adminBody'));};}
async function permissions(b){const {data,error}=await supabase.from('can_bo').select('ma_cb,ho_ten,vai_tro,vai_tro_list,quyen_tabs,trang_thai').order('ho_ten');if(error)return b.innerHTML=`<div class="danger-box">${esc(error.message)}</div>`;let selected=data[0]?.ma_cb||'';const render=()=>{const s=data.find(x=>x.ma_cb===selected);const admin=isAdminStaff(s);const q=admin?PERMISSION_TABS.map(x=>x.key):normalizeTabs(s?.quyen_tabs);b.innerHTML=`<div class="notice"><b>Phân quyền JSONB:</b> chỉ sử dụng <code>can_bo.quyen_tabs</code>. Admin toàn quyền theo vai trò.</div><div class="toolbar"><select id="permUser">${data.map(x=>`<option value="${esc(x.ma_cb)}" ${x.ma_cb===selected?'selected':''}>${esc(x.ho_ten)} — ${esc(x.ma_cb)} — ${esc(x.vai_tro)}</option>`).join('')}</select></div><div class="check-grid">${PERMISSION_TABS.map(p=>`<div class="check-item"><label><input class="perm-check" value="${p.key}" type="checkbox" ${q.includes(p.key)?'checked':''} ${admin?'disabled':''}><span><b>${esc(p.label)}</b><br><small>${p.key}</small></span></label></div>`).join('')}</div>${admin?'<div class="notice" style="margin-top:12px">Tài khoản Admin không cần ghi quyền vào JSONB.</div>':'<div class="action-row"><button id="permSave" class="btn primary">Lưu quyền</button></div>'}`;b.querySelector('#permUser').onchange=e=>{selected=e.target.value;render()};b.querySelector('#permSave')?.addEventListener('click',async()=>{const q=[...b.querySelectorAll('.perm-check:checked')].map(x=>x.value);const {error}=await supabase.from('can_bo').update({quyen_tabs:q}).eq('ma_cb',selected);if(error)return toast(error.message,'err');data.find(x=>x.ma_cb===selected).quyen_tabs=q;toast('Đã lưu quyền.','ok');render()});};render();}
