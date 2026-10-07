import {supabase} from './config.js';
import {esc,toast} from './ui.js';

let root;
let grades=[];
let classes=[];
let students=[];
let criteria=[];
let mode='individual';

export async function init(r){
  root=r;
  mode='individual';
  await renderShell();
  await loadGrades();
  await loadCriteria();
}

async function renderShell(){
  root.innerHTML=`
    <div class="page-head">
      <div>
        <h2>Chấm Điểm Thi Đua</h2>
        <p>Chọn khối → chọn lớp → chọn đối tượng chấm. Danh mục điểm lấy trực tiếp từ CSDL.</p>
      </div>
      <span class="badge ok">Ghi lịch sử vào CSDL</span>
    </div>

    <div class="score-class-selector">
      <div class="score-selector-box">
        <div class="score-selector-title">Chọn khối</div>
        <div id="scoreGradeRadios" class="grade-radio-group">
          <span class="class-empty">Đang tải danh sách khối...</span>
        </div>
      </div>

      <div class="score-selector-box">
        <div class="score-selector-title">Chọn lớp</div>
        <div id="scoreClassRadios" class="class-radio-group">
          <span class="class-empty">Hãy chọn khối trước.</span>
        </div>
        <div id="scoreClassHint" class="score-class-hint">
          Các lớp sẽ hiển thị theo khối đã chọn.
        </div>
      </div>
    </div>

    <div id="scoreModeWrap" class="hidden">
      <div class="notice">
        <b>Đã chọn lớp:</b> <span id="scoreClassLabel"></span>.
        Chọn hình thức chấm.
      </div>
      <div class="score-mode">
        <button type="button" data-mode="collective">
          👥 Chấm cho tập thể
          <small style="display:block;color:var(--muted);margin-top:5px;font-weight:500">
            Ghi nhận điểm cho cả lớp.
          </small>
        </button>
        <button type="button" data-mode="individual">
          👨‍🎓 Chấm cho cá nhân
          <small style="display:block;color:var(--muted);margin-top:5px;font-weight:500">
            Chọn một học sinh trong lớp.
          </small>
        </button>
      </div>
    </div>

    <div id="scoreFormWrap">
      <div class="empty">Hãy chọn khối và lớp trước.</div>
    </div>
  `;

  // Các nút chọn đối tượng chấm vẫn dùng hàng ngang vì tên ngắn.
  root.querySelectorAll('[data-mode]').forEach(b=>{
    b.onclick=()=>setMode(b.dataset.mode);
  });
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
      .select('khoi')
      .eq('trang_thai','Active')
      .not('khoi','is',null)
      .order('khoi'));

    grades=[...new Set(data.map(x=>String(x.khoi).trim()).filter(Boolean))]
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
      .select('lop')
      .eq('trang_thai','Active')
      .eq('khoi',grade)
      .not('lop','is',null)
      .order('lop'));

    classes=[...new Set(data.map(x=>String(x.lop).trim()).filter(Boolean))]
      .sort(naturalSort);

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
  root.querySelector('#scoreClassLabel').textContent=cls||'';

  if(!cls){
    root.querySelector('#scoreFormWrap').innerHTML='<div class="empty">Hãy chọn lớp.</div>';
    return;
  }

  try{
    await loadStudents(grade,cls);
    setMode('individual');
  }catch(e){
    showError(e.message);
  }
}

async function loadStudents(grade,cls){
  // Không dùng .limit(1000). Dùng phân trang để không mất học sinh khi bảng > 1.000 dòng.
  students=await fetchAll(()=>supabase
    .from('danh_sach')
    .select('ma_hs,ho_ten,khoi,lop,ngay_sinh,ma_qr,trang_thai')
    .eq('trang_thai','Active')
    .eq('khoi',grade)
    .eq('lop',cls)
    .order('ho_ten'));

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
  mode=next;
  root.querySelectorAll('[data-mode]').forEach(b=>{
    b.classList.toggle('active',b.dataset.mode===mode);
  });
  renderScoreForm();
}

function renderScoreForm(){
  const wrap=root.querySelector('#scoreFormWrap');
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
  const list=getCriteria('Tập thể');
  const note=list.length
    ? ''
    : `<div class="score-no-criteria">
         <b>Chưa có tiêu chí chấm cho tập thể trong CSDL.</b><br>
         Kiểm tra trường <code>danh_muc_diem.doi_tuong</code>.
         Cần có giá trị như <code>Tập thể</code> (hoặc <code>Tập thể lớp</code>).
         Anh có thể vào <b>Quản trị → Quản lý tiêu chí</b> để tạo tiêu chí tập thể.
       </div>`;

  wrap.innerHTML=`
    <div class="score-form">
      <div class="page-head">
        <div>
          <h3 style="margin:0">👥 Chấm điểm tập thể — lớp ${esc(cls)}</h3>
          <p>Chỉ hiển thị tiêu chí được đánh dấu đối tượng tập thể.</p>
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
