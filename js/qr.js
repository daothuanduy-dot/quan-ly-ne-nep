import {supabase} from './config.js';import {esc,toast} from './ui.js';
let root,student=null,scanner=null,criteria=[];
export async function init(rootEl){
 root=rootEl;student=null;criteria=[];
 root.innerHTML=`<div class="page-head"><div><h2>Quét QR Đi Muộn</h2><p>QR chỉ xác định đối tượng. Thông tin học sinh hiển thị ở chế độ chỉ đọc.</p></div><span class="badge ok">Không sửa dữ liệu gốc</span></div>
 <div class="qr-layout"><div class="scanner"><div id="reader" class="scan-box"><span>Camera QR sẽ hiển thị tại đây</span></div><div class="toolbar"><input id="qrManual" placeholder="Hoặc nhập mã QR / mã học sinh"><button id="qrFind" class="btn primary">Tìm học sinh</button><button id="qrStart" class="btn light">Mở camera</button></div><div id="qrStatus"></div></div><div id="studentResult"><div class="empty">Chưa xác định học sinh.</div></div></div>`;
 root.querySelector('#qrFind').onclick=()=>findStudent(root.querySelector('#qrManual').value);
 root.querySelector('#qrStart').onclick=startScanner;
}
function extractQrValues(raw){
 const source=String(raw??'').trim();
 const values=[];
 const push=v=>{v=String(v||'').trim();if(v&&!values.includes(v))values.push(v)};
 push(source);
 try{push(decodeURIComponent(source));}catch{}
 try{
   const obj=JSON.parse(source);
   ['ma_hs','maHS','ma_qr','maQR','code','studentCode'].forEach(k=>push(obj?.[k]));
 }catch{}
 // Hỗ trợ QR dạng: "Mã HS: 3159266269 | Họ tên: ...", URL hoặc chuỗi có mã HS.
 const texts=[...values];
 for(const txt of texts){
   const m=txt.match(/(?:mã\s*hs|ma[_\s-]*hs|student\s*id|studentcode|code)\s*[:=\-]?\s*(\d{6,14})/i);
   if(m)push(m[1]);
   const nums=txt.match(/\b\d{8,14}\b/g)||[];
   nums.forEach(push);
   try{
     const u=new URL(txt,location.href);
     ['ma_hs','mahs','ma_qr','qr','code'].forEach(k=>push(u.searchParams.get(k)));
   }catch{}
 }
 return values;
}

async function findStudent(value){
 const raw=String(value||'').trim();
 if(!raw)return toast('Hãy nhập mã QR hoặc mã học sinh.','err');
 const candidates=extractQrValues(raw);
 let found=null,lastError=null;
 // Ưu tiên ma_qr nguyên bản, sau đó thử các giá trị đã chuẩn hóa và ma_hs.
 for(const q of candidates){
   const byQr=await supabase.from('danh_sach').select('id,ma_hs,ho_ten,khoi,lop,ngay_sinh,ma_qr,trang_thai,nam_hoc').eq('ma_qr',q).limit(1);
   if(byQr.error){lastError=byQr.error;continue;}
   if(byQr.data?.[0]){found=byQr.data[0];break;}
   const byHs=await supabase.from('danh_sach').select('id,ma_hs,ho_ten,khoi,lop,ngay_sinh,ma_qr,trang_thai,nam_hoc').eq('ma_hs',q).limit(1);
   if(byHs.error){lastError=byHs.error;continue;}
   if(byHs.data?.[0]){found=byHs.data[0];break;}
 }
 if(!found){
   if(lastError)return toast(`Không tìm được học sinh: ${lastError.message}`,'err');
   return toast('QR đã đọc nhưng không trích xuất được mã học sinh hợp lệ hoặc mã chưa tồn tại trong CSDL.','err');
 }
 student=found;
 const normalized=found.ma_hs||candidates.find(x=>/^\d{8,14}$/.test(x))||raw;
 root.querySelector('#qrManual').value=normalized;
 const st=root.querySelector('#qrStatus');
 if(st)st.innerHTML='<div class="badge ok">✓ Đã nhận diện học sinh từ QR</div>';
 await loadCriteria();renderStudent();
}
async function loadCriteria(){
 const {data}=await supabase.from('danh_muc_diem').select('ma_hd,ten_hd,mang,loai,diem,doi_tuong').order('mang').order('ten_hd');criteria=data||[];
}
function renderStudent(){
 const s=student;root.querySelector('#studentResult').innerHTML=`<div class="student-card"><div class="student-head"><div class="avatar">👨‍🎓</div><div><h3>${esc(s.ho_ten)}</h3><p>${esc(s.ma_hs)} · ${esc(s.lop||'')}</p></div></div>
 <div class="readonly-grid"><div class="readonly"><small>Khối</small><b>${esc(s.khoi)}</b></div><div class="readonly"><small>Lớp</small><b>${esc(s.lop)}</b></div><div class="readonly"><small>Ngày sinh</small><b>${esc(s.ngay_sinh||'')}</b></div><div class="readonly"><small>Trạng thái</small><b>${esc(s.trang_thai)}</b></div></div>
 <div class="choice-grid"><button class="choice late" data-action="late_no">⏰ Đi muộn không phép</button><button class="choice late" data-action="late_yes">📝 Đi muộn có phép</button><button class="choice plus" data-action="plus">➕ Điểm cộng</button><button class="choice minus" data-action="minus">➖ Điểm trừ</button></div><div id="qrAction"></div></div>`;
 root.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>action(b.dataset.action));
}
function action(type){
 const box=root.querySelector('#qrAction');
 if(type==='late_no'||type==='late_yes'){
  const label=type==='late_no'?'Đi muộn không phép':'Đi muộn có phép';
  box.innerHTML=`<div class="detail-box"><b>${label}</b><label>Ghi chú (không bắt buộc)<textarea id="qrNote" placeholder="Lý do/ghi chú..."></textarea></label><div class="action-row"><button id="qrSave" class="btn primary">Xác nhận ghi nhận</button><button id="qrCancel" class="btn light">Hủy</button></div></div>`;
  root.querySelector('#qrSave').onclick=()=>saveEvent(label,0,null,root.querySelector('#qrNote').value);
  return;
 }
 const wantPlus=type==='plus';
 const list=criteria.filter(x=>{const l=String(x.loai||'').toLowerCase(),d=Number(x.diem||0);return wantPlus?(d>0||l.includes('cộng')):(d<0||l.includes('phạt')||l.includes('vi phạm')||l.includes('trừ'))}).filter(x=>String(x.doi_tuong||'Cá nhân').toLowerCase().includes('cá nhân')||!x.doi_tuong);
 box.innerHTML=`<div class="detail-box"><label>${wantPlus?'Chọn nội dung điểm cộng':'Chọn nội dung điểm trừ'}<select id="criteriaSelect"><option value="">-- Chọn --</option>${list.map(x=>`<option value="${esc(x.ma_hd)}">${esc(x.ten_hd)} (${Number(x.diem)>0?'+':''}${x.diem})</option>`).join('')}</select></label><div id="criteriaInfo"></div><div class="action-row"><button id="qrSave" class="btn primary">Xác nhận ghi nhận</button><button id="qrCancel" class="btn light">Hủy</button></div></div>`;
 root.querySelector('#criteriaSelect').onchange=e=>{const c=list.find(x=>x.ma_hd===e.target.value);root.querySelector('#criteriaInfo').innerHTML=c?`<span class="badge ${Number(c.diem)>=0?'ok':'warn'}">Điểm: ${Number(c.diem)>0?'+':''}${c.diem}</span>`:''};
 root.querySelector('#qrSave').onclick=()=>{const c=list.find(x=>x.ma_hd===root.querySelector('#criteriaSelect').value);if(!c)return toast('Hãy chọn nội dung.','err');saveEvent(wantPlus?'Điểm cộng':'Điểm trừ',Number(c.diem),c.ma_hd,c.ten_hd)};
}
async function saveEvent(status,score,maHd,detail){
 const u=window.App?.Auth?.currentUser;const now=new Date();const buoi=now.getHours()<12?'Sáng':'Chiều';
 const payload={ma_hs:student.ma_hs,ho_ten:student.ho_ten,khoi:student.khoi,lop:student.lop,ngay_diem_danh:now.toISOString().slice(0,10),buoi,trang_thai:status,chi_tiet:detail||null,ma_hd:maHd||null,diem:score||0,ma_nguoi_cap_nhat:u?.ma_cb||null,ten_nguoi_cap_nhat:u?.ho_ten||null};
 const {error}=await supabase.from('diem_danh_master').insert(payload);
 if(error)return toast(`Không ghi nhận được: ${error.message}`,'err');
 toast('Đã ghi nhận thành công. Dữ liệu học sinh gốc không thay đổi.','ok');student=null;await init(root);
}
async function startScanner(){
 if(!window.Html5Qrcode)return toast('Thư viện camera QR chưa tải xong. Có thể dùng nhập mã thủ công.','err');
 if(scanner){try{await scanner.stop()}catch{}}
 scanner=new Html5Qrcode('reader');
 const st=root.querySelector('#qrStatus'); if(st)st.innerHTML='<div class="badge">Đang đọc QR...</div>';
 try{await scanner.start({facingMode:'environment'},{fps:10,qrbox:{width:240,height:240}},async decoded=>{await scanner.stop();root.querySelector('#qrManual').value=decoded;await findStudent(decoded)},()=>{})}
 catch(e){toast('Không mở được camera. Hãy kiểm tra quyền camera hoặc dùng nhập mã QR.','err')}
}
