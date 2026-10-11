import {supabase,managedClasses,canViewAllStats,roleOf,appConfig} from './config.js?v=3.0.5.25.33';
import {esc,toast} from './ui.js?v=3.0.5.25.33';
import {DEFAULT_BASE_SCORES} from './criteria-defaults.js?v=3.0.5.25.33';

async function fetchAll(factory,chunk=1000){
  const all=[];let from=0;
  while(true){const {data,error}=await factory().range(from,from+chunk-1);if(error)throw error;const rows=data||[];all.push(...rows);if(rows.length<chunk)break;from+=chunk}
  return all;
}
function norm(v){return String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim()}
function classNorm(v){return String(v||'').trim().toUpperCase()}
function gradeNorm(v){const x=norm(v);const m=x.match(/(?:khoi\s*)?(10|11|12)\b/);return m?m[1]:String(v||'').trim()}
function fmt(n){const x=Number(n||0);return Number.isInteger(x)?String(x):x.toFixed(2).replace(/0+$/,'').replace(/\.$/,'')}
function isoDate(d){return d.toISOString().slice(0,10)}
function localDate(s){const d=new Date(`${s}T00:00:00`);return Number.isNaN(d.getTime())?null:d}
function addDays(d,n){const x=new Date(d);x.setDate(x.getDate()+n);return x}
function startOfWeek(d){const x=new Date(d);const day=x.getDay()||7;x.setDate(x.getDate()-day+1);x.setHours(0,0,0,0);return x}
function currentISOWeek(d){const x=new Date(d);x.setHours(0,0,0,0);const day=x.getDay()||7;x.setDate(x.getDate()+4-day);const y=new Date(x.getFullYear(),0,1);return Math.ceil((((x-y)/86400000)+1)/7)}
function parseSchoolYear(){const m=String(appConfig?.namHoc||'').match(/(20\d{2})\s*[-–]\s*(20\d{2})/);if(!m)return {start:new Date(new Date().getFullYear(),7,1),end:new Date(new Date().getFullYear()+1,6,31)};return {start:new Date(Number(m[1]),7,1),end:new Date(Number(m[2]),6,31)}}
function rangeFor(type,ref,from,to){const d=ref||new Date();let a,b,label;if(type==='week'){a=startOfWeek(d);b=addDays(a,6);label=`Tuần ${currentISOWeek(d)} · ${isoDate(a)} → ${isoDate(b)}`}else if(type==='month'){a=new Date(d.getFullYear(),d.getMonth(),1);b=new Date(d.getFullYear(),d.getMonth()+1,0);label=`Tháng ${d.getMonth()+1}/${d.getFullYear()}`}else if(type==='year'){const sy=parseSchoolYear();a=sy.start;b=sy.end;label=`Năm học ${appConfig?.namHoc||''}`}else{a=localDate(from)||d;b=localDate(to)||d;if(b<a)[a,b]=[b,a];label=`Từ ${isoDate(a)} → ${isoDate(b)}`}return {from:isoDate(a),to:isoDate(b),label}}
function inRange(v,r){if(!v)return false;const x=String(v).slice(0,10);return x>=r.from&&x<=r.to}
function active(v){const x=norm(v);return !x||['active','dang hoc','hoc','hoat dong','true','1'].includes(x)}
function signed(rows){return rows.reduce((a,r)=>a+Number(r.diem||0),0)}
function academicFromStudy(rows){
  let score=0;
  rows.forEach(r=>{
    const d=Number(r.diem||0), n=Math.max(0,Number(r.so_luong||0));
    if(!Number.isFinite(d)||!n)return;
    if(r.loai_diem==='SoDauBai' && d<=9 && d>=0) score-=(10-d)*n;
    if(r.loai_diem==='HocSinh'){
      if(d===10)score+=1*n;
      else if(d===9)score+=0.5*n;
      else if(d===8)score+=0.25*n;
    }
  });
  return score;
}
function categoryName(v){
  const x=norm(v);
  if(x.includes('hoc tap'))return 'Học tập';
  if(x.includes('ne nep'))return 'Nề nếp';
  if(x.includes('lao dong')||x.includes('co so vat chat')||x.includes('cs-vc'))return 'Lao động - CSVC';
  if(x.includes('tap trung')||x.includes('san truong'))return 'Tập trung';
  if(x.includes('doan')||x.includes('ngoai khoa'))return 'Đoàn - Ngoại khóa';
  return 'Khác';
}
function newCats(){return {'Học tập':0,'Nề nếp':0,'Lao động - CSVC':0,'Tập trung':0,'Đoàn - Ngoại khóa':0,'Khác':0}}
function addEvent(map,e,criteriaMap,studentMap){
  const cls=classNorm(e.lop||studentMap.get(String(e.ma_hs))?.lop);if(!cls)return;
  const cat=categoryName(criteriaMap.get(String(e.ma_hd))?.mang||e.mang||e.chi_tiet);
  const id=e.ma_hs?String(e.ma_hs):`CLASS:${cls}`;
  if(!map.has(id))map.set(id,{cats:newCats(),events:[]});
  const p=Number(e.diem||0);map.get(id).cats[cat]+=p;map.get(id).events.push(e);
}
function applyStudy(map,study,studentMap){
  const byClass=new Map(),byStudent=new Map();
  study.forEach(r=>{
    const cls=classNorm(r.lop||studentMap.get(String(r.ma_hs))?.lop);if(!cls)return;
    if(!byClass.has(cls))byClass.set(cls,[]);byClass.get(cls).push(r);
    if(r.ma_hs){const id=String(r.ma_hs);if(!byStudent.has(id))byStudent.set(id,[]);byStudent.get(id).push(r)}
  });
  return {byClass,byStudent};
}
function classAcademicScore(rows){
  const raw=academicFromStudy(rows);
  // Theo tiêu chí: điểm cộng học tập từ các đầu điểm của lớp khống chế 8 điểm;
  // phần vượt 8 được quy đổi 0,2 cho mỗi điểm vượt. Phần SĐB bị trừ giữ nguyên.
  let bonus=0,deduct=0;
  rows.forEach(r=>{const d=Number(r.diem||0),n=Math.max(0,Number(r.so_luong||0));if(r.loai_diem==='SoDauBai'&&d<=9&&d>=0)deduct+=(10-d)*n;if(r.loai_diem==='HocSinh'){if(d===10)bonus+=1*n;else if(d===9)bonus+=.5*n;else if(d===8)bonus+=.25*n}});
  const adjustedBonus=bonus<=8?bonus:8+(bonus-8)*.2;
  return deduct*-1+adjustedBonus;
}

export async function init(root){
  const user=window.App?.Auth?.currentUser;const role=roleOf(user);
  root.innerHTML=`<div class="stats-hero"><div class="stats-hero-icon">🏆</div><div><h2>Xếp loại & Thi đua thử nghiệm</h2><p>Tạm thời tính điểm theo tiêu chí đã cung cấp và dữ liệu điểm đã nhập. Chưa áp dụng công thức thi đua tháng/học kỳ/cả năm.</p></div><span class="badge warn">THỬ NGHIỆM</span></div><div id="rankTools"></div><div id="rankBody" class="empty">Đang tải...</div>`;
  if(role==='GVCN')renderWeekGood(root,user);
  await loadRank(root,user);
}

async function renderWeekGood(root,user){
  const box=root.querySelector('#rankTools');
  box.innerHTML=`<div class="action-card" style="margin-bottom:16px"><div class="page-head"><div><h3 style="margin:0">🏆 Đăng ký Tuần học tốt</h3><p>Lớp chủ nhiệm: <b>${esc(user.lop_quan_ly||'')}</b></p></div></div><div class="grid"><label>Tuần học<input id="goodWeek" type="number" min="1" max="52" placeholder="Ví dụ: 6"></label><label>Ghi chú<input id="goodNote" placeholder="Nội dung/điều kiện đăng ký"></label></div><div class="action-row"><button id="goodSave" class="btn primary">Đăng ký tuần học tốt</button></div><div id="goodStatus"></div></div>`;
  box.querySelector('#goodSave').onclick=async()=>{const week=Number(box.querySelector('#goodWeek').value||0),lop=String(user.lop_quan_ly||'').trim();if(!week||!lop)return toast('GVCN phải chọn tuần học và có lớp chủ nhiệm.','err');const payload={nam_hoc:appConfig?.namHoc||'2026-2027',tuan_hoc:week,lop,ma_cb:user.ma_cb,ten_cb:user.ho_ten,trang_thai:'Đăng ký',ghi_chu:box.querySelector('#goodNote').value.trim()||null};const {error}=await supabase.from('tuan_hoc_tot').upsert(payload,{onConflict:'nam_hoc,tuan_hoc,lop'});if(error)return toast(`Không đăng ký được: ${error.message}`,'err');box.querySelector('#goodStatus').innerHTML='<div class="notice" style="margin-top:12px">Đã đăng ký Tuần học tốt cho lớp.</div>';toast('Đã đăng ký Tuần học tốt.','ok')};
}

async function loadRank(root,user){
 try{
  const [students,events,criteria,studyRows]=await Promise.all([
   fetchAll(()=>supabase.from('danh_sach').select('ma_hs,ho_ten,khoi,lop,trang_thai').order('id')),
   fetchAll(()=>supabase.from('diem_danh_master').select('id,ma_hs,ho_ten,khoi,lop,diem,trang_thai,chi_tiet,ma_hd,ngay_diem_danh,doi_tuong').order('id')),
   fetchAll(()=>supabase.from('danh_muc_diem').select('ma_hd,ten_hd,mang,loai,diem,doi_tuong').order('ma_hd')),
   fetchAll(()=>supabase.from('diem_hoc_tap_tuan').select('nam_hoc,tuan_hoc,lop,ma_hs,ho_ten,loai_diem,diem,so_luong,created_at').order('id'))
  ]);
  const ss0=students.filter(x=>active(x.trang_thai));const scope=managedClasses(user);const all=canViewAllStats(user);
  const ss=(!all&&scope!==null)?ss0.filter(x=>new Set((scope||[]).map(classNorm)).has(classNorm(x.lop))):ss0;
  const allowed=new Set(ss.map(x=>String(x.ma_hs)));const studentMap=new Map(ss.map(x=>[String(x.ma_hs),x]));
  const ev0=events.filter(e=>e.ma_hs?allowed.has(String(e.ma_hs)):new Set(ss.map(s=>classNorm(s.lop))).has(classNorm(e.lop)));
  const classSet=new Set(ss.map(s=>classNorm(s.lop)));
  const ev=ev0.filter(e=>classSet.has(classNorm(e.lop||studentMap.get(String(e.ma_hs))?.lop)));
  const study0=studyRows.filter(r=>classSet.has(classNorm(r.lop||studentMap.get(String(r.ma_hs))?.lop)));
  const criteriaMap=new Map(criteria.map(c=>[String(c.ma_hd),c]));
  const now=new Date();const state={view:'individual',period:'month',ref:isoDate(now),from:isoDate(now),to:isoDate(now),useBase:true};let range=rangeFor(state.period,localDate(state.ref),state.from,state.to);
  const body=root.querySelector('#rankBody');
  body.innerHTML=`<section class="stats-card"><div class="stats-section-head"><div><h3>📊 Bảng thi đua thử nghiệm</h3><p><b>Điểm</b> = tổng điểm đã chấm theo tiêu chí trong khoảng thời gian; không gọi là “điểm ròng”. Phần Học tập được bổ sung từ dữ liệu Sổ đầu bài/điểm học sinh đã nhập.</p></div></div><div id="rankPeriod" class="period-toolbar"></div><div class="view-switch"><button class="rank-view active" data-view="individual">👤 Cá nhân</button><button class="rank-view" data-view="class">👥 Tập thể lớp</button><button class="rank-view" data-view="grade">🎓 Theo khối</button></div><div id="rankTable"></div></section>`;
  function apply(){range=rangeFor(state.period,localDate(state.ref),state.from,state.to)}
  function renderPeriod(){const p=root.querySelector('#rankPeriod');p.innerHTML=`<label>Khoảng tính<select id="rankPeriodSelect"><option value="week" ${state.period==='week'?'selected':''}>Tuần</option><option value="month" ${state.period==='month'?'selected':''}>Tháng kiểm thử</option><option value="year" ${state.period==='year'?'selected':''}>Năm học (chỉ lọc dữ liệu)</option><option value="custom" ${state.period==='custom'?'selected':''}>Tùy chọn</option></select></label>${state.period==='custom'?`<label>Từ<input id="rankFrom" type="date" value="${state.from}"></label><label>Đến<input id="rankTo" type="date" value="${state.to}"></label>`:`<label>Ngày tham chiếu<input id="rankRef" type="date" value="${state.ref}"></label>`}<span class="period-badge">${esc(range.label)}</span>`;p.querySelector('#rankPeriodSelect').onchange=e=>{state.period=e.target.value;apply();renderPeriod();render();};const r=p.querySelector('#rankRef');if(r)r.onchange=e=>{state.ref=e.target.value;apply();renderPeriod();render()};const f=p.querySelector('#rankFrom');if(f)f.onchange=e=>{state.from=e.target.value;apply();renderPeriod();render()};const t=p.querySelector('#rankTo');if(t)t.onchange=e=>{state.to=e.target.value;apply();renderPeriod();render()};const rb=p.querySelector('#rankBase');if(rb)rb.onchange=e=>{state.useBase=e.target.checked;render()}}
  function filteredEvents(){return ev.filter(e=>inRange(e.ngay_diem_danh,range))}
  function filteredStudy(){if(state.period==='year')return study0.filter(r=>String(r.nam_hoc||'')===String(appConfig?.namHoc||''));if(state.period==='week'){const w=currentISOWeek(localDate(range.from)||new Date());return study0.filter(r=>String(r.nam_hoc||'')===String(appConfig?.namHoc||'')&&Number(r.tuan_hoc)===w)}return study0.filter(r=>inRange(r.created_at,range))}
  function makeData(){
    const eventsF=filteredEvents(),studyF=filteredStudy();const sm=applyStudy(new Map(),studyF,studentMap);const individual=new Map();const classData=new Map();
    ss.forEach(s=>{individual.set(String(s.ma_hs),{id:String(s.ma_hs),name:s.ho_ten,cls:classNorm(s.lop),grade:gradeNorm(s.khoi),cats:newCats()});const cls=classNorm(s.lop);if(cls&&!classData.has(cls))classData.set(cls,{name:cls,grade:gradeNorm(s.khoi),cats:newCats()});});
    eventsF.forEach(e=>{const id=e.ma_hs?String(e.ma_hs):null;if(id&&individual.has(id)){const cat=categoryName(criteriaMap.get(String(e.ma_hd))?.mang||e.chi_tiet);individual.get(id).cats[cat]+=Number(e.diem||0)}const cls=classNorm(e.lop||studentMap.get(String(e.ma_hs))?.lop);if(cls){if(!classData.has(cls))classData.set(cls,{name:cls,grade:gradeNorm(e.khoi||studentMap.get(String(e.ma_hs))?.khoi),cats:newCats()});const cat=categoryName(criteriaMap.get(String(e.ma_hd))?.mang||e.chi_tiet);classData.get(cls).cats[cat]+=Number(e.diem||0)}});
    sm.byStudent.forEach((rows,id)=>{if(individual.has(id))individual.get(id).cats['Học tập']+=academicFromStudy(rows)});
    sm.byClass.forEach((rows,cls)=>{if(classData.has(cls))classData.get(cls).cats['Học tập']+=classAcademicScore(rows);else{const s=ss.find(x=>classNorm(x.lop)===cls);if(s){classData.set(cls,{name:cls,grade:gradeNorm(s.khoi),cats:newCats()});classData.get(cls).cats['Học tập']=classAcademicScore(rows)}}});
    classData.forEach((d,cls)=>{if(!d.grade){const s=ss.find(x=>classNorm(x.lop)===cls);d.grade=gradeNorm(s?.khoi)}});
    // Điểm khởi điểm của văn bản chỉ áp dụng cho điểm thi đua tập thể theo tháng.
    // Đây là chế độ kiểm thử công thức, chưa phải công thức xếp loại tháng chính thức.
    if(state.period==='month' && state.useBase){
      classData.forEach(d=>{
        Object.entries(DEFAULT_BASE_SCORES).forEach(([cat,base])=>{d.cats[cat]=(Number(d.cats[cat]||0)+Number(base||0));});
      });
    }
    return {individual:[...individual.values()],classes:[...classData.values()]};
  }
  const cats=['Học tập','Nề nếp','Lao động - CSVC','Tập trung','Đoàn - Ngoại khóa'];
  function total(d){return Object.values(d.cats).reduce((a,v)=>a+Number(v||0),0)}
  function baseFor(cat){return state.period==='month'&&state.useBase?Number(DEFAULT_BASE_SCORES[cat]||0):0}
  function detailEventRows(list){return list.length?list.map(e=>`<div class="rank-detail-event"><span>${esc(e.ngay_diem_danh||'')}</span><b>${esc(e.ho_ten||e.ten_nguoi_cap_nhat||e.ma_hs||'Tập thể')}</b><strong class="${Number(e.diem)>=0?'plus-text':'minus-text'}">${Number(e.diem)>0?'+':''}${fmt(e.diem)}</strong><small>${esc(criteriaMap.get(String(e.ma_hd))?.ten_hd||e.chi_tiet||e.ma_hd||'')}</small></div>`).join(''):'<div class="empty">Chưa có điểm chấm trong khoảng thời gian này.</div>'}
  function studyDist(rows){const m={};rows.forEach(r=>{const d=Number(r.diem);if(Number.isFinite(d))m[d]=(m[d]||0)+Number(r.so_luong||0)});return [10,9,8,7,6,5,4,3,2,1,0].map(d=>`<div><b>${d}</b><span>${m[d]||0}</span></div>`).join('')}
  function openRankDetail(kind,key,data){
    const modal=root.querySelector('#rankDetailModal'); if(!modal)return;
    const eventsF=filteredEvents(), studyF=filteredStudy();
    let title='',sub='',catsData=newCats(),events=[],study=[],extra='';
    if(kind==='individual'){
      const d=data.individual.find(x=>String(x.id)===String(key)); if(!d)return; title=d.name;sub=`Học sinh ${d.id} · Lớp ${d.cls} · Khối ${d.grade}`;catsData={...d.cats};events=eventsF.filter(e=>String(e.ma_hs||'')===String(d.id));study=studyF.filter(r=>String(r.ma_hs||'')===String(d.id));
      extra=`<div class="rank-detail-info"><span><small>Mã học sinh</small><b>${esc(d.id)}</b></span><span><small>Lớp</small><b>${esc(d.cls)}</b></span><span><small>Khối</small><b>${esc(d.grade)}</b></span></div>`;
    } else if(kind==='class'){
      const d=data.classes.find(x=>classNorm(x.name)===classNorm(key)); if(!d)return; title=`Lớp ${d.name}`;sub=`Khối ${d.grade}`;catsData={...d.cats};events=eventsF.filter(e=>classNorm(e.lop||studentMap.get(String(e.ma_hs))?.lop)===classNorm(d.name));study=studyF.filter(r=>classNorm(r.lop||studentMap.get(String(r.ma_hs))?.lop)===classNorm(d.name));
      const members=ss.filter(s=>classNorm(s.lop)===classNorm(d.name));
      const memberScores=data.individual.filter(x=>classNorm(x.cls)===classNorm(d.name)).map(x=>({...x,total:total(x)})).sort((a,b)=>b.total-a.total);
      extra=`<div class="rank-detail-info"><span><small>Khối</small><b>${esc(d.grade)}</b></span><span><small>Số học sinh</small><b>${members.length}</b></span><span><small>Số bản ghi điểm</small><b>${events.length}</b></span></div><h4>Điểm theo học sinh trong lớp</h4><div class="rank-member-list">${memberScores.length?memberScores.map((x,i)=>`<div><span>${i+1}</span><b>${esc(x.name)}</b><small>${esc(x.id)}</small><strong>${fmt(x.total)}</strong></div>`).join(''):'<div class="empty">Chưa có dữ liệu học sinh.</div>'}</div>`;
    } else {
      const arr=data.classes.filter(x=>gradeNorm(x.grade)===gradeNorm(key)); if(!arr.length)return; title=`Khối ${key}`;sub=`${arr.length} lớp · điểm trung bình các lớp`; arr.forEach(d=>cats.forEach(c=>catsData[c]+=Number(d.cats[c]||0)));cats.forEach(c=>catsData[c]/=arr.length);
      const gradeClasses=arr.map(d=>({...d,total:total(d)})).sort((a,b)=>b.total-a.total); const members=ss.filter(s=>gradeNorm(s.khoi)===gradeNorm(key)); const clsSet=new Set(arr.map(x=>classNorm(x.name))); events=eventsF.filter(e=>clsSet.has(classNorm(e.lop||studentMap.get(String(e.ma_hs))?.lop))); study=studyF.filter(r=>clsSet.has(classNorm(r.lop||studentMap.get(String(r.ma_hs))?.lop)));
      extra=`<div class="rank-detail-info"><span><small>Số lớp</small><b>${arr.length}</b></span><span><small>Số học sinh</small><b>${members.length}</b></span><span><small>Số bản ghi điểm</small><b>${events.length}</b></span></div><h4>Xếp hạng các lớp trong khối</h4><div class="rank-member-list">${gradeClasses.map((x,i)=>`<div><span>${i+1}</span><b>${esc(x.name)}</b><small>${esc(x.grade)}</small><strong>${fmt(x.total)}</strong></div>`).join('')}</div>`;
    }
    const overall=total(catsData);
    modal.classList.remove('hidden');
    modal.innerHTML=`<div class="rank-detail-box"><div class="stats-detail-head"><div><div class="detail-type-badge">CHI TIẾT THI ĐUA</div><h3>${esc(title)}</h3><p>${esc(sub)}</p></div><button type="button" id="closeRankDetail">✕</button></div>${extra}<div class="detail-kpis rank-kpis">${cats.map(c=>`<div><small>${esc(c)}</small><b>${fmt(catsData[c])}</b><em>Điểm</em></div>`).join('')}<div class="rank-total-kpi"><small>Tổng điểm</small><b>${fmt(overall)}</b><em>Điểm</em></div></div><h4>Phân bố điểm học tập</h4><div class="score-count-grid rank-study-grid">${studyDist(study)}</div><h4>Chi tiết điểm đã chấm</h4><div class="event-detail-list">${detailEventRows(events)}</div></div>`;
    modal.querySelector('#closeRankDetail').onclick=()=>modal.classList.add('hidden');
  }
  function render(){const data=makeData();root.querySelectorAll('.rank-view').forEach(b=>b.classList.toggle('active',b.dataset.view===state.view));const t=root.querySelector('#rankTable');if(state.view==='individual'){const rows=data.individual.map(d=>({...d,total:total(d)})).sort((a,b)=>b.total-a.total);t.innerHTML=`<div class="notice">Cá nhân: chỉ hiển thị điểm chấm trực tiếp cho học sinh và điểm Học tập suy ra từ dữ liệu Cán bộ lớp. Không cộng điểm khởi điểm 200/100 vì văn bản quy định các điểm ban đầu cho tập thể lớp theo tháng.</div><div class="table-wrap"><table class="table rank-score-table"><thead><tr><th>STT</th><th>Học sinh</th><th>Lớp</th>${cats.map(c=>`<th>${c}</th>`).join('')}<th>Điểm</th></tr></thead><tbody>${rows.map((d,i)=>`<tr class="rank-click-row" data-detail-key="${esc(d.id)}"><td>${i+1}</td><td><b>${esc(d.name)}</b><br><small>${esc(d.id)}</small></td><td>${esc(d.cls)}</td>${cats.map(c=>`<td>${fmt(d.cats[c])}</td>`).join('')}<td><b>${fmt(d.total)}</b></td></tr>`).join('')}</tbody></table></div>`;t.querySelectorAll('.rank-click-row').forEach(r=>r.onclick=()=>openRankDetail('individual',r.dataset.detailKey,data))}
    else if(state.view==='class'){const rows=data.classes.map(d=>({...d,total:total(d)})).sort((a,b)=>b.total-a.total);t.innerHTML=`<div class="notice">Tập thể lớp: cộng điểm chấm cho học sinh + điểm chấm tập thể + điểm Học tập từ Sổ đầu bài/điểm học sinh. Khi chọn <b>Tháng kiểm thử</b>, hệ thống cộng thêm điểm khởi điểm đúng văn bản: Học tập 200, Nề nếp 200, Lao động-CSVC 100, Tập trung 100, Đoàn-Ngoại khóa 100. Chưa áp dụng công thức bình quân tuần/xếp loại tháng chính thức.</div><div class="table-wrap"><table class="table rank-score-table"><thead><tr><th>STT</th><th>Lớp</th><th>Khối</th>${cats.map(c=>`<th>${c}</th>`).join('')}<th>Điểm</th></tr></thead><tbody>${rows.map((d,i)=>`<tr class="rank-click-row" data-detail-key="${esc(d.name)}"><td>${i+1}</td><td><b>${esc(d.name)}</b></td><td>${esc(d.grade)}</td>${cats.map(c=>`<td>${fmt(d.cats[c])}</td>`).join('')}<td><b>${fmt(d.total)}</b></td></tr>`).join('')}</tbody></table></div>`;t.querySelectorAll('.rank-click-row').forEach(r=>r.onclick=()=>openRankDetail('class',r.dataset.detailKey,data))}
    else{const byG=new Map();data.classes.forEach(d=>{if(!byG.has(d.grade))byG.set(d.grade,[]);byG.get(d.grade).push(d)});const rows=[...byG.entries()].map(([g,arr])=>{const avgCats=newCats();arr.forEach(d=>cats.forEach(c=>avgCats[c]+=Number(d.cats[c]||0)));cats.forEach(c=>avgCats[c]=arr.length?avgCats[c]/arr.length:0);return {grade:g,classes:arr.length,cats:avgCats,total:cats.reduce((a,c)=>a+avgCats[c],0)}}).sort((a,b)=>b.total-a.total);t.innerHTML=`<div class="notice">Theo khối: điểm hiển thị là <b>điểm trung bình của các lớp trong khối</b>, dùng để thử nghiệm so sánh giữa các khối. Văn bản tiêu chí chưa quy định công thức điểm riêng cho cấp khối.</div><div class="table-wrap"><table class="table rank-score-table"><thead><tr><th>STT</th><th>Khối</th><th>Số lớp</th>${cats.map(c=>`<th>${c}</th>`).join('')}<th>Điểm</th></tr></thead><tbody>${rows.map((d,i)=>`<tr class="rank-click-row" data-detail-key="${esc(d.grade)}"><td>${i+1}</td><td><b>Khối ${esc(d.grade)}</b></td><td>${d.classes}</td>${cats.map(c=>`<td>${fmt(d.cats[c])}</td>`).join('')}<td><b>${fmt(d.total)}</b></td></tr>`).join('')}</tbody></table></div>`;t.querySelectorAll('.rank-click-row').forEach(r=>r.onclick=()=>openRankDetail('grade',r.dataset.detailKey,data))}}
  body.insertAdjacentHTML('beforeend','<div id="rankDetailModal" class="rank-detail-modal hidden"></div>');
  root.querySelectorAll('.rank-view').forEach(b=>b.onclick=()=>{state.view=b.dataset.view;render()});
  const modal=root.querySelector('#rankDetailModal');
  modal.addEventListener('click',e=>{if(e.target===modal)modal.classList.add('hidden')});
  renderPeriod();render();
 }catch(e){root.querySelector('#rankBody').innerHTML=`<div class="danger-box">${esc(e.message||String(e))}</div>`}
}
