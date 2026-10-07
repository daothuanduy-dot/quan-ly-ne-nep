import {supabase,appConfig,managedClasses,canManageAbsence,roleOf,canMonitorAbsence} from './config.js';
import {esc,toast,modal,closeModal} from './ui.js';

let root,grades=[],classes=[],students=[];
let selectedGrade='',selectedClass='',date='',buoi='Sáng',autoBuoi='Sáng',manualBuoi=false;

async function fetchAll(factory,chunk=1000){
  const all=[]; let from=0;
  while(true){
    const {data,error}=await factory().range(from,from+chunk-1);
    if(error) throw error;
    const rows=data||[]; all.push(...rows);
    if(rows.length<chunk) break;
    from+=chunk;
  }
  return all;
}

export async function init(r){
  root=r;
  const now=new Date();
  date=localDate(now);
  autoBuoi=await detectCurrentSession(now);
  buoi=autoBuoi;
  selectedGrade=''; selectedClass=''; students=[]; manualBuoi=false;
  await renderShell();
  await loadGrades();
  if(canMonitorAbsence(window.App?.Auth?.currentUser)) await loadMonitor();
}

async function renderShell(){
  const user=window.App?.Auth?.currentUser;
  const monitor=canMonitorAbsence(user);
  root.innerHTML=`
    <div class="page-head">
      <div><h2>Báo Vắng Học Sinh</h2><p>Chọn khối → lớp → số học sinh vắng. Lớp vẫn phải báo kể cả khi không có học sinh vắng.</p></div>
      <span class="badge ok">Năm học ${esc(appConfig.namHoc)}</span>
    </div>

    <div class="absence-top-grid">
      <div class="absence-box">
        <div class="selector-title">📅 Thời gian báo vắng</div>
        <div class="absence-inline"><label>Ngày<input id="absDate" type="date" value="${date}"></label></div>
        <div class="auto-session-line"><b>Buổi hệ thống:</b> <span id="autoBuoiLabel">${esc(autoBuoi)}</span> <span class="badge">Tự động</span></div><div class="selector-hint">Mặc định: buổi chiều bắt đầu <b>14:00, từ tiết 2</b>. Có thể chọn “Báo bổ sung” nếu cần báo lại.</div>
        <label class="manual-session-toggle"><input id="absManualBuoi" type="checkbox"> Báo bổ sung / chọn lại buổi</label>
        <select id="absBuoi" disabled aria-label="Buổi bổ sung"><option value="Sáng" ${buoi==='Sáng'?'selected':''}>Sáng</option><option value="Chiều" ${buoi==='Chiều'?'selected':''}>Chiều</option></select>
      </div>

      <div class="absence-box"><div class="selector-title">👥 Chọn khối</div><div id="absGradeRadios" class="absence-grade-grid"><span class="class-empty">Đang tải...</span></div></div>
      <div class="absence-box"><div class="selector-title">🏫 Chọn lớp</div><div id="absClassRadios" class="absence-class-grid"><span class="class-empty">Hãy chọn khối trước.</span></div></div>
      <div class="absence-box"><div class="selector-title">👤 Số vắng</div><select id="absCount" disabled><option value="">-- Chọn lớp trước --</option></select><div id="absClassInfo" class="selector-hint">Chưa chọn lớp.</div></div>
    </div>

    <div id="absRows"><div class="empty">Hãy chọn khối, lớp và số học sinh vắng.</div></div>
    ${monitor?'<div id="absenceMonitor" class="absence-monitor-wrap"></div>':''}
  `;
  root.querySelector('#absDate').onchange=e=>{date=e.target.value; if(monitor)loadMonitor()};
  root.querySelector('#absManualBuoi').onchange=e=>{
    manualBuoi=e.target.checked;
    const sel=root.querySelector('#absBuoi'); sel.disabled=!manualBuoi;
    if(manualBuoi) sel.value=buoi;
    else {buoi=autoBuoi; sel.value=autoBuoi;}
    if(monitor)loadMonitor();
  };
  root.querySelector('#absBuoi').onchange=e=>{buoi=e.target.value;if(monitor)loadMonitor()};
  root.querySelector('#absCount').onchange=renderRows;
}

async function loadGrades(){
  try{
    const data=await fetchAll(()=>supabase.from('danh_sach').select('khoi').eq('trang_thai','Active').not('khoi','is',null).order('khoi'));
    grades=[...new Set(data.map(x=>String(x.khoi).trim()).filter(Boolean))].sort(naturalSort);
    root.querySelector('#absGradeRadios').innerHTML=grades.map(g=>`<label class="absence-grade"><input type="radio" name="absGrade" value="${esc(g)}"><span>${esc(g)}</span></label>`).join('');
    root.querySelectorAll('input[name="absGrade"]').forEach(r=>r.onchange=()=>onGradeChange(r.value));
  }catch(e){showError(e.message)}
}

async function onGradeChange(grade){
  selectedGrade=grade; selectedClass=''; students=[];
  const classBox=root.querySelector('#absClassRadios'), count=root.querySelector('#absCount');
  count.disabled=true; count.innerHTML='<option value="">-- Chọn lớp trước --</option>';
  root.querySelector('#absRows').innerHTML='<div class="empty">Hãy chọn lớp và số học sinh vắng.</div>';
  classBox.innerHTML='<span class="class-empty">Đang tải lớp...</span>';
  try{
    const data=await fetchAll(()=>supabase.from('danh_sach').select('lop').eq('trang_thai','Active').eq('khoi',grade).not('lop','is',null).order('lop'));
    classes=[...new Set(data.map(x=>String(x.lop).trim()).filter(Boolean))].sort(naturalSort);
    const scope=managedClasses(window.App?.Auth?.currentUser); if(scope!==null)classes=classes.filter(c=>scope.includes(c));
    classBox.innerHTML=classes.map(c=>`<label class="absence-class"><input type="radio" name="absClass" value="${esc(c)}"><span>${esc(c)}</span></label>`).join('')||'<span class="class-empty">Không có lớp trong phạm vi tài khoản.</span>';
    root.querySelectorAll('input[name="absClass"]').forEach(r=>r.onchange=()=>onClassChange(r.value));
  }catch(e){showError(e.message)}
}

async function onClassChange(cls){
  selectedClass=cls;
  try{
    students=await fetchAll(()=>supabase.from('danh_sach').select('ma_hs,ho_ten,khoi,lop,ngay_sinh').eq('trang_thai','Active').eq('khoi',selectedGrade).eq('lop',cls).order('ho_ten'));
    students.sort((a,b)=>String(a.ho_ten||'').localeCompare(String(b.ho_ten||''),'vi',{sensitivity:'base'}));
    const count=root.querySelector('#absCount'); count.disabled=false;
    count.innerHTML='<option value="">-- Chọn số học sinh vắng --</option>'+Array.from({length:students.length+1},(_,i)=>`<option value="${i}">${i}</option>`).join('');
    root.querySelector('#absClassInfo').innerHTML=`<b>${esc(cls)}</b> · ${students.length} học sinh · <b>0</b> cũng phải được ghi nhận.`;
    root.querySelector('#absRows').innerHTML='<div class="empty">Chọn số vắng. Nếu không có học sinh vắng, chọn <b>0</b> để xác nhận lớp đã báo.</div>';
  }catch(e){showError(e.message)}
}

function renderRows(){
  const count=Number(root.querySelector('#absCount').value||0),body=root.querySelector('#absRows');
  if(root.querySelector('#absCount').value==='') {body.innerHTML='<div class="empty">Hãy chọn số học sinh vắng.</div>';return}
  if(count===0){
    body.innerHTML=`<div class="absence-panel zero-report"><div class="zero-icon">✓</div><div><h3>Không có học sinh vắng</h3><p>Lớp <b>${esc(selectedClass)}</b> sẽ được ghi nhận là <b>vắng 0</b> cho ${esc(buoi)} ngày ${formatDate(date)}.</p></div><button id="absSaveZero" class="btn primary">💾 Xác nhận lớp không có học sinh vắng</button></div>`;
    root.querySelector('#absSaveZero').onclick=saveZero; return;
  }
  body.innerHTML=`<div class="absence-panel"><div class="page-head"><div><h3 style="margin:0">Danh sách học sinh vắng — ${esc(selectedClass)}</h3><p>${count} học sinh cần xác nhận trạng thái.</p></div><span class="badge">${count} dòng</span></div><div class="absence-list">${Array.from({length:count},(_,i)=>absenceRow(i)).join('')}</div><div class="action-row"><button id="absSave" class="btn primary">💾 Ghi nhận ${count} học sinh vắng</button></div></div>`;
  root.querySelectorAll('.absence-student').forEach(s=>s.onchange=updateStudentOptions);
  root.querySelectorAll('input[name^="absStatus_"]').forEach(r=>r.onchange=updateStatusVisual);
  root.querySelector('#absSave').onclick=save;
}

function absenceRow(index){return `<div class="absence-row" data-row="${index}"><div class="absence-index">${index+1}</div><div class="absence-student-wrap"><label>Học sinh<select class="absence-student"><option value="">-- Chọn học sinh --</option>${students.map((s,i)=>`<option value="${i}">${esc(s.ho_ten)} — ${formatDate(s.ngay_sinh)}</option>`).join('')}</select></label></div><div class="absence-status"><span class="status-label">Trạng thái</span><label class="absence-status-radio allowed"><input type="radio" name="absStatus_${index}" value="Vắng có phép"><span>✓ Có phép</span></label><label class="absence-status-radio notallowed"><input type="radio" name="absStatus_${index}" value="Vắng không phép"><span>✕ Không phép</span></label></div></div>`}
function updateStudentOptions(){const selects=[...root.querySelectorAll('.absence-student')],selected=new Set(selects.map(s=>s.value).filter(Boolean));selects.forEach(sel=>[...sel.options].forEach(opt=>{if(opt.value)opt.disabled=selected.has(opt.value)&&opt.value!==sel.value}))}
function updateStatusVisual(){root.querySelectorAll('.absence-row').forEach(row=>{const chosen=row.querySelector('input[type="radio"]:checked')?.value||'';row.classList.toggle('has-permission',chosen==='Vắng có phép');row.classList.toggle('has-no-permission',chosen==='Vắng không phép')})}

async function save(){
  const u=window.App?.Auth?.currentUser;
  if(!canManageAbsence(u,selectedClass)){rejectWrite('Không được phép báo vắng',`Tài khoản hiện tại không có quyền báo vắng cho lớp ${selectedClass}. Hệ thống không ghi dữ liệu vào CSDL.`);return;}
  const allowed=await classHasSchedule(selectedClass,selectedGrade,date,buoi);
  if(!allowed){rejectWrite('Không ghi báo vắng',`Lớp ${selectedClass} chưa có lịch học ${buoi} ngày ${formatDate(date)} trong TKB. Hệ thống chỉ cho phép báo vắng khi lớp thực sự có lịch học. Vui lòng vào Quản trị → TKB & TG học → Lịch học để khai báo trước. Hệ thống không ghi dữ liệu vào CSDL.`);return;}
  const rows=[...root.querySelectorAll('.absence-row')],payload=[];
  for(const row of rows){const idx=row.querySelector('.absence-student').value,status=row.querySelector('input[type="radio"]:checked')?.value||'';if(idx==='')return toast(`Dòng ${Number(row.dataset.row)+1}: chưa chọn học sinh.`,'err');if(!status)return toast(`Dòng ${Number(row.dataset.row)+1}: chưa chọn Có phép/Không phép.`,'err');const s=students[Number(idx)];payload.push({ma_hs:s.ma_hs,ho_ten:s.ho_ten,khoi:s.khoi,lop:s.lop,ngay_diem_danh:date,buoi,trang_thai:status,chi_tiet:null,diem:0,ma_nguoi_cap_nhat:u?.ma_cb||null,ten_nguoi_cap_nhat:u?.ho_ten||null,nam_hoc:appConfig.namHoc})}
  const {error}=await supabase.from('diem_danh_master').insert(payload); if(error){ const m=String(error.message||''); const hint=(m.includes('nam_hoc')||m.includes('schema cache'))?' Hãy chạy SQL 011_v3_0_5_8_fix_bao_vang_schema.sql trong Supabase rồi tải lại trang.':''; return toast(`Không ghi được dữ liệu: ${m}${hint}`,'err'); }
  const reportError=await saveClassReport(payload.length,u); if(reportError){return toast(`Đã ghi học sinh nhưng chưa cập nhật trạng thái lớp: ${reportError}`,'err');} toast(`Đã ghi nhận ${payload.length} học sinh vắng.`,'ok'); resetAfterSave();
}
async function saveZero(){const u=window.App?.Auth?.currentUser;if(!canManageAbsence(u,selectedClass)){rejectWrite('Không được phép báo vắng',`Tài khoản hiện tại không có quyền báo vắng cho lớp ${selectedClass}. Hệ thống không ghi dữ liệu vào CSDL.`);return;}const allowed=await classHasSchedule(selectedClass,selectedGrade,date,buoi);if(!allowed){rejectWrite('Không ghi báo vắng',`Lớp ${selectedClass} chưa có lịch học ${buoi} ngày ${formatDate(date)} trong TKB. Vì vậy hệ thống không ghi bản ghi “vắng 0”. Vui lòng khai báo TKB trước. Hệ thống không ghi dữ liệu vào CSDL.`);return;}const u=window.App?.Auth?.currentUser;const err=await saveClassReport(0,u);if(err)return toast(err,'err');toast(`Đã xác nhận ${selectedClass}: vắng 0.`, 'ok');resetAfterSave()}
async function saveClassReport(count,u){const payload={nam_hoc:appConfig.namHoc,ngay_bao:date,buoi,khoi:selectedGrade,lop:selectedClass,so_vang:count,ma_cb:u?.ma_cb||null,ten_cb:u?.ho_ten||null,trang_thai:'Đã báo',updated_at:new Date().toISOString()};const {error}=await supabase.from('bao_vang_lop').upsert(payload,{onConflict:'nam_hoc,ngay_bao,buoi,lop'});return error?.message||null}
function resetAfterSave(){root.querySelector('#absCount').value='';root.querySelector('#absRows').innerHTML='<div class="empty">Đã ghi nhận. Có thể chọn số vắng cho lượt tiếp theo.</div>';if(canMonitorAbsence(window.App?.Auth?.currentUser))loadMonitor()}

async function loadMonitor(){
  const box=root.querySelector('#absenceMonitor'); if(!box)return;
  box.innerHTML='<div class="panel"><div class="empty">Đang tải theo dõi báo vắng...</div></div>';
  try{
    const scheduled=await scheduledClasses(date,buoi);
    const reports=await fetchAll(()=>supabase.from('bao_vang_lop').select('lop,so_vang,trang_thai,ma_cb,ten_cb').eq('nam_hoc',appConfig.namHoc).eq('ngay_bao',date).eq('buoi',buoi));
    const reportMap=new Map(reports.map(x=>[String(x.lop),x]));
    const done=scheduled.filter(x=>reportMap.has(x.lop));
    const pending=scheduled.filter(x=>!reportMap.has(x.lop));
    box.innerHTML=`<div class="panel absence-monitor"><div class="page-head"><div><h3 style="margin:0">📋 Theo dõi báo vắng — ${esc(date)} · ${esc(buoi)}</h3><p>Dựa trên các lớp có lịch học; lớp không có học sinh vắng vẫn phải có bản ghi “vắng 0”.</p></div><button id="monitorRefresh" class="btn light">↻ Cập nhật</button></div>${scheduled.length===0?'<div class="notice warn"><b>Chưa có dữ liệu lớp có lịch.</b> Hệ thống đang ưu tiên TKB. Nếu TKB chưa nhập, hãy vào Quản trị → TKB & TG học để nhập lịch; cấu hình <code>cai_dat_thoi_gian</code> chỉ là phương án dự phòng.</div>':''}<div class="monitor-cards"><button class="monitor-card total"><b>${scheduled.length}</b><span>Số lớp có lịch</span></button><button class="monitor-card done"><b>${done.length}</b><span>Đã báo</span></button><button id="pendingBtn" class="monitor-card pending"><b>${pending.length}</b><span>Chưa báo</span></button></div><div id="pendingList" class="pending-list ${pending.length?'hidden':''}">${pending.length?pending.map(x=>`<button class="pending-class">${esc(x.lop)}</button>`).join(''):'<span class="empty">${scheduled.length?'Tất cả lớp đã báo.':'Chưa xác định được lớp có lịch. Hãy nhập TKB hoặc cấu hình thời gian học cho năm học 2026-2027.'}</span>'}</div><div class="table-wrap"><table class="table"><thead><tr><th>Lớp</th><th>Trạng thái</th><th>Số vắng</th><th>Người báo</th></tr></thead><tbody>${scheduled.map(x=>{const r=reportMap.get(x.lop);return `<tr><td><b>${esc(x.lop)}</b></td><td>${r?'<span class="badge ok">Đã báo</span>':'<span class="badge warn">Chưa báo</span>'}</td><td>${r?esc(r.so_vang):'—'}</td><td>${r?esc(r.ten_cb||r.ma_cb||''): '—'}</td></tr>`}).join('')}</tbody></table></div></div>`;
    box.querySelector('#monitorRefresh').onclick=loadMonitor;
    box.querySelector('#pendingBtn').onclick=()=>box.querySelector('#pendingList').classList.toggle('hidden');
  }catch(e){box.innerHTML=`<div class="danger-box">Không tải được theo dõi báo vắng: ${esc(e.message)}<br><small>Hãy chạy SQL 011_v3_0_5_8_fix_bao_vang_schema.sql để tạo/cập nhật bảng và làm mới schema cache.</small></div>`}
}

async function scheduledClasses(day,session){
  const dow=new Date(`${day}T12:00:00`).getDay(); const thu=dow===0?8:dow+1;
  const q=await supabase.from('thoi_khoa_bieu').select('lop,khoi,thu,buoi,trang_thai').eq('nam_hoc',appConfig.namHoc).eq('thu',thu).eq('buoi',session).eq('trang_thai','Hoạt động');
  if(q.error)throw q.error;
  const rows=q.data||[]; const out=new Map();
  let allClasses=null;
  const addClasses=async(filter,source)=>{
    const qq=await fetchAll(()=>supabase.from('danh_sach').select('lop,khoi').eq('trang_thai','Active').not('lop','is',null));
    for(const c of qq){const lop=String(c.lop||'').trim(),khoi=String(c.khoi||'').trim();if(!lop)continue;if(filter(khoi,lop))out.set(lop,{lop,source});}
  };
  for(const r of rows){
    const khoi=String(r.khoi||'').trim(),lop=String(r.lop||'').trim();
    if(lop){out.set(lop,{lop,source:`Lớp ${lop}`});continue;}
    if(khoi){await addClasses((g,l)=>g===khoi,`${khoi} — áp dụng toàn khối`);continue;}
    await addClasses(()=>true,'Toàn trường');
  }
  const scope=managedClasses(window.App?.Auth?.currentUser);let a=[...out.values()];if(scope!==null)a=a.filter(x=>scope.includes(x.lop));return a.sort((a,b)=>naturalSort(a.lop,b.lop));
}
async function classHasSchedule(cls,grade,day,session){if(!cls||!session)return false;const list=await scheduledClasses(day,session);return list.some(x=>x.lop===String(cls).trim())}

async function detectCurrentSession(now){
  const t=now.toTimeString().slice(0,8);
  try{
    const {data,error}=await supabase.from('cai_dat_thoi_gian').select('buoi,gio_bat_dau_diem_danh,gio_ket_thuc_diem_danh').eq('nam_hoc',appConfig.namHoc).eq('trang_thai','Học');
    if(!error){
      const hit=(data||[]).find(x=>{const a=String(x.gio_bat_dau_diem_danh||'').slice(0,8),b=String(x.gio_ket_thuc_diem_danh||'').slice(0,8);return a&&b&&a<=t&&t<=b});
      if(hit?.buoi)return hit.buoi;
    }
  }catch{}
  // Quy ước mặc định của trường: buổi chiều bắt đầu từ tiết 2 lúc 14:00.
  const hm=now.getHours()*60+now.getMinutes();
  if(hm>=14*60&&hm<=18*60+30)return 'Chiều';
  if(hm>=6*60&&hm<13*60)return 'Sáng';
  return hm<14*60?'Sáng':'Chiều';
}
function localDate(d){const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');return `${y}-${m}-${day}`}
function formatDate(v){if(!v)return 'Chưa có ngày sinh';const m=String(v).match(/^(\d{4})-(\d{2})-(\d{2})/);return m?`${m[3]}/${m[2]}/${m[1]}`:String(v)}
function showError(message){const body=root?.querySelector('#absRows');if(body)body.innerHTML=`<div class="danger-box">${esc(message)}</div>`}
function naturalSort(a,b){return a.localeCompare(b,'vi',{numeric:true,sensitivity:'base'})}
