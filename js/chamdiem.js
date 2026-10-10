import {supabase,managedClasses,roleOf,canScore} from './config.js?v=3.0.5.25.33';
import {esc,toast} from './ui.js?v=3.0.5.25.33';

let root;
let grades=[];
let classes=[];
let students=[];
let criteria=[];
let mode='individual';
function isActiveStudent(r){const s=String(r&&r.trang_thai==null?'':r.trang_thai).normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();return !s||['active','dang hoc','hoc','true','1','hoat dong'].includes(s)}

export async function init(r){
  root=r;
  mode='individual';
  const role=roleOf(window.App?.Auth?.currentUser);
  if(role==='Cán bộ lớp'){
    await renderClassOfficerShell();
    return;
  }
  await renderShell();
  await loadGrades();
  await loadCriteria();
}

function renderShell(){
  root.innerHTML=`
    <div class="score-hero-modern">
      <div class="score-hero-icon">⭐</div>
      <div class="score-hero-copy">
        <div class="score-kicker">THI ĐUA HỌC SINH</div>
        <h2>Chấm điểm thi đua</h2>
        <p>Chọn khối → chọn lớp → chọn hình thức chấm. Mọi thao tác được thiết kế nhanh và dễ dùng trên máy tính lẫn điện thoại.</p>
      </div>
      <div class="score-hero-badge">${esc(window.App?.Auth?.currentUser?.vai_tro||'')}</div>
    </div>

    <div class="score-flow-grid">
      <section class="score-card-modern score-step-card">
        <div class="score-step-title"><span class="score-step-num blue">1</span><div><b>Chọn khối</b><small>Khối cần chấm điểm</small></div></div>
        <div id="scoreGradeRadios" class="grade-radios modern-grade-grid"><span class="class-empty">Đang tải khối...</span></div>
      </section>

      <section class="score-card-modern score-step-card">
        <div class="score-step-title"><span class="score-step-num green">2</span><div><b>Chọn lớp</b><small id="scoreClassHint">Chọn khối để xem danh sách lớp</small></div></div>
        <div class="score-class-search-wrap"><span>⌕</span><input id="scoreClassSearch" placeholder="Tìm nhanh lớp..." autocomplete="off"></div>
        <div id="scoreClassRadios" class="class-radios modern-class-grid"><span class="class-empty">Hãy chọn khối trước.</span></div>
      </section>
    </div>

    <section id="scoreModeWrap" class="score-card-modern score-mode-card hidden">
      <div class="score-section-heading"><span class="score-step-num pink">3</span><div><b>Chọn hình thức chấm</b><small>Chọn cá nhân hoặc tập thể</small></div></div>
      <div class="score-mode modern-mode-grid">
        <button type="button" data-mode="individual" class="active"><span class="mode-icon blue">👤</span><span><b>Chấm điểm cá nhân</b><small>Nhập điểm cho từng học sinh</small></span><span class="mode-arrow">›</span></button>
        <button type="button" data-mode="collective"><span class="mode-icon orange">👥</span><span><b>Chấm điểm tập thể</b><small>Nhập điểm cho cả lớp</small></span><span class="mode-arrow">›</span></button>
      </div>
    </section>

    <section class="score-card-modern score-work-card">
      <div class="score-section-heading"><span class="score-step-num purple">4</span><div><b>Thực hiện chấm điểm</b><small id="scoreWorkHint">Chưa chọn lớp</small></div></div>
      <div id="scoreFormWrap"><div class="score-empty-modern"><div>🎯</div><h3>Sẵn sàng bắt đầu?</h3><p>Chọn khối và lớp ở phía trên để mở biểu mẫu chấm điểm.</p></div></div>
    </section>`;
  root.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>setMode(b.dataset.mode));
  const search=root.querySelector('#scoreClassSearch');
  if(search) search.oninput=()=>{
    const q=normalizeText(search.value);
    root.querySelectorAll('#scoreClassRadios .class-radio').forEach(x=>{
      const txt=normalizeText(x.textContent);
      x.style.display=!q||txt.includes(q)?'flex':'none';
    });
  };
}

async function renderClassOfficerShell(){
  const u=window.App?.Auth?.currentUser||{};
  root.innerHTML=`
    <div class="page-head">
      <div>
        <h2>Chấm điểm — Cán bộ lớp</h2>
        <p>Tài khoản được cố định theo lớp được phân công. Không cần chọn khối hoặc lớp.</p>
      </div>
      <span class="badge ok">Lớp: ${esc(u.lop_quan_ly||'Chưa xác định')}</span>
    </div>
    <div class="score-mode" style="margin-top:16px">
      <button type="button" data-officer-mode="book" class="active">
        📘 Nhập điểm Sổ đầu bài
        <small style="display:block;color:var(--muted);margin-top:5px;font-weight:500">Nhập số tiết đạt điểm 0–10 trong tuần.</small>
      </button>
      <button type="button" data-officer-mode="students">
        👨‍🎓 Nhập điểm học sinh
        <small style="display:block;color:var(--muted);margin-top:5px;font-weight:500">Nhập số lần mỗi học sinh đạt từng mức điểm 0–10.</small>
      </button>
    </div>
    <div id="officerScoreBody" class="score-form-wrap" style="margin-top:16px">
      <div class="empty">Đang tải dữ liệu lớp...</div>
    </div>`;

  let cls=String(u.lop_quan_ly||'').trim();
  if(!cls && u.ma_hs){
    try{
      const {data}=await supabase.from('danh_sach').select('lop').eq('ma_hs',u.ma_hs).maybeSingle();
      cls=String(data?.lop||'').trim();
    }catch(e){}
  }
  if(!cls){
    root.querySelector('#officerScoreBody').innerHTML='<div class="empty">Tài khoản Cán bộ lớp chưa được gán lớp. Hãy kiểm tra lại tài khoản.</div>';
    return;
  }
  await loadStudentsForClass(cls);
  const year=window.App?.appConfig?.namHoc||'2026-2027';
  const week=isoWeekNow();
  root.querySelectorAll('[data-officer-mode]').forEach(b=>b.onclick=()=>{
    root.querySelectorAll('[data-officer-mode]').forEach(x=>x.classList.toggle('active',x===b));
    if(b.dataset.officerMode==='book') renderOfficerBook(root.querySelector('#officerScoreBody'),cls,year,week);
    else renderOfficerStudents(root.querySelector('#officerScoreBody'),cls,year,week);
  });
  renderOfficerBook(root.querySelector('#officerScoreBody'),cls,year,week);
}

async function fetchAll(queryFactory, chunk=1000){
  const all=[];
  let from=0;
  while(true){
    const {data,error}=await queryFactory().range(from,from+chunk-1);
    if(error) throw error;
    const rows=data||[];
    all.push(...rows);
    if(rows.length<chunk) break;
    from+=chunk;
  }
  return all;
}

async function loadGrades(){
  try{
    const data=await fetchAll(()=>supabase
      .from('danh_sach')
      .select('khoi,trang_thai')
      .not('khoi','is',null)
      .order('khoi'));

    grades=[...new Set(data.filter(isActiveStudent).map(x=>String(x.khoi).trim()).filter(Boolean))]
      .sort(naturalSort);

    const box=root.querySelector('#scoreGradeRadios');
    if(!grades.length){
      box.innerHTML='<span class="class-empty">Không có dữ liệu khối.</span>';
      return;
    }

    box.innerHTML=grades.map((g,i)=>`
      <label class="grade-radio">
        <input type="radio" name="scoreGrade" value="${esc(g)}">
        <span class="radio-dot"></span>
        <span>${esc(g)}</span>
      </label>
    `).join('');

    box.querySelectorAll('input[name="scoreGrade"]').forEach(r=>{
      r.onchange=()=>onGradeChange(r.value);
    });
  }catch(e){
    showError(e.message);
  }
}

async function onGradeChange(grade){
  const classBox=root.querySelector('#scoreClassRadios');

  root.querySelector('#scoreModeWrap').classList.add('hidden');
  root.querySelector('#scoreFormWrap').innerHTML='<div class="empty">Hãy chọn lớp.</div>';
  classBox.innerHTML='<span class="class-empty">Đang tải danh sách lớp...</span>';
  students=[];
  classes=[];

  if(!grade){
    classBox.innerHTML='<span class="class-empty">Hãy chọn khối trước.</span>';
    return;
  }

  try{
    const data=await fetchAll(()=>supabase
      .from('danh_sach')
      .select('lop,khoi,trang_thai')
      .eq('khoi',grade)
      .not('lop','is',null)
      .order('lop'));

    classes=[...new Set(data.filter(isActiveStudent).map(x=>String(x.lop).trim()).filter(Boolean))]
      .sort(naturalSort);
    const scope=managedClasses(window.App?.Auth?.currentUser);
    if(scope!==null) classes=classes.filter(c=>scope.includes(c));

    if(!classes.length){
      classBox.innerHTML='<span class="class-empty">Khối này chưa có lớp.</span>';
      const hint=root.querySelector('#scoreClassHint');
      if(hint) hint.textContent='Chưa có lớp thuộc khối này.';
      return;
    }

    classBox.innerHTML=classes.map(c=>`
      <label class="class-radio">
        <input type="radio" name="scoreClass" value="${esc(c)}">
        <span>${esc(c)}</span>
      </label>
    `).join('');

    const hint=root.querySelector('#scoreClassHint');
    if(hint) hint.textContent=`${classes.length} lớp thuộc ${grade} · Chọn một lớp để bắt đầu chấm.`;

    classBox.querySelectorAll('input[name="scoreClass"]').forEach(r=>{
      r.onchange=()=>onClassChange(r.value);
    });
  }catch(e){
    showError(e.message);
  }
}

async function onClassChange(cls){
  const grade=root.querySelector('input[name="scoreGrade"]:checked')?.value || '';

  root.querySelector('#scoreModeWrap').classList.toggle('hidden',!cls);
  const workHint=root.querySelector('#scoreWorkHint');
  if(workHint) workHint.textContent=cls?`Đang chấm lớp ${cls}`:'Chưa chọn lớp';

  if(!cls){
    root.querySelector('#scoreFormWrap').innerHTML='<div class="empty">Hãy chọn lớp.</div>';
    return;
  }

  try{
    await loadStudents(grade,cls);
    const role=roleOf(window.App?.Auth?.currentUser);
    if(role==='Cán bộ lớp'){
      root.querySelector('#scoreModeWrap').classList.add('hidden');
      renderClassOfficer(wrapForOfficer(),cls);
    }else{
      root.querySelector('#scoreModeWrap').classList.remove('hidden');
      setMode('individual');
    }
  }catch(e){
    showError(e.message);
  }
}

async function loadStudentsForClass(cls){
  students=await fetchAll(()=>supabase
    .from('danh_sach')
    .select('ma_hs,ho_ten,khoi,lop,ngay_sinh,ma_qr,trang_thai')
    .eq('lop',cls)
    .order('ho_ten'));
  students=students.filter(isActiveStudent);
  students.sort((a,b)=>{
    const n=String(a.ho_ten||'').localeCompare(String(b.ho_ten||''),'vi',{sensitivity:'base'});
    if(n!==0)return n;
    return String(a.ngay_sinh||'').localeCompare(String(b.ngay_sinh||''));
  });
}

async function loadStudents(grade,cls){
  // Không dùng .limit(1000). Dùng phân trang để không mất học sinh khi bảng > 1.000 dòng.
  students=await fetchAll(()=>supabase
    .from('danh_sach')
    .select('ma_hs,ho_ten,khoi,lop,ngay_sinh,ma_qr,trang_thai')
    .eq('khoi',grade)
    .eq('lop',cls)
    .order('ho_ten'));

  students=students.filter(isActiveStudent);

  // Sắp xếp theo tên, sau đó ngày sinh để dễ nhận diện học sinh trùng tên.
  students.sort((a,b)=>{
    const n=String(a.ho_ten||'').localeCompare(String(b.ho_ten||''),'vi',{sensitivity:'base'});
    if(n!==0)return n;
    return String(a.ngay_sinh||'').localeCompare(String(b.ngay_sinh||''));
  });
}

async function loadCriteria(){
  const {data,error}=await supabase
    .from('danh_muc_diem')
    .select('ma_hd,ten_hd,mang,loai,diem,doi_tuong')
    .order('mang')
    .order('loai')
    .order('ten_hd');

  if(error){
    showError(error.message);
    return;
  }
  criteria=data||[];
}

function setMode(next){
  const currentRole=roleOf(window.App?.Auth?.currentUser);
  if(next==='collective' && currentRole==='Cờ đỏ')return toast('Cờ đỏ chỉ được chấm điểm cá nhân.','err');
  mode=next;
  root.querySelectorAll('[data-mode]').forEach(b=>{
    b.classList.toggle('active',b.dataset.mode===mode);
  });
  renderScoreForm();
}


function wrapForOfficer(){return root.querySelector('#scoreFormWrap');}

function isoWeekNow(){
  const d=new Date();
  const x=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()));
  const day=x.getUTCDay()||7;
  x.setUTCDate(x.getUTCDate()+4-day);
  const yearStart=new Date(Date.UTC(x.getUTCFullYear(),0,1));
  return Math.ceil((((x-yearStart)/86400000)+1)/7);
}

function officerScoreInputs(prefix){
  return [10,9,8,7,6,5,4,3,2,1,0].map(d=>`
    <label style="min-width:74px;text-align:center"><span style="display:block;font-weight:800;margin-bottom:5px">${d}</span><input class="score-count" data-score="${d}" data-prefix="${prefix}" type="number" min="0" step="1" value="0" style="width:68px;text-align:center"></label>
  `).join('');
}

function renderClassOfficer(wrap,cls){
  const u=window.App?.Auth?.currentUser;
  const year=window.App?.appConfig?.namHoc||'2026-2027';
  const week=isoWeekNow();
  wrap.innerHTML=`
    <div class="score-form">
      <div class="page-head">
        <div><h3 style="margin:0">🎓 Nhập điểm thi đua — lớp ${esc(cls)}</h3><p>Tài khoản Cán bộ lớp chỉ được nhập <b>Sổ đầu bài</b> của lớp mình và thống kê điểm <b>0–10 của học sinh trong lớp</b>.</p></div>
        <span class="badge ok">Tuần ${week}</span>
      </div>
      <div class="score-mode">
        <button type="button" data-officer-mode="book" class="active">📘 Sổ đầu bài<small style="display:block;color:var(--muted);margin-top:5px;font-weight:500">Số tiết theo từng mức điểm 0–10 trong tuần.</small></button>
        <button type="button" data-officer-mode="students">👨‍🎓 Điểm học sinh<small style="display:block;color:var(--muted);margin-top:5px;font-weight:500">Mỗi học sinh có bao nhiêu điểm 10, 9, ... 0.</small></button>
      </div>
      <div id="officerScoreBody"></div>
    </div>`;
  root.querySelectorAll('[data-officer-mode]').forEach(b=>b.onclick=()=>{
    root.querySelectorAll('[data-officer-mode]').forEach(x=>x.classList.toggle('active',x===b));
    if(b.dataset.officerMode==='book')renderOfficerBook(root.querySelector('#officerScoreBody'),cls,year,week);
    else renderOfficerStudents(root.querySelector('#officerScoreBody'),cls,year,week);
  });
  renderOfficerBook(root.querySelector('#officerScoreBody'),cls,year,week);
}

function renderOfficerBook(body,cls,year,week){
  body.innerHTML=`
    <div class="notice"><b>Sổ đầu bài — ${esc(cls)}</b><br>Nhập số lượng tiết trong tuần theo mức điểm. Ví dụ: điểm 10 = 12 tiết, điểm 9 = 5 tiết. Tổng các cột 0–10 phải bằng tổng số tiết trong tuần.</div>
    <div class="toolbar"><label style="max-width:180px">Tuần học<input id="offWeek" type="number" min="1" max="53" value="${week}"></label><label style="max-width:220px">Tổng số tiết<input id="offTotal" type="number" min="0" step="1" value="0"></label></div>
    <div style="display:flex;flex-wrap:wrap;gap:10px;align-items:end;margin-top:12px">${officerScoreInputs('book')}</div>
    <div id="offBookSummary" class="score-summary" style="margin-top:15px">Tổng số tiết theo điểm: 0.</div>
    <div class="action-row"><button id="saveOfficerBook" class="btn primary">💾 Lưu Sổ đầu bài</button></div>`;
  const inputs=[...body.querySelectorAll('.score-count')];
  const update=()=>{const sum=inputs.reduce((a,x)=>a+Number(x.value||0),0);body.querySelector('#offBookSummary').textContent=`Tổng số tiết theo điểm: ${sum}. ${sum===Number(body.querySelector('#offTotal').value||0)?'Đã khớp tổng số tiết.':'Chưa khớp tổng số tiết.'}`};
  inputs.forEach(x=>x.oninput=update);body.querySelector('#offTotal').oninput=update;
  body.querySelector('#saveOfficerBook').onclick=()=>saveOfficerBook(cls,year,Number(body.querySelector('#offWeek').value),Number(body.querySelector('#offTotal').value),inputs);
  loadOfficerExisting('SoDauBai',cls,year,Number(week),body,inputs,body.querySelector('#offTotal'));
}

function renderOfficerStudents(body,cls,year,week){
  body.innerHTML=`
    <div class="notice"><b>Điểm học sinh — ${esc(cls)}</b><br>Nhập số lần mỗi học sinh đạt từng mức điểm từ <b>0 đến 10</b> trong tuần. Dữ liệu được lưu riêng để sau này tính thi đua theo học sinh.</div>
    <div class="toolbar"><label style="max-width:180px">Tuần học<input id="stuWeek" type="number" min="1" max="53" value="${week}"></label><span class="badge">${students.length} học sinh</span></div>
    <div class="table-wrap" style="margin-top:12px"><table class="table"><thead><tr><th>Học sinh</th>${[10,9,8,7,6,5,4,3,2,1,0].map(d=>`<th>${d}</th>`).join('')}<th>Tổng</th></tr></thead><tbody>${students.map((st,i)=>`<tr><td><b>${esc(st.ho_ten)}</b><br><small>${esc(st.ma_hs)}</small></td>${[10,9,8,7,6,5,4,3,2,1,0].map(d=>`<td><input class="student-score-count" data-i="${i}" data-score="${d}" type="number" min="0" step="1" value="0" style="width:55px;text-align:center"></td>`).join('')}<td class="student-total" data-i="${i}">0</td></tr>`).join('')}</tbody></table></div>
    <div class="score-summary" style="margin-top:15px">Mỗi ô là số lần học sinh đạt mức điểm tương ứng trong tuần.</div>
    <div class="action-row"><button id="saveOfficerStudents" class="btn primary">💾 Lưu điểm học sinh</button></div>`;
  body.querySelectorAll('.student-score-count').forEach(x=>x.oninput=()=>{const i=x.dataset.i;let t=0;body.querySelectorAll(`.student-score-count[data-i="${i}"]`).forEach(y=>t+=Number(y.value||0));const cell=body.querySelector(`.student-total[data-i="${i}"]`);if(cell)cell.textContent=t});
  body.querySelector('#saveOfficerStudents').onclick=()=>saveOfficerStudents(cls,year,Number(body.querySelector('#stuWeek').value),body);
  loadOfficerStudentExisting(cls,year,Number(week),body);
}

async function loadOfficerExisting(kind,cls,year,week,body,inputs,totalEl){
  try{const {data,error}=await supabase.from('diem_hoc_tap_tuan').select('diem,so_luong').eq('nam_hoc',year).eq('tuan_hoc',week).eq('lop',cls).eq('loai_diem',kind);if(error)return;let sum=0;(data||[]).forEach(r=>{const x=inputs.find(i=>Number(i.dataset.score)===Number(r.diem));if(x)x.value=Number(r.so_luong||0);sum+=Number(r.so_luong||0)});if(totalEl)totalEl.value=sum;body.querySelectorAll('.score-count').forEach(x=>x.dispatchEvent(new Event('input')));}catch(e){}
}

async function loadOfficerStudentExisting(cls,year,week,body){
  try{const {data,error}=await supabase.from('diem_hoc_tap_tuan').select('ma_hs,diem,so_luong').eq('nam_hoc',year).eq('tuan_hoc',week).eq('lop',cls).eq('loai_diem','HocSinh');if(error)return;(data||[]).forEach(r=>{const i=students.findIndex(s=>String(s.ma_hs)===String(r.ma_hs));if(i<0)return;const x=body.querySelector(`.student-score-count[data-i="${i}"][data-score="${Number(r.diem)}"]`);if(x)x.value=Number(r.so_luong||0)});body.querySelectorAll('.student-score-count').forEach(x=>x.dispatchEvent(new Event('input')));}catch(e){}
}

async function saveOfficerBook(cls,year,week,total,inputs){
  const u=window.App?.Auth?.currentUser;const counts=inputs.map(x=>({diem:Number(x.dataset.score),so_luong:Math.max(0,Number(x.value||0))}));const sum=counts.reduce((a,x)=>a+x.so_luong,0);
  if(!Number.isInteger(week)||week<1||week>53)return toast('Tuần học phải từ 1 đến 53.','err');
  if(total!==sum)return toast(`Tổng số tiết (${total}) phải bằng tổng các mức điểm (${sum}).`,'err');
  if(!Number.isInteger(total)||total<0)return toast('Tổng số tiết không hợp lệ.','err');
  const del=await supabase.from('diem_hoc_tap_tuan').delete().eq('nam_hoc',year).eq('tuan_hoc',week).eq('lop',cls).eq('loai_diem','SoDauBai');
  if(del.error)return toast('Không thể cập nhật Sổ đầu bài: '+del.error.message,'err');
  const rows=counts.filter(x=>x.so_luong>0).map(x=>({nam_hoc:year,tuan_hoc:week,lop:cls,loai_diem:'SoDauBai',diem:x.diem,so_luong:x.so_luong,ma_nguoi_cap_nhat:u?.ma_cb||null,ten_nguoi_cap_nhat:u?.ho_ten||null}));
  if(rows.length){const ins=await supabase.from('diem_hoc_tap_tuan').insert(rows);if(ins.error)return toast('Không lưu được Sổ đầu bài: '+ins.error.message,'err');}
  toast(`Đã lưu Sổ đầu bài lớp ${cls}, tuần ${week}.`,'ok');
}

async function saveOfficerStudents(cls,year,week,body){
  const u=window.App?.Auth?.currentUser;
  if(!Number.isInteger(week)||week<1||week>53)return toast('Tuần học phải từ 1 đến 53.','err');
  const rows=[];
  students.forEach((s,i)=>{body.querySelectorAll(`.student-score-count[data-i="${i}"]`).forEach(x=>{const n=Math.max(0,Number(x.value||0));if(n>0)rows.push({nam_hoc:year,tuan_hoc:week,lop:cls,ma_hs:s.ma_hs,ho_ten:s.ho_ten,loai_diem:'HocSinh',diem:Number(x.dataset.score),so_luong:n,ma_nguoi_cap_nhat:u?.ma_cb||null,ten_nguoi_cap_nhat:u?.ho_ten||null})})});
  const del=await supabase.from('diem_hoc_tap_tuan').delete().eq('nam_hoc',year).eq('tuan_hoc',week).eq('lop',cls).eq('loai_diem','HocSinh');
  if(del.error)return toast('Không thể cập nhật điểm học sinh: '+del.error.message,'err');
  if(rows.length){const ins=await supabase.from('diem_hoc_tap_tuan').insert(rows);if(ins.error)return toast('Không lưu được điểm học sinh: '+ins.error.message,'err');}
  toast(`Đã lưu điểm học sinh lớp ${cls}, tuần ${week}.`,'ok');
}

function renderScoreForm(){
  const wrap=root.querySelector('#scoreFormWrap');
  const role=roleOf(window.App?.Auth?.currentUser);
  if(role==='Cán bộ lớp'){
    const cls=String(window.App?.Auth?.currentUser?.lop_quan_ly||'').trim();
    if(cls) renderClassOfficer(wrap,cls);
    else wrap.innerHTML='<div class="empty">Tài khoản Cán bộ lớp chưa được gán lớp.</div>';
    return;
  }
  const cls=root.querySelector('input[name="scoreClass"]:checked')?.value || '';

  if(!cls){
    wrap.innerHTML='<div class="empty">Hãy chọn khối và lớp trước.</div>';
    return;
  }
  if(mode==='collective'){
    renderCollective(wrap,cls);
  }else{
    renderIndividual(wrap);
  }
}

function renderCollective(wrap,cls){
  const role=roleOf(window.App?.Auth?.currentUser);
  const allList=getCriteria('Tập thể');
  const list=role==='Cán bộ lớp' ? allList.filter(c=>{const m=normalizeText(c.mang||'');const n=normalizeText(c.ten_hd||'');return m.includes('so dau bai')||n.includes('so dau bai');}) : allList;
  const note=list.length
    ? ''
    : `<div class="score-no-criteria">
         <b>Chưa có tiêu chí chấm cho tập thể trong CSDL.</b><br>
         Kiểm tra trường <code>danh_muc_diem.doi_tuong</code>.
         Cần có giá trị như <code>Tập thể</code> (hoặc <code>Tập thể lớp</code>).
         ${role==='Cán bộ lớp'?'Đối với Cán bộ lớp, tiêu chí phải thuộc <code>Sổ đầu bài</code> ở trường <code>mang</code> hoặc trong tên tiêu chí.':'Anh có thể vào <b>Quản trị → Quản lý tiêu chí</b> để tạo tiêu chí tập thể.'}
       </div>`;

  wrap.innerHTML=`
    <div class="score-form">
      <div class="page-head">
        <div>
          <h3 style="margin:0">👥 ${role==='Cán bộ lớp'?'Nhập điểm Sổ đầu bài — lớp':'Chấm điểm tập thể — lớp'} ${esc(cls)}</h3>
          <p>${role==='Cán bộ lớp'?'Chỉ hiển thị tiêu chí Sổ đầu bài áp dụng cho tập thể lớp.':'Chỉ hiển thị tiêu chí được đánh dấu đối tượng tập thể.'}</p>
        </div>
      </div>

      ${note}

      <label>Chọn loại điểm</label>
      <div class="score-radio-group">
        <label class="score-radio plus">
          <input type="radio" name="collectiveType" value="plus">
          <span class="radio-dot"></span>
          <span>➕ Điểm cộng</span>
        </label>
        <label class="score-radio minus">
          <input type="radio" name="collectiveType" value="minus">
          <span class="radio-dot"></span>
          <span>➖ Điểm trừ</span>
        </label>
      </div>

      <label style="margin-top:15px">Danh mục nội dung
        <select id="collectiveCriteria" ${list.length?'':'disabled'}>
          <option value="">-- Chọn điểm cộng/trừ trước --</option>
        </select>
      </label>

      <div id="collectiveSummary" class="score-summary">
        Chưa chọn tiêu chí.
      </div>

      <div class="action-row">
        <button id="saveCollective" class="btn primary" ${list.length?'':'disabled'}>
          💾 Ghi thông tin vào CSDL
        </button>
      </div>
    </div>
  `;

  bindRadioCriteria('collectiveType','collectiveCriteria','collectiveSummary','Tập thể');
  root.querySelector('#saveCollective').onclick=saveCollective;
}

function renderIndividual(wrap){
  wrap.innerHTML=`
    <div class="score-form">
      <div class="page-head">
        <div>
          <h3 style="margin:0">👨‍🎓 Chấm điểm cá nhân</h3>
          <p>Chọn học sinh theo <b>họ tên + ngày sinh</b>; không hiển thị mã định danh.</p>
        </div>
        <span class="badge">${students.length} học sinh</span>
      </div>

      <label>Chọn học sinh
        <select id="scoreStudent" class="score-student-select">
          <option value="">-- Chọn học sinh --</option>
          ${students.map((s,i)=>`
            <option value="${esc(String(i))}">
              ${esc(s.ho_ten)} — ${formatDate(s.ngay_sinh)}
            </option>
          `).join('')}
        </select>
      </label>

      <div id="scoreStudentCard"></div>

      <label style="margin-top:15px">Chọn loại điểm</label>
      <div class="score-radio-group">
        <label class="score-radio plus">
          <input type="radio" name="individualType" value="plus">
          <span class="radio-dot"></span>
          <span>➕ Điểm cộng</span>
        </label>
        <label class="score-radio minus">
          <input type="radio" name="individualType" value="minus">
          <span class="radio-dot"></span>
          <span>➖ Điểm trừ</span>
        </label>
      </div>

      <label style="margin-top:15px">Danh mục nội dung
        <select id="individualCriteria">
          <option value="">-- Chọn điểm cộng/trừ trước --</option>
        </select>
      </label>

      <div id="individualSummary" class="score-summary">
        Chưa chọn học sinh và tiêu chí.
      </div>

      <div class="action-row">
        <button id="saveIndividual" class="btn primary">💾 Ghi thông tin vào CSDL</button>
      </div>
    </div>
  `;

  root.querySelector('#scoreStudent').onchange=renderStudentCard;
  bindRadioCriteria('individualType','individualCriteria','individualSummary','Cá nhân');
  root.querySelector('#saveIndividual').onclick=saveIndividual;
}

function bindRadioCriteria(radioName,selectId,summaryId,target){
  const select=root.querySelector('#'+selectId);
  root.querySelectorAll(`input[name="${radioName}"]`).forEach(r=>{
    r.onchange=()=>{
      const list=getCriteria(target).filter(c=>{
        return r.value==='plus'?isPlus(c):isMinus(c);
      });

      select.innerHTML=
        '<option value="">-- Chọn nội dung --</option>'+
        list.map(c=>`
          <option value="${esc(c.ma_hd)}">
            ${esc(c.ten_hd)} (${Number(c.diem)>0?'+':''}${c.diem})
          </option>
        `).join('');

      if(!list.length){
        select.innerHTML='<option value="">-- Chưa có tiêu chí phù hợp --</option>';
        root.querySelector('#'+summaryId).innerHTML=
          `<div class="score-no-criteria">
            Chưa có tiêu chí ${r.value==='plus'?'điểm cộng':'điểm trừ'} cho đối tượng <b>${esc(target)}</b>.
          </div>`;
      }else{
        root.querySelector('#'+summaryId).innerHTML=
          `Đã chọn <span class="badge ${r.value==='plus'?'ok':'warn'}">${r.value==='plus'?'Điểm cộng':'Điểm trừ'}</span>. Hãy chọn nội dung.`;
      }
    };
  });

  select.onchange=()=>{
    const c=criteria.find(x=>x.ma_hd===select.value);
    if(!c){
      root.querySelector('#'+summaryId).textContent='Chưa chọn tiêu chí.';
      return;
    }

    let prefix='';
    if(target==='Cá nhân'){
      const idx=root.querySelector('#scoreStudent')?.value;
      const s=idx!==''&&idx!=null?students[Number(idx)]:null;
      prefix=s?`<b>${esc(s.ho_ten)}</b> — `:'';
    }

    root.querySelector('#'+summaryId).innerHTML=`
      ${prefix}<b>${esc(c.ten_hd)}</b>
      <span class="badge ${Number(c.diem)>=0?'ok':'warn'}" style="margin-left:7px">
        ${Number(c.diem)>0?'+':''}${c.diem}
      </span>
      ${c.mang?`<span class="badge" style="margin-left:5px">${esc(c.mang)}</span>`:''}
    `;
  };
}

function renderStudentCard(){
  const idx=root.querySelector('#scoreStudent').value;
  const s=idx!==''?students[Number(idx)]:null;
  const box=root.querySelector('#scoreStudentCard');

  if(!s){
    box.innerHTML='';
    return;
  }

  box.innerHTML=`
    <div class="score-student">
      <div class="avatar">👨‍🎓</div>
      <div>
        <b>${esc(s.ho_ten)}</b>
        <div style="color:var(--muted);margin-top:3px">
          Ngày sinh: ${formatDate(s.ngay_sinh)} · Lớp ${esc(s.lop)}
        </div>
      </div>
    </div>
  `;

  // Nếu đã chọn tiêu chí trước khi chọn học sinh thì cập nhật lại phần tóm tắt.
  const c=root.querySelector('#individualCriteria')?.value
    ?criteria.find(x=>x.ma_hd===root.querySelector('#individualCriteria').value)
    :null;

  if(c){
    root.querySelector('#individualSummary').innerHTML=
      `<b>${esc(s.ho_ten)}</b> — ${esc(c.ten_hd)}
       <span class="badge ${Number(c.diem)>=0?'ok':'warn'}">
       ${Number(c.diem)>0?'+':''}${c.diem}</span>`;
  }else{
    root.querySelector('#individualSummary').innerHTML=
      `Đã chọn học sinh <b>${esc(s.ho_ten)}</b>. Hãy chọn tiêu chí.`;
  }
}

function getCriteria(target){
  const targetNorm=normalizeText(target);

  return criteria.filter(c=>{
    const d=normalizeText(c.doi_tuong||'Cá nhân');

    if(targetNorm==='tap the'){
      return d==='tap the' ||
             d.includes('tap the') ||
             d.includes('lop') ||
             d.includes('toan lop') ||
             d.includes('tap the lop');
    }

    // Cá nhân: chỉ lấy tiêu chí rõ ràng là cá nhân.
    // Không tự động coi tiêu chí tập thể là cá nhân.
    return d==='ca nhan' || d.includes('ca nhan');
  });
}

function normalizeText(v){
  return String(v??'')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .toLowerCase()
    .trim();
}

function isPlus(c){
  const score=Number(c.diem||0);
  const type=normalizeText(c.loai||'');
  return score>0 || type.includes('cong');
}

function isMinus(c){
  const score=Number(c.diem||0);
  const type=normalizeText(c.loai||'');
  return score<0 ||
    type.includes('tru') ||
    type.includes('vi pham') ||
    type.includes('phat');
}

async function insertEvent(payload){
  // V3.0.5.1 ưu tiên ghi doi_tuong.
  // Nếu CSDL chưa chạy migration 006 thì thử lại không có cột này
  // để frontend không bị khóa hoàn toàn.
  const first=await supabase.from('diem_danh_master').insert(payload);

  if(!first.error)return first;

  const msg=String(first.error.message||'').toLowerCase();
  if(msg.includes('doi_tuong') && (msg.includes('column')||msg.includes('schema cache'))){
    const fallback={...payload};
    delete fallback.doi_tuong;
    return await supabase.from('diem_danh_master').insert(fallback);
  }

  return first;
}

async function saveCollective(){
  const cls=root.querySelector('input[name="scoreClass"]:checked')?.value || '';
  const role=roleOf(window.App?.Auth?.currentUser);
  if(!canScore(window.App?.Auth?.currentUser,cls,'Tập thể'))return toast('Tài khoản không có quyền nhập điểm tập thể cho lớp này.','err');
  if(role==='Cán bộ lớp'){
    const cc=criteria.find(x=>x.ma_hd===root.querySelector('#collectiveCriteria').value);
    const mm=normalizeText(cc?.mang||'');const nn=normalizeText(cc?.ten_hd||'');
    if(!(mm.includes('so dau bai')||nn.includes('so dau bai')))return toast('Cán bộ lớp chỉ được nhập tiêu chí Sổ đầu bài của chính lớp.','err');
  }
  const grade=root.querySelector('input[name="scoreGrade"]:checked')?.value || '';
  const maHd=root.querySelector('#collectiveCriteria').value;
  const c=criteria.find(x=>x.ma_hd===maHd);

  if(!cls)return toast('Chưa chọn lớp.','err');
  if(!c)return toast('Hãy chọn nội dung chấm cho tập thể.','err');

  const u=window.App?.Auth?.currentUser;
  const now=new Date();

  const payload={
    ma_hs:null,
    ho_ten:`Tập thể lớp ${cls}`,
    khoi:grade,
    lop:cls,
    ngay_diem_danh:now.toISOString().slice(0,10),
    buoi:now.getHours()<12?'Sáng':'Chiều',
    trang_thai:Number(c.diem)>=0?'Điểm cộng tập thể':'Điểm trừ tập thể',
    chi_tiet:c.ten_hd,
    ma_hd:c.ma_hd,
    diem:Number(c.diem)||0,
    ma_nguoi_cap_nhat:u?.ma_cb||null,
    ten_nguoi_cap_nhat:u?.ho_ten||null,
    doi_tuong:'Tập thể'
  };

  const {error}=await insertEvent(payload);
  if(error)return toast(`Không ghi được điểm tập thể: ${error.message}`,'err');

  toast(`Đã ghi ${Number(c.diem)>0?'+':''}${c.diem} điểm cho tập thể lớp ${cls}.`,'ok');
  root.querySelector('#collectiveCriteria').value='';
  root.querySelectorAll('input[name="collectiveType"]').forEach(x=>x.checked=false);
  root.querySelector('#collectiveSummary').textContent='Đã ghi nhận. Có thể tiếp tục chấm.';
}

async function saveIndividual(){
  const idx=root.querySelector('#scoreStudent').value;
  const maHd=root.querySelector('#individualCriteria').value;
  const s=idx!==''?students[Number(idx)]:null;
  const c=criteria.find(x=>x.ma_hd===maHd);

  if(!s)return toast('Hãy chọn học sinh.','err');
  if(!c)return toast('Hãy chọn nội dung điểm cộng hoặc điểm trừ.','err');

  const u=window.App?.Auth?.currentUser;
  const now=new Date();

  const payload={
    ma_hs:s.ma_hs,
    ho_ten:s.ho_ten,
    khoi:s.khoi,
    lop:s.lop,
    ngay_diem_danh:now.toISOString().slice(0,10),
    buoi:now.getHours()<12?'Sáng':'Chiều',
    trang_thai:Number(c.diem)>=0?'Điểm cộng':'Điểm trừ',
    chi_tiet:c.ten_hd,
    ma_hd:c.ma_hd,
    diem:Number(c.diem)||0,
    ma_nguoi_cap_nhat:u?.ma_cb||null,
    ten_nguoi_cap_nhat:u?.ho_ten||null,
    doi_tuong:'Cá nhân'
  };

  const {error}=await insertEvent(payload);
  if(error)return toast(`Không ghi được điểm cá nhân: ${error.message}`,'err');

  toast(`Đã ghi ${Number(c.diem)>0?'+':''}${c.diem} điểm cho ${s.ho_ten}.`,'ok');

  root.querySelector('#individualCriteria').value='';
  root.querySelectorAll('input[name="individualType"]').forEach(x=>x.checked=false);
  root.querySelector('#individualSummary').textContent='Đã ghi nhận. Có thể tiếp tục chấm.';
}

function formatDate(v){
  if(!v)return 'Chưa có ngày sinh';
  const m=String(v).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m?`${m[3]}/${m[2]}/${m[1]}`:String(v);
}

function showError(message){
  const wrap=root?.querySelector('#scoreFormWrap');
  if(wrap)wrap.innerHTML=`<div class="danger-box">${esc(message)}</div>`;
}

function naturalSort(a,b){
  return a.localeCompare(b,'vi',{numeric:true,sensitivity:'base'});
}
