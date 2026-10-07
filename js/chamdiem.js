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
        <p>Chọn khối → lớp → đối tượng chấm. Điểm cộng/trừ lấy trực tiếp từ danh mục tiêu chí.</p>
      </div>
      <span class="badge ok">Ghi lịch sử vào CSDL</span>
    </div>

    <div class="score-filter">
      <label>Chọn khối
        <select id="scoreGrade">
          <option value="">-- Chọn khối --</option>
        </select>
      </label>
      <label>Chọn lớp
        <select id="scoreClass" disabled>
          <option value="">-- Chọn lớp --</option>
        </select>
      </label>
    </div>

    <div id="scoreModeWrap" class="hidden">
      <div class="notice">
        <b>Đã chọn lớp:</b> <span id="scoreClassLabel"></span>.
        Chọn hình thức chấm bên dưới.
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

  root.querySelector('#scoreGrade').onchange=onGradeChange;
  root.querySelector('#scoreClass').onchange=onClassChange;
  root.querySelectorAll('[data-mode]').forEach(b=>{
    b.onclick=()=>setMode(b.dataset.mode);
  });
}

async function loadGrades(){
  const {data,error}=await supabase
    .from('danh_sach')
    .select('khoi')
    .eq('trang_thai','Active')
    .not('khoi','is',null);

  if(error){
    return showError(error.message);
  }

  grades=[...new Set((data||[]).map(x=>String(x.khoi).trim()).filter(Boolean))]
    .sort(naturalSort);

  const select=root.querySelector('#scoreGrade');
  select.innerHTML='<option value="">-- Chọn khối --</option>'+
    grades.map(g=>`<option value="${esc(g)}">${esc(g)}</option>`).join('');
}

async function onGradeChange(){
  const grade=root.querySelector('#scoreGrade').value;
  const classSelect=root.querySelector('#scoreClass');

  root.querySelector('#scoreModeWrap').classList.add('hidden');
  root.querySelector('#scoreFormWrap').innerHTML='<div class="empty">Hãy chọn lớp.</div>';
  classSelect.innerHTML='<option value="">-- Chọn lớp --</option>';
  classSelect.disabled=true;
  students=[];
  classes=[];

  if(!grade)return;

  const {data,error}=await supabase
    .from('danh_sach')
    .select('lop')
    .eq('trang_thai','Active')
    .eq('khoi',grade)
    .not('lop','is',null);

  if(error)return showError(error.message);

  classes=[...new Set((data||[]).map(x=>String(x.lop).trim()).filter(Boolean))]
    .sort(naturalSort);

  classSelect.innerHTML='<option value="">-- Chọn lớp --</option>'+
    classes.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('');
  classSelect.disabled=false;
}

async function onClassChange(){
  const grade=root.querySelector('#scoreGrade').value;
  const cls=root.querySelector('#scoreClass').value;

  root.querySelector('#scoreModeWrap').classList.toggle('hidden',!cls);
  root.querySelector('#scoreClassLabel').textContent=cls||'';

  if(!cls){
    root.querySelector('#scoreFormWrap').innerHTML='<div class="empty">Hãy chọn lớp.</div>';
    return;
  }

  await loadStudents(grade,cls);
  setMode('individual');
}

async function loadStudents(grade,cls){
  const {data,error}=await supabase
    .from('danh_sach')
    .select('ma_hs,ho_ten,khoi,lop,ngay_sinh,ma_qr,trang_thai')
    .eq('trang_thai','Active')
    .eq('khoi',grade)
    .eq('lop',cls)
    .order('ho_ten');

  if(error)return showError(error.message);
  students=data||[];
}

async function loadCriteria(){
  const {data,error}=await supabase
    .from('danh_muc_diem')
    .select('ma_hd,ten_hd,mang,loai,diem,doi_tuong')
    .order('mang')
    .order('loai')
    .order('ten_hd');

  if(error)return showError(error.message);
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

  if(!root.querySelector('#scoreClass').value){
    wrap.innerHTML='<div class="empty">Hãy chọn khối và lớp trước.</div>';
    return;
  }

  const className=root.querySelector('#scoreClass').value;

  if(mode==='collective'){
    const list=getCriteria('Tập thể');

    wrap.innerHTML=`
      <div class="score-form">
        <div class="page-head">
          <div>
            <h3 style="margin:0">👥 Chấm điểm tập thể — lớp ${esc(className)}</h3>
            <p>Chỉ hiển thị các tiêu chí dành cho tập thể.</p>
          </div>
        </div>

        ${criteriaSelectHtml(list,'collectiveCriteria')}

        <div id="collectiveSummary" class="score-summary">
          Chưa chọn tiêu chí.
        </div>

        <div class="action-row">
          <button id="saveCollective" class="btn primary">💾 Ghi thông tin vào CSDL</button>
        </div>
      </div>
    `;

    bindCriteriaPreview('collectiveCriteria','collectiveSummary');
    root.querySelector('#saveCollective').onclick=saveCollective;
    return;
  }

  const individualCriteria=getCriteria('Cá nhân');

  wrap.innerHTML=`
    <div class="score-form">
      <div class="page-head">
        <div>
          <h3 style="margin:0">👨‍🎓 Chấm điểm cá nhân</h3>
          <p>Chọn học sinh trong lớp, sau đó chọn tiêu chí cộng/trừ.</p>
        </div>
      </div>

      <label>Chọn học sinh
        <select id="scoreStudent">
          <option value="">-- Chọn học sinh --</option>
          ${students.map(s=>`
            <option value="${esc(s.ma_hs)}">
              ${esc(s.ho_ten)} — ${esc(s.ma_hs)}
            </option>
          `).join('')}
        </select>
      </label>

      <div id="scoreStudentCard"></div>

      ${criteriaSelectHtml(individualCriteria,'individualCriteria')}

      <div id="individualSummary" class="score-summary">
        Chưa chọn học sinh và tiêu chí.
      </div>

      <div class="action-row">
        <button id="saveIndividual" class="btn primary">💾 Ghi thông tin vào CSDL</button>
      </div>
    </div>
  `;

  root.querySelector('#scoreStudent').onchange=renderStudentCard;
  bindCriteriaPreview('individualCriteria','individualSummary');
  root.querySelector('#saveIndividual').onclick=saveIndividual;
}

function criteriaSelectHtml(list,id){
  const plus=list.filter(isPlus);
  const minus=list.filter(isMinus);

  return `
    <div class="grid" style="margin-top:14px">
      <label>Loại điểm
        <select id="${id}Type">
          <option value="">-- Chọn điểm cộng hoặc điểm trừ --</option>
          <option value="plus">➕ Điểm cộng</option>
          <option value="minus">➖ Điểm trừ</option>
        </select>
      </label>

      <label>Danh mục nội dung
        <select id="${id}">
          <option value="">-- Chọn loại điểm trước --</option>
        </select>
      </label>
    </div>
  `;
}

function bindCriteriaPreview(id,summaryId){
  const typeSelect=root.querySelector(`#${id}Type`);
  const criteriaSelect=root.querySelector(`#${id}`);
  const summary=root.querySelector(`#${summaryId}`);

  typeSelect.onchange=()=>{
    const type=typeSelect.value;
    const list=getCriteriaByMode(type);

    criteriaSelect.innerHTML=
      `<option value="">-- Chọn nội dung --</option>`+
      list.map(c=>`
        <option value="${esc(c.ma_hd)}">
          ${esc(c.ten_hd)} (${Number(c.diem)>0?'+':''}${c.diem})
        </option>
      `).join('');

    summary.innerHTML=type?
      `<span class="badge ${type==='plus'?'ok':'warn'}">
        ${type==='plus'?'➕ Điểm cộng':'➖ Điểm trừ'}
      </span> — Hãy chọn nội dung.`
      :'Chưa chọn loại điểm.';
  };

  criteriaSelect.onchange=()=>{
    const c=criteria.find(x=>x.ma_hd===criteriaSelect.value);
    if(!c){
      summary.textContent='Chưa chọn tiêu chí.';
      return;
    }
    summary.innerHTML=`
      <b>${esc(c.ten_hd)}</b>
      <span class="badge ${Number(c.diem)>=0?'ok':'warn'}" style="margin-left:7px">
        Điểm: ${Number(c.diem)>0?'+':''}${c.diem}
      </span>
      ${c.mang?`<span class="badge" style="margin-left:5px">${esc(c.mang)}</span>`:''}
    `;
  };
}

function renderStudentCard(){
  const ma=root.querySelector('#scoreStudent').value;
  const s=students.find(x=>x.ma_hs===ma);
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
          ${esc(s.ma_hs)} · Khối ${esc(s.khoi)} · Lớp ${esc(s.lop)}
        </div>
      </div>
    </div>
  `;

  const summary=root.querySelector('#individualSummary');
  const c=root.querySelector('#individualCriteria').value
    ?criteria.find(x=>x.ma_hd===root.querySelector('#individualCriteria').value)
    :null;

  summary.innerHTML=c
    ? `<b>${esc(s.ho_ten)}</b> — ${esc(c.ten_hd)}
       <span class="badge ${Number(c.diem)>=0?'ok':'warn'}">
       ${Number(c.diem)>0?'+':''}${c.diem}</span>`
    : `Đã chọn học sinh <b>${esc(s.ho_ten)}</b>. Hãy chọn tiêu chí.`;
}

function getCriteria(target){
  const t=String(target).toLowerCase();
  return criteria.filter(c=>{
    const d=String(c.doi_tuong||'Cá nhân').toLowerCase();
    if(t==='tập thể'){
      return d.includes('tập thể')||d.includes('tap the');
    }
    return d.includes('cá nhân')||d.includes('ca nhan')||!c.doi_tuong;
  });
}

function getCriteriaByMode(type){
  const target=mode==='collective'?'Tập thể':'Cá nhân';
  return getCriteria(target).filter(c=>type==='plus'?isPlus(c):isMinus(c));
}

function isPlus(c){
  const score=Number(c.diem||0);
  const type=String(c.loai||'').toLowerCase();
  return score>0 || type.includes('cộng') || type.includes('cong');
}

function isMinus(c){
  const score=Number(c.diem||0);
  const type=String(c.loai||'').toLowerCase();
  return score<0 ||
    type.includes('trừ') ||
    type.includes('tru') ||
    type.includes('vi phạm') ||
    type.includes('vi pham') ||
    type.includes('phạt') ||
    type.includes('phat');
}

async function saveCollective(){
  const cls=root.querySelector('#scoreClass').value;
  const grade=root.querySelector('#scoreGrade').value;
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
    ten_nguoi_cap_nhat:u?.ho_ten||null
  };

  const {error}=await supabase.from('diem_danh_master').insert(payload);
  if(error)return toast(`Không ghi được điểm tập thể: ${error.message}`,'err');

  toast(`Đã ghi ${Number(c.diem)>0?'+':''}${c.diem} điểm cho tập thể lớp ${cls}.`,'ok');
  root.querySelector('#collectiveCriteria').value='';
  root.querySelector('#collectiveCriteriaType').value='';
  root.querySelector('#collectiveSummary').textContent='Đã ghi nhận. Có thể tiếp tục chấm.';
}

async function saveIndividual(){
  const maHs=root.querySelector('#scoreStudent').value;
  const maHd=root.querySelector('#individualCriteria').value;
  const s=students.find(x=>x.ma_hs===maHs);
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
    ten_nguoi_cap_nhat:u?.ho_ten||null
  };

  const {error}=await supabase.from('diem_danh_master').insert(payload);
  if(error)return toast(`Không ghi được điểm cá nhân: ${error.message}`,'err');

  toast(`Đã ghi ${Number(c.diem)>0?'+':''}${c.diem} điểm cho ${s.ho_ten}.`,'ok');

  // Reset nội dung nhưng giữ lớp để chấm tiếp học sinh khác.
  root.querySelector('#individualCriteriaType').value='';
  root.querySelector('#individualCriteria').innerHTML='<option value="">-- Chọn loại điểm trước --</option>';
  root.querySelector('#individualSummary').textContent='Đã ghi nhận. Có thể chọn học sinh/tiêu chí tiếp theo.';
}

function showError(message){
  const wrap=root?.querySelector('#scoreFormWrap');
  if(wrap)wrap.innerHTML=`<div class="danger-box">${esc(message)}</div>`;
}

function naturalSort(a,b){
  return a.localeCompare(b,'vi',{numeric:true,sensitivity:'base'});
}
