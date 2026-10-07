// js/quantri-import.js
import { supabase, appConfig } from './config.js';

const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const el=id=>document.getElementById(id);

const templateCols=['ma_hs','ho_ten','ngay_sinh','khoi','lop','mat_khau','vai_tro','ma_qr','email','lop_quan_ly','quyen_bao_vang','quyen_cham_diem','quyen_thong_ke','quyen_thong_ke_tot','quyen_quet_qr','trang_thai'];

function render(){
 el('content-import').innerHTML=`<div class="panel-pad">
   <div class="notice"><b>Quy trình:</b> tải file mẫu → nhập dữ liệu → chọn file Excel → kiểm tra → nhập vào bảng <code>danh_sach</code>. Các cột trong file mẫu bám theo cấu trúc CSDL; các cột quyền có thể nhập TRUE/FALSE hoặc 1/0.</div>
   <div class="toolbar" style="margin:15px 0"><button class="btn btn-primary" id="downloadTemplate">⬇ Tải Excel mẫu</button><label class="btn">📎 Chọn Excel <input id="excelFile" type="file" accept=".xlsx,.xls" hidden></label><button class="btn btn-success" id="importRows" disabled>✓ Nhập vào CSDL</button></div>
   <div id="fileInfo" class="hint">Chưa chọn file.</div>
   <div id="importProgress" style="display:none;margin:12px 0"><div class="progress"><span id="progressBar"></span></div><div class="hint" id="progressText"></div></div>
   <div class="table-wrap" style="margin-top:15px"><table class="data-table"><thead id="previewHead"></thead><tbody id="previewBody"></tbody></table></div>
 </div>`;
 el('downloadTemplate').onclick=downloadTemplate;
 el('excelFile').onchange=readFile;
 el('importRows').onclick=importData;
}
function downloadTemplate(){
 const sample=[Object.fromEntries(templateCols.map(c=>[c,c.startsWith('quyen_')?false:'']))];
 sample[0].khoi='10';sample[0].lop='10C1';sample[0].trang_thai='Đang học';
 const ws=XLSX.utils.json_to_sheet(sample,{header:templateCols});
 const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'danh_sach');
 XLSX.writeFile(wb,`mau_nhap_hoc_sinh_${appConfig.namHoc}.xlsx`);
}
let parsed=[];
function readFile(e){
 const file=e.target.files?.[0];if(!file)return;
 const reader=new FileReader();
 reader.onload=ev=>{
   try{
    const wb=XLSX.read(ev.target.result,{type:'array'}), ws=wb.Sheets[wb.SheetNames[0]];
    parsed=XLSX.utils.sheet_to_json(ws,{defval:''});
    renderPreview(); el('fileInfo').textContent=`${file.name}: ${parsed.length} dòng`;
    el('importRows').disabled=!parsed.length;
   }catch(err){window.ui.toast('Không đọc được file Excel: '+err.message,'error')}
 };
 reader.readAsArrayBuffer(file);
}
function bool(v){return [true,1,'1','true','TRUE','yes','YES','x','X','có','Có'].includes(v)}
function normalize(r){
 return {nam_hoc:appConfig.namHoc,ma_hs:String(r.ma_hs||'').trim(),ho_ten:String(r.ho_ten||'').trim(),ngay_sinh:r.ngay_sinh||null,khoi:String(r.khoi||'').trim(),lop:String(r.lop||'').trim().toUpperCase(),mat_khau:String(r.mat_khau||''),vai_tro:String(r.vai_tro||''),ma_qr:String(r.ma_qr||'').trim()||null,email:String(r.email||'').trim()||null,lop_quan_ly:String(r.lop_quan_ly||'').trim()||null,quyen_bao_vang:bool(r.quyen_bao_vang),quyen_cham_diem:bool(r.quyen_cham_diem),quyen_thong_ke:bool(r.quyen_thong_ke),quyen_thong_ke_tot:bool(r.quyen_thong_ke_tot),quyen_quet_qr:bool(r.quyen_quet_qr),trang_thai:String(r.trang_thai||'Đang học')};
}
function renderPreview(){
 const data=parsed.map(normalize), cols=templateCols;
 el('previewHead').innerHTML=`<tr>${cols.map(c=>`<th>${esc(c)}</th>`).join('')}</tr>`;
 el('previewBody').innerHTML=data.slice(0,100).map(r=>`<tr>${cols.map(c=>`<td>${esc(r[c])}</td>`).join('')}</tr>`).join('')||`<tr><td colspan="${cols.length}" class="empty">Không có dữ liệu.</td></tr>`;
}
async function importData(){
 const data=parsed.map(normalize).filter(r=>r.ma_hs&&r.ho_ten&&r.lop);
 if(!data.length)return window.ui.toast('Không có dòng hợp lệ. Cần tối thiểu ma_hs, ho_ten, lop.','error');
 if(!confirm(`Nhập ${data.length} học sinh vào CSDL? Nếu trùng ma_hs, bản ghi có thể bị lỗi theo ràng buộc unique.`))return;
 el('importProgress').style.display='block';el('importRows').disabled=true;
 const chunk=300;let done=0;
 for(let i=0;i<data.length;i+=chunk){
   const part=data.slice(i,i+chunk);
   const {error}=await supabase.from('danh_sach').insert(part);
   if(error){window.ui.toast(`Lỗi tại nhóm ${i+1}-${i+part.length}: ${error.message}`,'error');el('importRows').disabled=false;return}
   done+=part.length;el('progressBar').style.width=`${done/data.length*100}%`;el('progressText').textContent=`Đã nhập ${done}/${data.length}`;
 }
 window.ui.toast(`Đã nhập ${done} học sinh.`,'success');el('importRows').disabled=false;
}
export function initImport(){render()}
