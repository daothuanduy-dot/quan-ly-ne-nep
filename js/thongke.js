import {supabase,managedClasses,canViewAllStats,roleOf,appConfig} from './config.js';
import {esc} from './ui.js';

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
function norm(v){return String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();}
function activeStudent(v){const x=norm(v);return !x||['active','dang hoc','hoc','hoat dong','true','1'].includes(x);}
function fmt(n){const x=Number(n||0);return Number.isInteger(x)?String(x):x.toFixed(1).replace(/\.0$/,'');}
function scoreOf(rows){return rows.reduce((a,r)=>a+Number(r.diem||0),0);}
function statsFor(rows){
  const plus=rows.filter(r=>Number(r.diem)>0).reduce((a,r)=>a+Number(r.diem||0),0);
  const minus=rows.filter(r=>Number(r.diem)<0).reduce((a,r)=>a+Number(r.diem||0),0);
  return {plus,minus,total:plus+minus,count:rows.length};
}
function groupBy(arr,keyFn){const m=new Map();arr.forEach(x=>{const k=keyFn(x)||'Chưa xác định';if(!m.has(k))m.set(k,[]);m.get(k).push(x)});return m;}
function isoDate(d){return d.toISOString().slice(0,10)}
function localDate(s){const d=new Date(s+'T00:00:00');return Number.isNaN(d.getTime())?null:d}
function addDays(d,n){const x=new Date(d);x.setDate(x.getDate()+n);return x}
function startOfWeek(d){const x=new Date(d);const day=x.getDay()||7;x.setDate(x.getDate()-day+1);x.setHours(0,0,0,0);return x}
function parseSchoolYear(){const m=String(appConfig?.namHoc||'').match(/(20\d{2})\s*[-–]\s*(20\d{2})/);if(!m)return {start:new Date(new Date().getFullYear(),7,1),end:new Date(new Date().getFullYear()+1,6,31)};return {start:new Date(Number(m[1]),7,1),end:new Date(Number(m[2]),6,31)};}
function currentISOWeek(d){const x=new Date(d);x.setHours(0,0,0,0);const day=x.getDay()||7;x.setDate(x.getDate()+4-day);const y=new Date(x.getFullYear(),0,1);return Math.ceil((((x-y)/86400000)+1)/7)}
function periodRange(type,ref,from,to){
  const d=ref||new Date();let a,b,label='';
  if(type==='week'){a=startOfWeek(d);b=addDays(a,6);label=`Tuần ${currentISOWeek(d)} (${isoDate(a)} → ${isoDate(b)})`;}
  else if(type==='month'){a=new Date(d.getFullYear(),d.getMonth(),1);b=new Date(d.getFullYear(),d.getMonth()+1,0);label=`Tháng ${d.getMonth()+1}/${d.getFullYear()}`;}
  else if(type==='semester1'){const sy=parseSchoolYear();a=sy.start;b=new Date(sy.start.getFullYear()+1,0,31);label='Học kỳ I';}
  else if(type==='semester2'){const sy=parseSchoolYear();a=new Date(sy.start.getFullYear()+1,1,1);b=sy.end;label='Học kỳ II';}
  else if(type==='year'){const sy=parseSchoolYear();a=sy.start;b=sy.end;label=`Năm học ${appConfig?.namHoc||''}`;}
  else {a=localDate(from)||d;b=localDate(to)||d;if(b<a)[a,b]=[b,a];label=`Từ ${isoDate(a)} đến ${isoDate(b)}`;}
  return {from:isoDate(a),to:isoDate(b),label};
}
function inRange(v,range){if(!v)return false;const x=String(v).slice(0,10);return x>=range.from&&x<=range.to;}
function periodStudyFilter(rows,range,type){
  if(type==='year')return rows.filter(r=>String(r.nam_hoc||'')===String(appConfig?.namHoc||''));
  if(type==='week'){const w=currentISOWeek(localDate(range.from)||new Date());return rows.filter(r=>Number(r.tuan_hoc)===w&&String(r.nam_hoc||'')===String(appConfig?.namHoc||''));}
  // Dữ liệu Cán bộ lớp được lưu theo tuần; dùng created_at khi có để lọc các khoảng tháng/học kỳ/ngày.
  return rows.filter(r=>inRange(r.created_at,range));
}
function barRows(groups,limit=40){
  return [...groups.entries()].map(([name,rows])=>({name,stats:statsFor(rows)})).sort((a,b)=>b.stats.total-a.stats.total).slice(0,limit);
}

export async function init(root){
  root.innerHTML=`
    <div class="stats-hero">
      <div class="stats-hero-icon">📊</div>
      <div><h2>Thống kê & cảnh báo</h2><p>Theo dõi quy mô học sinh, điểm thi đua và những trường hợp cần quan tâm.</p></div>
    </div>
    <div id="stats"><div class="empty">Đang tải dữ liệu...</div></div>`;
  await load(root);
}

async function load(root){
  const box=root.querySelector('#stats');
  try{
    const [studentsRaw,events,studyRows,criteria]=await Promise.all([
      fetchAll(()=>supabase.from('danh_sach').select('id,ma_hs,ho_ten,khoi,lop,trang_thai,ngay_sinh').order('id')),
      fetchAll(()=>supabase.from('diem_danh_master').select('id,ma_hs,ho_ten,khoi,lop,diem,trang_thai,chi_tiet,ma_hd,ngay_diem_danh,doi_tuong').order('id')),
      fetchAll(()=>supabase.from('diem_hoc_tap_tuan').select('nam_hoc,tuan_hoc,lop,ma_hs,ho_ten,loai_diem,diem,so_luong,ma_nguoi_cap_nhat,ten_nguoi_cap_nhat,created_at').order('id')),
      fetchAll(()=>supabase.from('danh_muc_diem').select('ma_hd,ten_hd,mang,loai,diem,doi_tuong').order('ma_hd'))
    ]);

    const gradeNorm=v=>{const x=norm(v);const m=x.match(/(?:khoi\s*)?(10|11|12)\b/);return m?m[1]:x};
    const classNorm=v=>String(v||'').trim().toUpperCase();
    const criteriaMap=new Map(criteria.map(c=>[String(c.ma_hd),c]));
    const criterionName=e=>criteriaMap.get(String(e.ma_hd))?.ten_hd||e.chi_tiet||e.ma_hd||'Chưa xác định tiêu chí';
    const criterionGroup=e=>criteriaMap.get(String(e.ma_hd))?.mang||'Khác';
    let students=studentsRaw.filter(x=>activeStudent(x.trang_thai));
    const user=window.App?.Auth?.currentUser;
    const scope=managedClasses(user);
    const allStats=canViewAllStats(user);
    if(!allStats && scope!==null){
      const set=new Set((scope||[]).map(classNorm));
      students=students.filter(x=>set.has(classNorm(x.lop)));
    }
    const studentMap=new Map(students.map(x=>[String(x.ma_hs),x]));
    let scopedEvents=events;
    if(!allStats && scope!==null){
      const set=new Set((scope||[]).map(classNorm));
      scopedEvents=events.filter(x=>set.has(classNorm(x.lop)));
    }
    let scopedStudy=studyRows;
    if(!allStats && scope!==null){
      const set=new Set((scope||[]).map(classNorm));
      scopedStudy=studyRows.filter(x=>set.has(classNorm(x.lop)));
    }

    const scopedEventsBase=scopedEvents;
    const scopedStudyBase=scopedStudy;
    const now=new Date(); const state={view:'school',grade:'',cls:'',period:'year',ref:isoDate(now),from:isoDate(now),to:isoDate(now)}; let range=periodRange(state.period,localDate(state.ref),state.from,state.to);
    const eventByStudent=new Map();
    const studyByStudent=new Map();
    const studyByClass=new Map();
    function rebuildPeriodMaps(){
      eventByStudent.clear(); studyByStudent.clear(); studyByClass.clear();
      scopedEvents.forEach(e=>{const id=String(e.ma_hs||'');if(!id)return;if(!eventByStudent.has(id))eventByStudent.set(id,[]);eventByStudent.get(id).push(e)});
      scopedStudy.forEach(r=>{const c=classNorm(r.lop);if(!studyByClass.has(c))studyByClass.set(c,[]);studyByClass.get(c).push(r);const id=String(r.ma_hs||'');if(id){if(!studyByStudent.has(id))studyByStudent.set(id,[]);studyByStudent.get(id).push(r)}});
    }
    function applyPeriod(){
      range=periodRange(state.period,localDate(state.ref)||new Date(),state.from,state.to);
      scopedEvents=scopedEventsBase.filter(e=>inRange(e.ngay_diem_danh,range));
      scopedStudy=scopedStudyBase.filter(r=>periodStudyFilter([r],range,state.period).length>0);
      rebuildPeriodMaps();
    }
    applyPeriod();

    const byGrade=groupBy(students,x=>gradeNorm(x.khoi));
    const byClass=groupBy(students,x=>classNorm(x.lop));
    const total=statsFor(scopedEvents);
    const late=scopedEvents.filter(x=>norm(x.trang_thai).includes('muon')).length;

    box.innerHTML=`
      <div class="stats-kpi-grid">
        <div class="stats-kpi kpi-blue"><span>👨‍🎓</span><b>${students.length}</b><small>Học sinh</small></div>
        <div class="stats-kpi kpi-green"><span>➕</span><b>+${fmt(total.plus)}</b><small>Điểm cộng</small></div>
        <div class="stats-kpi kpi-red"><span>➖</span><b>${fmt(total.minus)}</b><small>Điểm trừ</small></div>
        <div class="stats-kpi kpi-purple"><span>🏃</span><b>${late}</b><small>Lượt đi muộn</small></div>
      </div>

      <section class="stats-card student-size-card">
        <div class="stats-section-head"><div><h3>👥 Số học sinh theo khối</h3><p>Hiển thị số lượng, không dùng biểu đồ để dễ theo dõi.</p></div><span class="stats-pill">${students.length} học sinh</span></div>
        <div class="grade-count-grid">${['10','11','12'].map(g=>`<div class="grade-count-card"><div class="grade-count-icon">${g==='10'?'🔵':g==='11'?'🟢':'🟣'}</div><div><small>Khối ${g}</small><strong>${byGrade.get(g)?.length||0}</strong><span>học sinh</span></div></div>`).join('')}</div>
      </section>

      <section class="stats-card">
        <div class="stats-section-head"><div><h3>📈 Kết quả thi đua</h3><p>Điểm cộng/trừ là dữ liệu nề nếp; điểm học tập do Cán bộ lớp nhập được hiển thị riêng để không trộn hai thang điểm.</p></div></div>
        <div class="period-toolbar" id="periodToolbar"></div>
        <div class="view-switch" role="tablist">
          <button class="view-btn active" data-view="school">🏫 Toàn trường</button>
          <button class="view-btn" data-view="grade">🎓 Theo khối</button>
          <button class="view-btn" data-view="class">🏠 Theo lớp</button>
        </div>
        <div class="stats-filter-row" id="statsFilters"></div>
        <div id="scoreSummary"></div>
        <div id="scoreChart"></div>
      </section>

      <section class="stats-card alert-card">
        <div class="stats-section-head"><div><h3>🚨 Cảnh báo theo tiêu chí</h3><p>Không dùng ngưỡng tổng điểm. Danh sách được tổng hợp trực tiếp từ từng tiêu chí có phát sinh điểm trừ trong phạm vi đang chọn.</p></div><span class="stats-pill" id="alertScopeLabel">Theo phạm vi đang xem</span></div>
        <div id="alertList" class="alert-list"></div>
      </section>
      <div id="statsDetailModal" class="stats-detail-modal hidden"></div>`;

    const studyStats=rows=>{
      let total=0,weighted=0;const counts={};
      rows.forEach(r=>{const n=Math.max(0,Number(r.so_luong||0));const d=Number(r.diem);if(!Number.isFinite(d))return;total+=n;weighted+=d*n;counts[d]=(counts[d]||0)+n});
      return {total,avg:total?weighted/total:0,counts};
    };
    const eventStats=rows=>statsFor(rows);

    function allowedClasses(){
      let arr=[...byClass.keys()].sort((a,b)=>a.localeCompare(b,'vi',{numeric:true}));
      if(state.grade)arr=arr.filter(c=>gradeNorm((byClass.get(c)||[])[0]?.khoi)===state.grade);
      return arr;
    }
    function renderPeriodToolbar(){
      const p=root.querySelector('#periodToolbar');
      p.innerHTML=`<div class="period-select-wrap"><label>Khoảng thời gian<select id="statsPeriod"><option value="week" ${state.period==='week'?'selected':''}>Theo tuần</option><option value="month" ${state.period==='month'?'selected':''}>Theo tháng</option><option value="semester1" ${state.period==='semester1'?'selected':''}>Học kỳ I</option><option value="semester2" ${state.period==='semester2'?'selected':''}>Học kỳ II</option><option value="year" ${state.period==='year'?'selected':''}>Năm học</option><option value="custom" ${state.period==='custom'?'selected':''}>Từ ngày đến ngày</option></select></label>${state.period==='custom'?`<label>Từ ngày<input id="statsFrom" type="date" value="${state.from}"></label><label>Đến ngày<input id="statsTo" type="date" value="${state.to}"></label>`:`<label>Ngày tham chiếu<input id="statsRef" type="date" value="${state.ref}"></label>`}<span class="period-badge">${esc(range.label)}</span></div>`;
      p.querySelector('#statsPeriod').onchange=e=>{state.period=e.target.value;applyPeriod();renderPeriodToolbar();renderFilters();renderChart();renderAlerts()};
      const ref=p.querySelector('#statsRef'); if(ref)ref.onchange=e=>{state.ref=e.target.value;applyPeriod();renderPeriodToolbar();renderChart();renderAlerts()};
      const fr=p.querySelector('#statsFrom'); if(fr)fr.onchange=e=>{state.from=e.target.value;applyPeriod();renderPeriodToolbar();renderChart();renderAlerts()};
      const to=p.querySelector('#statsTo'); if(to)to.onchange=e=>{state.to=e.target.value;applyPeriod();renderPeriodToolbar();renderChart();renderAlerts()};
    }

    function renderFilters(){
      const f=root.querySelector('#statsFilters');
      if(state.view==='school'){f.innerHTML='<span class="filter-note">Toàn bộ dữ liệu trong phạm vi được phân quyền.</span>';return;}
      if(state.view==='grade'){
        f.innerHTML=`<label>Khối<select id="filterGrade"><option value="">Tất cả khối</option>${['10','11','12'].map(g=>`<option value="${g}" ${state.grade===g?'selected':''}>Khối ${g}</option>`).join('')}</select></label>`;
        f.querySelector('#filterGrade').onchange=e=>{state.grade=e.target.value;renderChart();renderAlerts()};
      }else{
        f.innerHTML=`<label>Khối<select id="filterGrade"><option value="">Tất cả khối</option>${['10','11','12'].map(g=>`<option value="${g}" ${state.grade===g?'selected':''}>Khối ${g}</option>`).join('')}</select></label><label>Lớp<select id="filterClass"><option value="">Chọn lớp</option>${allowedClasses().map(c=>`<option value="${esc(c)}" ${state.cls===c?'selected':''}>${esc(c)}</option>`).join('')}</select></label>`;
        f.querySelector('#filterGrade').onchange=e=>{state.grade=e.target.value;state.cls='';renderFilters();renderChart();renderAlerts()};
        f.querySelector('#filterClass').onchange=e=>{state.cls=e.target.value;renderChart();renderAlerts()};
      }
    }
    function selectedStudents(){
      if(state.view==='school')return students;
      if(state.view==='grade')return students.filter(s=>!state.grade||gradeNorm(s.khoi)===state.grade);
      return students.filter(s=>(!state.grade||gradeNorm(s.khoi)===state.grade)&&(!state.cls||classNorm(s.lop)===state.cls));
    }
    function selectedEvents(){
      const ids=new Set(selectedStudents().map(s=>String(s.ma_hs)));
      return scopedEvents.filter(e=>(e.ma_hs&&ids.has(String(e.ma_hs)))||(!e.ma_hs&&state.view==='class'&&classNorm(e.lop)===classNorm(state.cls)));
    }
    function selectedStudy(){
      const ids=new Set(selectedStudents().map(s=>String(s.ma_hs)));
      if(state.view==='class'&&state.cls)return scopedStudy.filter(r=>classNorm(r.lop)===classNorm(state.cls));
      return scopedStudy.filter(r=>r.ma_hs&&ids.has(String(r.ma_hs)));
    }
    function aggregateStudy(rows,keyFn){
      const m=new Map();rows.forEach(r=>{const k=keyFn(r);if(!m.has(k))m.set(k,[]);m.get(k).push(r)});return m;
    }
    function renderChart(){
      const ev=selectedEvents();
      const study=selectedStudy();
      let rows=[];
      let scopeTitle='Toàn trường → Khối';
      if(state.view==='school'){
        const m=groupBy(ev,e=>gradeNorm(e.khoi||studentMap.get(String(e.ma_hs))?.khoi));
        const sm=aggregateStudy(study,r=>gradeNorm(r.khoi||studentMap.get(String(r.ma_hs))?.khoi));
        rows=[...new Set([...m.keys(),...sm.keys()].filter(Boolean))].map(name=>({name,stats:statsFor(m.get(name)||[]),study:studyStats(sm.get(name)||[])}));
        scopeTitle='Toàn trường → từng khối';
      }else if(state.view==='grade'){
        const m=groupBy(ev,e=>classNorm(e.lop||studentMap.get(String(e.ma_hs))?.lop));
        const sm=aggregateStudy(study,r=>classNorm(r.lop||studentMap.get(String(r.ma_hs))?.lop));
        rows=[...new Set([...m.keys(),...sm.keys()].filter(Boolean))].map(name=>({name,stats:statsFor(m.get(name)||[]),study:studyStats(sm.get(name)||[])}));
        scopeTitle=`Khối ${state.grade||'tất cả'} → từng lớp`;
      }else{
        const m=groupBy(ev,e=>String(e.ma_hs||''));
        const sm=aggregateStudy(study,r=>String(r.ma_hs||''));
        rows=[...new Set([...m.keys(),...sm.keys()].filter(Boolean))].map(id=>{const s=studentMap.get(id);return {name:s?.ho_ten||id,sub:s?.lop||'',id,stats:statsFor(m.get(id)||[]),study:studyStats(sm.get(id)||[])};});
        scopeTitle=`${state.cls||'Lớp đang chọn'} → từng học sinh`;
      }
      rows.sort((a,b)=>(b.stats.total-a.stats.total)||(b.study.avg-a.study.avg));
      const sumPlus=rows.reduce((a,r)=>a+r.stats.plus,0),sumMinus=rows.reduce((a,r)=>a+r.stats.minus,0),sumStudy=rows.filter(r=>r.study.total).reduce((a,r)=>a+r.study.avg,0),nStudy=rows.filter(r=>r.study.total).length;
      root.querySelector('#scoreSummary').innerHTML=`<div class="score-mini-grid"><div><span>Điểm cộng nề nếp</span><b>+${fmt(sumPlus)}</b></div><div><span>Điểm trừ nề nếp</span><b>${fmt(sumMinus)}</b></div><div><span>Điểm</span><b>${fmt(sumPlus+sumMinus)}</b></div><div><span>ĐTB học tập CB lớp</span><b>${nStudy?fmt(sumStudy/nStudy):'—'}</b></div></div>`;
      const maxAbs=Math.max(1,...rows.map(r=>Math.max(Math.abs(r.stats.plus),Math.abs(r.stats.minus),Math.abs(r.stats.total))));
      const chartRows=rows.map(r=>{
        const plusW=Math.min(100,Math.abs(r.stats.plus)/maxAbs*100), minusW=Math.min(100,Math.abs(r.stats.minus)/maxAbs*100), netW=Math.min(100,Math.abs(r.stats.total)/maxAbs*100);
        return `<div class="score-chart-item"><div class="score-chart-object"><b>${esc(r.name)}</b><small>${esc(r.sub||'')}</small></div><div class="score-chart-bars"><div class="chart-line"><span class="chart-label plus-text">Cộng</span><span class="chart-track"><i class="chart-fill plus" style="width:${plusW}%"></i></span><strong class="plus-text">+${fmt(r.stats.plus)}</strong></div><div class="chart-line"><span class="chart-label minus-text">Trừ</span><span class="chart-track"><i class="chart-fill minus" style="width:${minusW}%"></i></span><strong class="minus-text">${fmt(r.stats.minus)}</strong></div><div class="chart-line"><span class="chart-label net-text">Điểm</span><span class="chart-track"><i class="chart-fill net" style="width:${netW}%"></i></span><strong class="net-text">${r.stats.total>0?'+':''}${fmt(r.stats.total)}</strong></div></div></div>`;
      }).join('');
      root.querySelector('#scoreChart').innerHTML=rows.length?`<div class="score-chart-card"><div class="score-chart-head"><div><h4>📊 Biểu đồ điểm theo đối tượng</h4><p>${esc(scopeTitle)} · mỗi đối tượng là một dòng so sánh Cộng / Trừ / Điểm.</p></div></div><div class="score-chart-list">${chartRows}</div></div><div class="score-table-head"><span>Đối tượng</span><span>Cộng</span><span>Trừ</span><span>Điểm</span><span>ĐTB học tập</span></div>${rows.map(r=>`<button type="button" class="score-detail-row" data-detail-id="${esc(r.id||r.name)}"><span class="score-object"><b>${esc(r.name)}</b><small>${esc(r.sub||'Nhấn để xem chi tiết')}</small></span><strong class="plus-text">+${fmt(r.stats.plus)}</strong><strong class="minus-text">${fmt(r.stats.minus)}</strong><strong class="net-text">${r.stats.total>0?'+':''}${fmt(r.stats.total)}</strong><strong class="study-text">${r.study.total?fmt(r.study.avg):'—'}</strong></button>`).join('')}`:'<div class="empty">Chưa có dữ liệu điểm trong phạm vi này.</div>';
      root.querySelectorAll('.score-detail-row').forEach(btn=>btn.onclick=()=>showDetail(btn.dataset.detailId,rows));
    }
    function showDetail(id,rows){
      const r=rows.find(x=>String(x.id||x.name)===String(id));if(!r)return;
      const ev=r.id?((eventByStudent.get(String(r.id))||[])):scopedEvents.filter(e=>{const key=state.view==='school'?gradeNorm(e.khoi):state.view==='grade'?classNorm(e.lop):classNorm(e.lop);return key===r.name});
      const st=r.id?(studyByStudent.get(String(r.id))||[]):(studyByClass.get(classNorm(r.name))||[]);
      const counts=studyStats(st).counts;
      const details=[...new Map(ev.map(e=>[String(e.id||JSON.stringify(e)),e])).values()];
      root.querySelector('#statsDetailModal').classList.remove('hidden');
      root.querySelector('#statsDetailModal').innerHTML=`<div class="stats-detail-box"><div class="stats-detail-head"><div><h3>📋 Chi tiết: ${esc(r.name)}</h3><p>${esc(r.sub||'')}</p></div><button type="button" id="closeStatsDetail">✕</button></div><div class="detail-kpis"><div><small>Điểm cộng</small><b class="plus-text">+${fmt(r.stats.plus)}</b></div><div><small>Điểm trừ</small><b class="minus-text">${fmt(r.stats.minus)}</b></div><div><small>Điểm</small><b>${r.stats.total>0?'+':''}${fmt(r.stats.total)}</b></div><div><small>ĐTB học tập</small><b>${r.study.total?fmt(r.study.avg):'—'}</b></div></div><h4>Phân bố điểm học sinh/Sổ đầu bài</h4><div class="score-count-grid">${[10,9,8,7,6,5,4,3,2,1,0].map(d=>`<div><b>${d}</b><span>${counts[d]||0}</span></div>`).join('')}</div><h4>Chi tiết điểm cộng / điểm trừ</h4><div class="event-detail-list">${details.length?details.map(e=>`<div><span>${esc(e.ngay_diem_danh||'')}</span><b>${esc(e.ten_nguoi_cap_nhat||e.ho_ten||'')}</b><strong class="${Number(e.diem)>=0?'plus-text':'minus-text'}">${Number(e.diem)>0?'+':''}${fmt(e.diem)}</strong><small>${esc(e.chi_tiet||e.ma_hd||'')}</small></div>`).join(''):'<div class="empty">Chưa có dữ liệu điểm cộng/trừ.</div>'}</div></div>`;
      root.querySelector('#closeStatsDetail').onclick=()=>root.querySelector('#statsDetailModal').classList.add('hidden');
    }
    function renderAlerts(){
      const ev=selectedEvents().filter(e=>Number(e.diem)<0);
      const groups=new Map();
      ev.forEach(e=>{
        const key=String(e.ma_hd||criterionName(e));
        if(!groups.has(key))groups.set(key,{key,name:criterionName(e),mang:criterionGroup(e),total:0,count:0,students:new Set(),events:[]});
        const g=groups.get(key);g.total+=Number(e.diem||0);g.count+=1;if(e.ma_hs)g.students.add(String(e.ma_hs));g.events.push(e);
      });
      const list=[...groups.values()].sort((a,b)=>a.total-b.total||b.count-a.count);
      const scopeText=state.view==='school'?'Toàn trường':state.view==='grade'?`Khối ${state.grade||'tất cả'}`:`Lớp ${state.cls||'tất cả'}`;
      root.querySelector('#alertScopeLabel').textContent=scopeText;
      root.querySelector('#alertList').innerHTML=list.length?list.map((g,i)=>`<button type="button" class="alert-row criterion-alert-row" data-alert-criterion="${esc(g.key)}"><div class="alert-rank">${i+1}</div><div class="alert-main"><b>${esc(g.name)}</b><span>${esc(g.mang)} · ${g.count} lần · ${g.students.size} học sinh bị ảnh hưởng</span></div><div class="alert-score"><b>${fmt(g.total)}</b><small>điểm trừ</small></div><div class="alert-net bad"><b>${g.count}</b><small>lần vi phạm</small></div></button>`).join(''):'<div class="alert-empty">🎉 Không có tiêu chí nào phát sinh điểm trừ trong phạm vi này.</div>';
      root.querySelectorAll('.criterion-alert-row').forEach(b=>b.onclick=()=>showCriterionDetail(b.dataset.alertCriterion, list));
    }
    function showCriterionDetail(key,list){
      const g=list.find(x=>String(x.key)===String(key));if(!g)return;
      const uniqueStudents=[...g.students].map(id=>studentMap.get(id)).filter(Boolean);
      const details=g.events.map(e=>`<div><span>${esc(e.ngay_diem_danh||'')}</span><b>${esc(e.ho_ten||studentMap.get(String(e.ma_hs))?.ho_ten||e.ma_hs||'Tập thể')}</b><strong class="minus-text">${fmt(e.diem)}</strong><small>${esc(e.chi_tiet||e.ma_hd||'')}</small></div>`).join('');
      root.querySelector('#statsDetailModal').classList.remove('hidden');
      root.querySelector('#statsDetailModal').innerHTML=`<div class="stats-detail-box"><div class="stats-detail-head"><div><div class="detail-type-badge">CẢNH BÁO THEO TIÊU CHÍ</div><h3>🚨 ${esc(g.name)}</h3><p>${esc(g.mang)} · ${g.count} lần · ${uniqueStudents.length} học sinh bị ảnh hưởng</p></div><button type="button" id="closeStatsCriterion">✕</button></div><div class="detail-kpis"><div><small>Tiêu chí</small><b>${esc(g.name)}</b></div><div><small>Số lần</small><b>${g.count}</b></div><div><small>Học sinh</small><b>${uniqueStudents.length}</b></div><div><small>Tổng điểm trừ</small><b class="minus-text">${fmt(g.total)}</b></div></div><h4>Học sinh liên quan</h4><div class="criterion-student-list">${uniqueStudents.length?uniqueStudents.map(s=>`<div><b>${esc(s.ho_ten)}</b><span>${esc(s.ma_hs)} · ${esc(s.lop)}</span></div>`).join(''):'<div class="empty">Không xác định được học sinh.</div>'}</div><h4>Chi tiết phát sinh</h4><div class="event-detail-list">${details||'<div class="empty">Chưa có chi tiết.</div>'}</div></div>`;
      root.querySelector('#closeStatsCriterion').onclick=()=>root.querySelector('#statsDetailModal').classList.add('hidden');
    }
    root.querySelectorAll('.view-btn').forEach(b=>b.onclick=()=>{root.querySelectorAll('.view-btn').forEach(x=>x.classList.remove('active'));b.classList.add('active');state.view=b.dataset.view;if(state.view==='school'){state.grade='';state.cls=''}renderFilters();renderChart();renderAlerts()});
    renderPeriodToolbar();renderFilters();renderChart();renderAlerts();
  }catch(error){box.innerHTML=`<div class="danger-box">${esc(error.message||String(error))}</div>`;console.error('[QLNN STATS]',error)}
}
