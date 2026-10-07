import {supabase,managedClasses,canManageAbsence,roleOf} from './config.js';
import {esc,toast} from './ui.js';

let root;
let grades=[];
let classes=[];
let students=[];
let selectedGrade='';
let selectedClass='';
let date='';
let buoi='Sáng';

async function fetchAll(factory,chunk=1000){
  const all=[];
  let from=0;
  while(true){
    const {data,error}=await factory().range(from,from+chunk-1);
    if(error) throw error;
    const rows=data||[];
    all.push(...rows);
    if(rows.length<chunk) break;
    from+=chunk;
  }
  return all;
}

export async function init(r){
  root=r;
  date=new Date().toISOString().slice(0,10);
  selectedGrade='';
  selectedClass='';
  students=[];
  await renderShell();
  await loadGrades();
}

async function renderShell(){
  root.innerHTML=`
    <div class="page-head">
      <div>
        <h2>Báo Vắng Học Sinh</h2>
        <p>Chọn khối → lớp → số học sinh vắng, sau đó xác định trạng thái có phép hoặc không phép.</p>
      </div>
      <span class="badge ok">Ghi nhận vào CSDL</span>
    </div>

    <div class="absence-top-grid">
      <div class="absence-box">
        <div class="selector-title">📅 Thời gian</div>
        <div class="absence-inline">
          <label>Ngày
            <input id="absDate" type="date" value="${date}">
          </label>
          <label>Buổi
            <select id="absBuoi">
              <option>Sáng</option>
              <option>Chiều</option>
            </select>
          </label>
        </div>
      </div>

      <div class="absence-box">
        <div class="selector-title">👥 Chọn khối</div>
        <div id="absGradeRadios" class="absence-grade-grid">
          <span class="class-empty">Đang tải...</span>
        </div>
      </div>

      <div class="absence-box">
        <div class="selector-title">🏫 Chọn lớp</div>
        <div id="absClassRadios" class="absence-class-grid">
          <span class="class-empty">Hãy chọn khối trước.</span>
        </div>
      </div>

      <div class="absence-box">
        <div class="selector-title">👤 Số vắng</div>
        <select id="absCount" disabled>
          <option value="">-- Chọn lớp trước --</option>
        </select>
        <div id="absClassInfo" class="selector-hint">Chưa chọn lớp.</div>
      </div>
    </div>

    <div id="absRows">
      <div class="empty">Hãy chọn khối, lớp và số học sinh vắng.</div>
    </div>
  `;

  root.querySelector('#absDate').onchange=e=>{date=e.target.value};
  root.querySelector('#absBuoi').onchange=e=>{buoi=e.target.value};
  root.querySelector('#absCount').onchange=renderRows;
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

    root.querySelector('#absGradeRadios').innerHTML=grades.map(g=>`
      <label class="absence-grade">
        <input type="radio" name="absGrade" value="${esc(g)}">
        <span>${esc(g)}</span>
      </label>
    `).join('');

    root.querySelectorAll('input[name="absGrade"]').forEach(r=>{
      r.onchange=()=>onGradeChange(r.value);
    });
  }catch(e){
    showError(e.message);
  }
}

async function onGradeChange(grade){
  selectedGrade=grade;
  selectedClass='';
  students=[];

  const classBox=root.querySelector('#absClassRadios');
  const count=root.querySelector('#absCount');
  count.disabled=true;
  count.innerHTML='<option value="">-- Chọn lớp trước --</option>';
  root.querySelector('#absRows').innerHTML=
    '<div class="empty">Hãy chọn lớp và số học sinh vắng.</div>';
  classBox.innerHTML='<span class="class-empty">Đang tải lớp...</span>';

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
    const scope=managedClasses(window.App?.Auth?.currentUser);
    if(scope!==null) classes=classes.filter(c=>scope.includes(c));

    classBox.innerHTML=classes.map(c=>`
      <label class="absence-class">
        <input type="radio" name="absClass" value="${esc(c)}">
        <span>${esc(c)}</span>
      </label>
    `).join('');

    root.querySelectorAll('input[name="absClass"]').forEach(r=>{
      r.onchange=()=>onClassChange(r.value);
    });
  }catch(e){
    showError(e.message);
  }
}

async function onClassChange(cls){
  selectedClass=cls;
  try{
    students=await fetchAll(()=>supabase
      .from('danh_sach')
      .select('ma_hs,ho_ten,khoi,lop,ngay_sinh')
      .eq('trang_thai','Active')
      .eq('khoi',selectedGrade)
      .eq('lop',cls)
      .order('ho_ten'));

    students.sort((a,b)=>{
      const n=String(a.ho_ten||'').localeCompare(String(b.ho_ten||''),'vi',{sensitivity:'base'});
      return n||String(a.ngay_sinh||'').localeCompare(String(b.ngay_sinh||''));
    });

    const count=root.querySelector('#absCount');
    count.disabled=false;
    count.innerHTML='<option value="">-- Chọn số học sinh vắng --</option>'+
      Array.from({length:students.length+1},(_,i)=>`<option value="${i}">${i}</option>`).join('');

    root.querySelector('#absClassInfo').innerHTML=
      `<b>${esc(cls)}</b> · ${students.length} học sinh · Chọn số vắng để tạo danh sách.`;

    root.querySelector('#absRows').innerHTML=
      '<div class="empty">Hãy chọn số học sinh vắng.</div>';
  }catch(e){
    showError(e.message);
  }
}

function renderRows(){
  const count=Number(root.querySelector('#absCount').value||0);
  const body=root.querySelector('#absRows');

  if(!count){
    body.innerHTML='<div class="empty">Hãy chọn số học sinh vắng.</div>';
    return;
  }

  body.innerHTML=`
    <div class="absence-panel">
      <div class="page-head">
        <div>
          <h3 style="margin:0">Danh sách học sinh vắng — ${esc(selectedClass)}</h3>
          <p>${count} học sinh cần được xác nhận trạng thái.</p>
        </div>
        <span class="badge">${count} dòng</span>
      </div>

      <div class="absence-list">
        ${Array.from({length:count},(_,i)=>absenceRow(i)).join('')}
      </div>

      <div class="action-row">
        <button id="absSave" class="btn primary">💾 Ghi nhận ${count} học sinh vắng</button>
      </div>
    </div>
  `;

  root.querySelectorAll('.absence-student').forEach(s=>{
    s.onchange=updateStudentOptions;
  });

  root.querySelectorAll('input[name^="absStatus_"]').forEach(r=>{
    r.onchange=updateStatusVisual;
  });

  root.querySelector('#absSave').onclick=save;
}

function absenceRow(index){
  return `
    <div class="absence-row" data-row="${index}">
      <div class="absence-index">${index+1}</div>

      <div class="absence-student-wrap">
        <label>Học sinh
          <select class="absence-student">
            <option value="">-- Chọn học sinh --</option>
            ${students.map((s,i)=>`
              <option value="${i}">
                ${esc(s.ho_ten)} — ${formatDate(s.ngay_sinh)}
              </option>
            `).join('')}
          </select>
        </label>
      </div>

      <div class="absence-status">
        <span class="status-label">Trạng thái</span>
        <label class="absence-status-radio allowed">
          <input type="radio" name="absStatus_${index}" value="Vắng có phép">
          <span>✓ Có phép</span>
        </label>
        <label class="absence-status-radio notallowed">
          <input type="radio" name="absStatus_${index}" value="Vắng không phép">
          <span>✕ Không phép</span>
        </label>
      </div>
    </div>
  `;
}

function updateStudentOptions(){
  const selects=[...root.querySelectorAll('.absence-student')];
  const selected=new Set(selects.map(s=>s.value).filter(Boolean));

  selects.forEach(sel=>{
    [...sel.options].forEach(opt=>{
      if(!opt.value)return;
      opt.disabled=selected.has(opt.value)&&opt.value!==sel.value;
    });
  });
}

function updateStatusVisual(){
  root.querySelectorAll('.absence-row').forEach(row=>{
    const chosen=row.querySelector('input[type="radio"]:checked')?.value||'';
    row.classList.toggle('has-permission',chosen==='Vắng có phép');
    row.classList.toggle('has-no-permission',chosen==='Vắng không phép');
  });
}

async function save(){
  const u=window.App?.Auth?.currentUser;
  const rows=[...root.querySelectorAll('.absence-row')];
  const payload=[];

  for(const row of rows){
    const idx=row.querySelector('.absence-student').value;
    const status=row.querySelector('input[type="radio"]:checked')?.value||'';

    if(idx===''){
      return toast(`Dòng ${Number(row.dataset.row)+1}: chưa chọn học sinh.`,'err');
    }
    if(!status){
      return toast(`Dòng ${Number(row.dataset.row)+1}: chưa chọn Có phép/Không phép.`,'err');
    }

    const s=students[Number(idx)];
    payload.push({
      ma_hs:s.ma_hs,
      ho_ten:s.ho_ten,
      khoi:s.khoi,
      lop:s.lop,
      ngay_diem_danh:date,
      buoi,
      trang_thai:status,
      chi_tiet:null,
      diem:0,
      ma_nguoi_cap_nhat:u?.ma_cb||null,
      ten_nguoi_cap_nhat:u?.ho_ten||null
    });
  }

  const {error}=await supabase.from('diem_danh_master').insert(payload);
  if(error)return toast(`Không ghi được dữ liệu: ${error.message}`,'err');

  toast(`Đã ghi nhận ${payload.length} học sinh vắng.`,'ok');

  // Giữ nguyên khối/lớp, reset số vắng để có thể nhập lượt tiếp theo.
  root.querySelector('#absCount').value='';
  root.querySelector('#absRows').innerHTML=
    '<div class="empty">Đã ghi nhận. Có thể chọn số vắng cho lượt tiếp theo.</div>';
}

function formatDate(v){
  if(!v)return 'Chưa có ngày sinh';
  const m=String(v).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m?`${m[3]}/${m[2]}/${m[1]}`:String(v);
}

function showError(message){
  const body=root?.querySelector('#absRows');
  if(body)body.innerHTML=`<div class="danger-box">${esc(message)}</div>`;
}

function naturalSort(a,b){
  return a.localeCompare(b,'vi',{numeric:true,sensitivity:'base'});
}
