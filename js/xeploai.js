import {supabase} from './config.js';
import {esc,toast} from './ui.js';
import {roleOf} from './config.js';

async function fetchAll(factory,chunk=1000){
 const all=[];let from=0;
 while(true){const {data,error}=await factory().range(from,from+chunk-1);if(error)throw error;const rows=data||[];all.push(...rows);if(rows.length<chunk)break;from+=chunk}
 return all;
}

export async function init(root){
 const user=window.App?.Auth?.currentUser; const role=roleOf(user);
 root.innerHTML=`<div class="page-head"><div><h2>Xếp Loại & Danh Hiệu</h2><p>Tổng hợp điểm thi đua theo học sinh/lớp. Dữ liệu được tính từ lịch sử ghi nhận.</p></div><span class="badge warn">Đang hoàn thiện thuật toán xếp loại</span></div><div id="rankTools"></div><div id="rankBody" class="empty">Đang tải...</div>`;
 if(role==='GVCN') renderWeekGood(root,user);
 await loadRank(root,user);
}

async function renderWeekGood(root,user){
 const box=root.querySelector('#rankTools');
 box.innerHTML=`<div class="action-card" style="margin-bottom:16px"><div class="page-head"><div><h3 style="margin:0">🏆 Đăng ký Tuần học tốt</h3><p>Lớp chủ nhiệm: <b>${esc(user.lop_quan_ly||'Chưa phân lớp')}</b></p></div></div><div class="grid"><label>Tuần học<input id="goodWeek" type="number" min="1" max="52" placeholder="Ví dụ: 6"></label><label>Ghi chú<input id="goodNote" placeholder="Nội dung/điều kiện đăng ký"></label></div><div class="action-row"><button id="goodSave" class="btn primary">Đăng ký tuần học tốt</button></div><div id="goodStatus"></div></div>`;
 box.querySelector('#goodSave').onclick=async()=>{
  const week=Number(box.querySelector('#goodWeek').value||0),lop=String(user.lop_quan_ly||'').trim();
  if(!week||!lop)return toast('GVCN phải chọn tuần học và có lớp chủ nhiệm.','err');
  const payload={nam_hoc:'2026-2027',tuan_hoc:week,lop,ma_cb:user.ma_cb,ten_cb:user.ho_ten,trang_thai:'Đăng ký',ghi_chu:box.querySelector('#goodNote').value.trim()||null};
  const {error}=await supabase.from('tuan_hoc_tot').upsert(payload,{onConflict:'nam_hoc,tuan_hoc,lop'});
  if(error)return toast(`Không đăng ký được: ${error.message}`,'err');
  box.querySelector('#goodStatus').innerHTML='<div class="notice" style="margin-top:12px">Đã đăng ký tuần học tốt cho lớp.</div>';
  toast('Đã đăng ký Tuần học tốt.','ok');
 };
}

async function loadRank(root,user){
 try{
  const [students,events]=await Promise.all([
   fetchAll(()=>supabase.from('danh_sach').select('ma_hs,ho_ten,khoi,lop').eq('trang_thai','Active').order('id')),
   fetchAll(()=>supabase.from('diem_danh_master').select('ma_hs,ho_ten,lop,diem').order('id'))
  ]);
  const role=roleOf(user); let ss=students;
  if(role==='Cán bộ lớp'||role==='Giáo viên')ss=students.filter(x=>String(x.lop||'')===String(user.lop_quan_ly||'') || (Array.isArray(user.lop_giang_day)&&user.lop_giang_day.includes(String(x.lop||''))));
  if(role==='GVCN')ss=students.filter(x=>String(x.lop||'')===String(user.lop_quan_ly||''));
  const allowed=new Set(ss.map(x=>x.ma_hs));
  const ee=(role==='Admin'||role==='GVCN')?events:events.filter(x=>allowed.has(x.ma_hs));
  const map={};ee.forEach(x=>map[x.ma_hs]=(map[x.ma_hs]||0)+Number(x.diem||0));
  const rows=ss.map(x=>({...x,tong:map[x.ma_hs]||0})).sort((a,b)=>b.tong-a.tong).slice(0,100);
  root.querySelector('#rankBody').innerHTML=`<div class="notice">${role==='GVCN'?`Đang xem lớp chủ nhiệm <b>${esc(user.lop_quan_ly||'')}</b>.`:role==='Cán bộ lớp'?`Cán bộ lớp chỉ xem kết quả của lớp <b>${esc(user.lop_quan_ly||'')}</b>.`:role==='Giáo viên'?'Chỉ hiển thị các lớp được phân công giảng dạy.':'Quản trị viên xem toàn trường.'}</div><div class="table-wrap"><table class="table"><thead><tr><th>STT</th><th>Học sinh</th><th>Lớp</th><th>Tổng điểm</th><th>Đánh giá thử nghiệm</th></tr></thead><tbody>${rows.map((x,i)=>`<tr><td>${i+1}</td><td>${esc(x.ho_ten)}<br><small>${esc(x.ma_hs)}</small></td><td>${esc(x.lop)}</td><td><b>${x.tong>0?'+':''}${x.tong}</b></td><td>${x.tong>=10?'Tốt':x.tong>=0?'Khá':'Cần cải thiện'}</td></tr>`).join('')}</tbody></table></div>`;
 }catch(e){root.querySelector('#rankBody').innerHTML=`<div class="danger-box">${esc(e.message)}</div>`}
}
