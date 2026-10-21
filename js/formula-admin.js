import {supabase} from './config.js?v=3.0.5.25.46';
import {esc,toast} from './ui.js?v=3.0.5.25.33';
import {compileFormula} from './formula-engine.js';
const operators=['+','-','*','/','%','(',')','>','<','>=','<=','=','AND(', 'OR(', 'NOT(', 'IF(', ','];
export async function showFormulaAdmin(root){
 root.innerHTML='<div class="empty">Đang tải danh mục tiêu chí...</div>';
 const {data,error}=await supabase.from('danh_muc_diem').select('ma_hd,ten_hd,mang,doi_tuong,diem').order('mang').order('ten_hd');
 if(error){root.innerHTML=`<div class="danger-box">${esc(error.message)}</div>`;return;}
 const rows=data||[],mangs=[...new Set(rows.map(x=>x.mang).filter(Boolean))];
 if(!mangs.length){root.innerHTML='<div class="notice">Chưa có tiêu chí. Hãy khai báo tiêu chí trước khi tạo công thức.</div>';return;}
 root.innerHTML=`<div class="formula-builder"><h3>🧮 Cấu hình công thức thi đua</h3><p class="muted">Chọn đối tượng và mảng để lọc tiêu chí. Kéo thả hoặc nhấn vào tiêu chí để chèn mã vào công thức. % là phần trăm (20% = 0.2).</p>
 <div class="formula-filters"><label>Đối tượng thi đua<select id="fmTarget"><option>Tập thể</option><option>Cá nhân</option></select></label><label>Mảng thi đua<select id="fmArea">${mangs.map(m=>`<option value="${esc(m)}">${esc(m)}</option>`).join('')}</select></label></div>
 <div class="formula-columns"><div class="formula-criteria"><h4>Tiêu chí thuộc mảng</h4><div id="fmCriteria" class="formula-criteria-list"></div></div><div class="formula-editor"><h4>Soạn công thức</h4><div id="fmOps" class="formula-ops">${operators.map(o=>`<button type="button" class="btn light" data-op="${esc(o)}">${esc(o)}</button>`).join('')}</div><textarea id="fmText" rows="8" spellcheck="false" placeholder="Ví dụ: 100 + [MA_TIEU_CHI] * 20%"></textarea><p class="muted">Sử dụng mã tiêu chí trong dấu [ ]. Ví dụ: IF(AND([TC01] > 3, [TC02] = 0), -10, 0). Giá trị mỗi tiêu chí khi thử tính là số lần phát sinh, có thể thay đổi thủ công.</p><div class="formula-actions"><button id="fmCheck" class="btn light">✓ Kiểm tra</button><button id="fmTest" class="btn light">🧪 Tính thử</button><button id="fmSave" class="btn primary">💾 Lưu công thức</button></div><div id="fmResult" role="status" class="formula-result"></div></div></div><h4>Giá trị dùng để tính thử</h4><div id="fmValues" class="formula-values"></div></div>`;
 const q=id=>root.querySelector('#'+id),editor=q('fmText');let saved=null;
 const subset=()=>rows.filter(r=>r.mang===q('fmArea').value&&r.doi_tuong===q('fmTarget').value);
 const insert=s=>{const a=editor.selectionStart,b=editor.selectionEnd;editor.value=editor.value.slice(0,a)+s+editor.value.slice(b);editor.focus();editor.setSelectionRange(a+s.length,a+s.length)};
 const validate=()=>compileFormula(editor.value,subset().map(r=>String(r.ma_hd)));
 const status=(s,bad=false)=>{q('fmResult').textContent=s;q('fmResult').classList.toggle('formula-error',bad)};
 function renderCriteria(){const list=subset();q('fmCriteria').innerHTML=list.length?list.map(r=>`<button type="button" draggable="true" class="formula-chip" data-code="${esc(r.ma_hd)}" title="Kéo vào ô công thức"><b>${esc(r.ten_hd)}</b><small>[${esc(r.ma_hd)}] · ${Number(r.diem)>0?'+':''}${esc(r.diem)} điểm</small></button>`).join(''):'<p class="muted">Chưa có tiêu chí cho đối tượng và mảng này.</p>';
 q('fmValues').innerHTML=list.map(r=>`<label class="formula-value-item"><span>${esc(r.ten_hd)} <small>[${esc(r.ma_hd)}]</small></span><input type="number" step="any" data-value="${esc(r.ma_hd)}" value="0"></label>`).join('');
 q('fmCriteria').querySelectorAll('[data-code]').forEach(btn=>{btn.onclick=()=>insert('['+btn.dataset.code+']');btn.ondragstart=e=>{e.dataTransfer.setData('text/plain','['+btn.dataset.code+']');e.dataTransfer.effectAllowed='copy'}})}
 async function load(){renderCriteria();status('');editor.value='';const {data,error}=await supabase.from('qlnn_cong_thuc_thi_dua').select('cong_thuc').eq('doi_tuong',q('fmTarget').value).eq('mang',q('fmArea').value).maybeSingle();if(error){status('Chưa đọc được bảng công thức. Cần chạy SQL migration trước khi lưu: '+error.message,true);return}editor.value=data?.cong_thuc||'';saved=editor.value;}
 q('fmTarget').onchange=load;q('fmArea').onchange=load;
 q('fmOps').querySelectorAll('[data-op]').forEach(b=>b.onclick=()=>insert(b.dataset.op));
 editor.addEventListener('dragover',e=>e.preventDefault());editor.addEventListener('drop',e=>{e.preventDefault();const v=e.dataTransfer.getData('text/plain');if(/^\[[^\]]+\]$/.test(v)&&subset().some(r=>'['+r.ma_hd+']'===v))insert(v)});
 q('fmCheck').onclick=()=>{try{validate();status('✓ Công thức hợp lệ.')}catch(e){status('Lỗi: '+e.message,true)}};
 q('fmTest').onclick=()=>{try{const values=Object.fromEntries([...q('fmValues').querySelectorAll('[data-value]')].map(i=>[i.dataset.value,Number(i.value)]));const n=validate()(values);status('Kết quả tính thử: '+n.toLocaleString('vi-VN')+' điểm. Chưa ghi điểm vào dữ liệu thi đua.')}catch(e){status('Không tính được: '+e.message,true)}};
 q('fmSave').onclick=async()=>{try{validate();if(!confirm('Lưu công thức cho '+q('fmTarget').value+' / '+q('fmArea').value+'?'))return;const payload={doi_tuong:q('fmTarget').value,mang:q('fmArea').value,cong_thuc:editor.value.trim()};const {data,error}=await supabase.from('qlnn_cong_thuc_thi_dua').upsert(payload,{onConflict:'doi_tuong,mang'}).select('cong_thuc').single();if(error)throw error;if(!data)throw Error('Không xác nhận được quyền ghi (RLS).');saved=editor.value;toast('Đã lưu công thức thi đua.','ok');status('✓ Đã lưu công thức. Chưa tự động áp dụng vào kết quả chấm điểm hiện có.')}catch(e){status('Không lưu được: '+e.message,true)}}};
 await load();
}
