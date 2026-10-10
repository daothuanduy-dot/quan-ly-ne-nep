export function esc(v){return String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'","&#039;")}
export function toast(msg,type=''){const e=document.getElementById('toast');e.textContent=msg;e.className=`toast ${type}`.trim();e.classList.remove('hidden');clearTimeout(window.__toast);window.__toast=setTimeout(()=>e.classList.add('hidden'),3200)}
export function modal(title,body,actions=''){const r=document.getElementById('modalRoot');r.innerHTML=`<div class="modal-backdrop"><div class="modal"><div class="modal-head"><h3>${title}</h3><button class="btn light" data-close>✕</button></div><div>${body}</div><div class="modal-actions">${actions}</div></div></div>`;r.querySelector('[data-close]')?.addEventListener('click',closeModal);r.querySelector('.modal-backdrop')?.addEventListener('click',e=>{if(e.target.classList.contains('modal-backdrop'))closeModal()});return r.querySelector('.modal')}
export function closeModal(){document.getElementById('modalRoot').innerHTML=''}
export function formatDateVN(value, withTime=false){
 if(value===null||value===undefined||value==='')return '';
 // Parse ISO/date-only explicitly to avoid timezone shifting dates by one day.
 const raw=String(value);
 const m=raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?/);
 if(m){const date=`${m[3]}/${m[2]}/${m[1]}`;return withTime&&m[4]?`${date} ${m[4]}:${m[5]||'00'}${m[6]?':'+m[6]:''}`:date;}
 const d=new Date(value);if(Number.isNaN(d.getTime()))return raw;
 const date=new Intl.DateTimeFormat('vi-VN',{day:'2-digit',month:'2-digit',year:'numeric'}).format(d);
 return withTime?`${date} ${new Intl.DateTimeFormat('vi-VN',{hour:'2-digit',minute:'2-digit',hour12:false}).format(d)}`:date;
}
export function fmtDate(d){return formatDateVN(d)}
// Tên tiếng Việt: ưu tiên tên (từ cuối), tiếp đến tên đệm, cuối cùng họ.
export function compareVietnameseFullName(a,b){
 const parts=v=>String(v||'').trim().replace(/\s+/g,' ').split(' ').filter(Boolean);
 const key=v=>{const p=parts(v);return {family:p[0]||'',given:p.length?p[p.length-1]:'',middle:p.length>2?p.slice(1,-1).join(' '):''};};
 const x=key(a),y=key(b),cmp=(u,v)=>u.localeCompare(v,'vi',{sensitivity:'base',numeric:true});
 return cmp(x.given,y.given)||cmp(x.middle,y.middle)||cmp(x.family,y.family)||cmp(String(a||''),String(b||''));
}
