import {supabase,managedClasses,canViewAllStats,roleOf} from './config.js';
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
  return {plus,minus,net:plus+minus,count:rows.length};
}
function groupBy(arr,keyFn){const m=new Map();arr.forEach(x=>{const k=keyFn(x)||'Chưa xác định';if(!m.has(k))m.set(k,[]);m.get(k).push(x)});return m;}
function barRows(groups,limit=40){
  return [...groups.entries()].map(([name,rows])=>({name,stats:statsFor(rows)})).sort((a,b)=>b.stats.net-a.stats.net).slice(0,limit);
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
    const [studentsRaw,events]=await Promise.all([
      fetchAll(()=>supabase.from('danh_sach').select('id,ma_hs,ho_ten,khoi,lop,trang_thai').order('id')),
      fetchAll(()=>supabase.from('diem_danh_master').select('id,ma_hs,ho_ten,khoi,lop,diem,trang_thai,chi_tiet,ma_hd,ngay_diem_danh,doi_tuong').order('id'))
    ]);
    let students=studentsRaw.filter(x=>activeStudent(x.trang_thai));
    const user=window.App?.Auth?.currentUser;
    const scope=managedClasses(user);
    const allStats=canViewAllStats(user);
    if(!allStats && scope!==null){
      const set=new Set((scope||[]).map(x=>String(x).trim()));
      students=students.filter(x=>set.has(String(x.lop||'').trim()));
    }
    const studentMap=new Map(students.map(x=>[String(x.ma_hs),x]));
    let scopedEvents=events;
    if(!allStats && scope!==null){
      const set=new Set((scope||[]).map(x=>String(x).trim()));
      scopedEvents=events.filter(x=>set.has(String(x.lop||'').trim()));
    }

    const byGrade=groupBy(students,x=>String(x.khoi||'Chưa xác định').trim());
    const byClass=groupBy(students,x=>String(x.lop||'Chưa xác định').trim());
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
        <div class="stats-section-head"><div><h3>📈 Điểm thi đua</h3><p>Chọn chế độ xem để so sánh điểm cộng, điểm trừ và điểm ròng.</p></div></div>
        <div class="view-switch" role="tablist">
          <button class="view-btn active" data-view="school">🏫 Toàn trường</button>
          <button class="view-btn" data-view="grade">🎓 Theo khối</button>
          <button class="view-btn" data-view="class">🏠 Theo lớp</button>
        </div>
        <div class="stats-filter-row" id="statsFilters"></div>
        <div id="scoreSummary"></div>
        <div class="score-chart-wrap"><div id="scoreChart"></div></div>
      </section>

      <section class="stats-card alert-card">
        <div class="stats-section-head"><div><h3>🚨 Danh sách cảnh báo</h3><p>Học sinh có điểm trừ cao trong phạm vi đang xem.</p></div><select id="alertThreshold"><option value="5">Từ 5 điểm trừ</option><option value="10" selected>Từ 10 điểm trừ</option><option value="15">Từ 15 điểm trừ</option><option value="20">Từ 20 điểm trừ</option></select></div>
        <div id="alertList" class="alert-list"></div>
      </section>`;

    const state={view:'school',grade:'',cls:''};
    const eventByStudent=new Map();
    scopedEvents.forEach(e=>{const id=String(e.ma_hs||'');if(!id)return;if(!eventByStudent.has(id))eventByStudent.set(id,[]);eventByStudent.get(id).push(e)});

    function allowedClasses(){
      let arr=[...byClass.keys()].sort((a,b)=>a.localeCompare(b,'vi',{numeric:true}));
      if(state.grade)arr=arr.filter(c=>norm((byClass.get(c)||[])[0]?.khoi)===norm(state.grade));
      return arr;
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
      if(state.view==='grade')return students.filter(s=>!state.grade||String(s.khoi||'')===state.grade);
      return students.filter(s=>(!state.grade||String(s.khoi||'')===state.grade)&&(!state.cls||String(s.lop||'')===state.cls));
    }
    function selectedEvents(){
      const ids=new Set(selectedStudents().map(s=>String(s.ma_hs)));
      return scopedEvents.filter(e=>e.ma_hs&&ids.has(String(e.ma_hs)) || (!e.ma_hs && state.view==='class' && String(e.lop||'')===state.cls));
    }
    function renderChart(){
      const ev=selectedEvents();
      let rows=[];
      if(state.view==='school'){
        const m=groupBy(ev,e=>String(e.khoi||studentMap.get(String(e.ma_hs))?.khoi||'Chưa xác định'));
        rows=barRows(m,20);
      }else if(state.view==='grade'){
        const m=groupBy(ev,e=>String(e.lop||studentMap.get(String(e.ma_hs))?.lop||'Chưa xác định'));
        rows=barRows(m,40);
      }else{
        const m=groupBy(ev,e=>String(e.ma_hs||'')||String(e.ho_ten||'Chưa xác định'));
        rows=barRows(m,40).map(r=>{const s=studentMap.get(String(r.name));return {...r,name:s?.ho_ten||r.name,sub:s?.lop||''}});
      }
      const max=Math.max(1,...rows.map(r=>Math.max(Math.abs(r.stats.plus),Math.abs(r.stats.minus),Math.abs(r.stats.net))));
      root.querySelector('#scoreSummary').innerHTML=`<div class="score-mini-grid"><div><span>Điểm cộng</span><b>+${fmt(rows.reduce((a,r)=>a+r.stats.plus,0))}</b></div><div><span>Điểm trừ</span><b>${fmt(rows.reduce((a,r)=>a+r.stats.minus,0))}</b></div><div><span>Điểm ròng</span><b>${fmt(rows.reduce((a,r)=>a+r.stats.net,0))}</b></div></div>`;
      root.querySelector('#scoreChart').innerHTML=rows.length?rows.map(r=>{const pos=Math.max(0,r.stats.plus/max*100);const neg=Math.max(0,Math.abs(r.stats.minus)/max*100);const net=Math.max(0,Math.abs(r.stats.net)/max*100);return `<div class="score-bar-row"><div class="score-bar-label"><b>${esc(r.name)}</b><small>${esc(r.sub||'')}</small></div><div class="score-bars"><div class="score-track"><span class="score-fill plus" style="width:${pos}%"></span></div><strong class="score-val plus-text">+${fmt(r.stats.plus)}</strong><div class="score-track"><span class="score-fill minus" style="width:${neg}%"></span></div><strong class="score-val minus-text">${fmt(r.stats.minus)}</strong><div class="score-track"><span class="score-fill net" style="width:${net}%"></span></div><strong class="score-val net-text">${fmt(r.stats.net)}</strong></div></div>`}).join(''):'<div class="empty">Chưa có dữ liệu điểm trong phạm vi này.</div>';
    }
    function renderAlerts(){
      const threshold=Number(root.querySelector('#alertThreshold').value||10);
      const list=selectedStudents().map(s=>{const rows=eventByStudent.get(String(s.ma_hs))||[];const minus=rows.filter(e=>Number(e.diem)<0).reduce((a,e)=>a+Number(e.diem||0),0);const plus=rows.filter(e=>Number(e.diem)>0).reduce((a,e)=>a+Number(e.diem||0),0);return {...s,minus,plus,net:plus+minus}}).filter(s=>Math.abs(s.minus)>=threshold).sort((a,b)=>a.minus-b.minus);
      root.querySelector('#alertList').innerHTML=list.length?list.map((s,i)=>`<div class="alert-row"><div class="alert-rank">${i+1}</div><div class="alert-main"><b>${esc(s.ho_ten)}</b><span>${esc(s.ma_hs)} · ${esc(s.lop)}</span></div><div class="alert-score"><b>${fmt(s.minus)}</b><small>điểm trừ</small></div><div class="alert-net ${s.net<0?'bad':'good'}">${s.net>0?'+':''}${fmt(s.net)}<small>ròng</small></div></div>`).join(''):'<div class="alert-empty">🎉 Không có học sinh vượt ngưỡng cảnh báo trong chế độ xem này.</div>';
    }
    root.querySelectorAll('.view-btn').forEach(b=>b.onclick=()=>{root.querySelectorAll('.view-btn').forEach(x=>x.classList.remove('active'));b.classList.add('active');state.view=b.dataset.view;if(state.view==='school'){state.grade='';state.cls=''}renderFilters();renderChart();renderAlerts()});
    root.querySelector('#alertThreshold').onchange=renderAlerts;
    renderFilters();renderChart();renderAlerts();
  }catch(error){box.innerHTML=`<div class="danger-box">${esc(error.message||String(error))}</div>`;console.error('[QLNN STATS]',error)}
}
