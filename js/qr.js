import {supabase,appConfig} from './config.js?v=3.0.5.25.30';import {esc,toast,modal,closeModal} from './ui.js?v=3.0.5.25.30';
let root,student=null,scanner=null,criteria=[];
async function startScanner(){
 const status=root&&root.querySelector('#qrStatus');
 if(scanner){toast('Camera QR đang được mở.','err');return;}
 if(typeof window.Html5Qrcode!=='function'){
   if(status)status.innerHTML='<div class="danger-box">Không tải được thư viện quét QR. Hãy tải lại trang và kiểm tra kết nối Internet.</div>';
   return toast('Không tải được thư viện quét QR.','err');
 }
 const reader=root.querySelector('#reader');
 if(!reader)return;
 reader.innerHTML='';
 const onSuccess=async decodedText=>{
   if(!decodedText||!scanner)return;
   try{await scanner.stop();}catch(e){}
   try{scanner.clear();}catch(e){}
   scanner=null;
   if(status)status.innerHTML='<div class="badge ok">✓ Đã quét QR, đang tìm học sinh...</div>';
   await findStudent(decodedText);
 };
 const onError=()=>{};
 try{
   scanner=new window.Html5Qrcode('reader');
   const config={fps:10,qrbox:(viewfinderWidth,viewfinderHeight)=>{const side=Math.max(180,Math.min(280,Math.floor(Math.min(viewfinderWidth,viewfinderHeight)*0.68)));return {width:side,height:side};},aspectRatio:1.333334,disableFlip:false};
   let started=false;
   // Ưu tiên camera sau nhưng không dùng facingMode: exact vì một số iPhone/Safari từ chối constraint này.
   try{
     const cams=await window.Html5Qrcode.getCameras();
     const list=Array.isArray(cams)?cams:[];
     const back=list.find(c=>/back|rear|environment|sau|main/i.test(String(c.label||'')))||list[list.length-1];
     if(back){
       await scanner.start(back.id,config,onSuccess,onError);
       started=true;
     }
   }catch(e){}
   if(!started){
     await scanner.start({facingMode:{ideal:'environment'}},config,onSuccess,onError);
     started=true;
   }
   if(started&&status)status.innerHTML='<div class="badge ok">📷 Camera đang hoạt động — đưa QR vào khung quét.</div>';
 }catch(e){
   try{if(scanner){await scanner.stop();scanner.clear();}}catch(_e){}
   scanner=null;
   if(status)status.innerHTML='<div class="danger-box">Không mở được camera: '+esc(e&&e.message?e.message:String(e))+'</div>';
   toast('Không mở được camera. Hãy cho phép Safari/Chrome sử dụng camera và thử lại.','err');
 }
}

async function stopScanner(){
 if(!scanner)return;
 try{await scanner.stop();}catch(e){}
 try{scanner.clear();}catch(e){}
 scanner=null;
}

export async function init(rootEl){
 root=rootEl;student=null;criteria=[];
 window.__qlnnQrStop=stopScanner;
 root.innerHTML=`<div class="page-head"><div><h2>Quét QR thẻ HS</h2><p>QR chỉ xác định đối tượng. Thông tin học sinh hiển thị ở chế độ chỉ đọc.</p></div><span class="badge ok">Không sửa dữ liệu gốc</span></div>
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
 const u=window.App?.Auth?.currentUser;const now=new Date();const buoi=await detectCurrentSessionForQr(now);
 const allowed=await classHasSchedule(student?.lop,student?.khoi,now,buoi);
 if(!allowed){const m=modal('Không ghi nhận đi muộn',`<div class="notice warn">Lớp <b>${esc(student?.lop||'')}</b> không có lịch học <b>${esc(buoi)}</b> hôm nay theo TKB.<br>Thao tác <b>${esc(status)}</b> không hợp lệ nên <b>không ghi dữ liệu vào CSDL</b>.</div>`,`<button id="qrRejectAck" class="btn primary">Đã hiểu</button>`);m.querySelector('#qrRejectAck').onclick=closeModal;return;}
 const payload={ma_hs:student.ma_hs,ho_ten:student.ho_ten,khoi:student.khoi,lop:student.lop,ngay_diem_danh:now.toISOString().slice(0,10),buoi,trang_thai:status,chi_tiet:detail||null,ma_hd:maHd||null,diem:score||0,ma_nguoi_cap_nhat:u?.ma_cb||null,ten_nguoi_cap_nhat:u?.ho_ten||null};
 const {error}=await supabase.from('diem_danh_master').insert(payload);
 if(error)return toast(`Không ghi nhận được: ${error.message}`,'err');
 toast('Đã ghi nhận thành công. Dữ liệu học sinh gốc không thay đổi.','ok');student=null;await init(root);
}
async function detectCurrentSessionForQr(now){
 const t=now.toTimeString().slice(0,8);
 try{const q=await supabase.from('cai_dat_thoi_gian').select('buoi,gio_bat_dau_diem_danh,gio_ket_thuc_diem_danh').eq('nam_hoc',appConfig.namHoc).eq('trang_thai','Học');if(!q.error){const hit=(q.data||[]).find(x=>{const a=String(x.gio_bat_dau_diem_danh||'').slice(0,8),b=String(x.gio_ket_thuc_diem_danh||'').slice(0,8);return a&&b&&a<=t&&t<=b});if(hit?.buoi)return hit.buoi;}}catch{}
 const hm=now.getHours()*60+now.getMinutes();return hm>=14*60?'Chiều':'Sáng';
}
async function classHasSchedule(cls,grade,now,session){
 if(!cls||!session)return false;
 const dow=now.getDay(),thu=dow===0?8:dow+1;
 const q=await supabase.from('thoi_khoa_bieu').select('lop,khoi,thu,buoi,trang_thai').eq('nam_hoc',appConfig.namHoc).eq('thu',thu).eq('buoi',session).eq('trang_thai','Hoạt động');
 if(q.error)return false;
 const target=String(cls).trim(),g=String(grade||'').trim();
 return (q.data||[]).some(r=>{const l=String(r.lop||'').trim(),k=String(r.khoi||'').trim();return l===target || (!l&&k===g) || (!l&&!k);});
}
