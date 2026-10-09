import {APP_VERSION,appConfig,supabase,managedClasses,canManageAbsence,canMonitorAbsence} from './config.js?v=3.0.5.25.27';import {Auth} from './auth.js?v=3.0.5.25.27';import {toast,esc} from './ui.js?v=3.0.5.25.27';
const modules={};
async function loadFeature(k){
 if(modules[k]) return modules[k];
 const map={qr:'./qr.js',baovang:'./baovang-v25.js',chamdiem:'./chamdiem.js',thongke:'./thongke.js',xeploai:'./xeploai.js',quantri:'./admin.js',resetpw:'./reset-parent.js',notices:'./thongbao.js'};
 if(!map[k]) throw new Error('Không tìm thấy module '+k);
 modules[k]=await import(map[k]+'?v='+APP_VERSION);
 return modules[k];
}
const pages=['qr','baovang','chamdiem','thongke','xeploai','quantri','resetpw','notices'];let active='';
const $=id=>document.getElementById(id);
function renderUser(){$('yearBox').textContent=`Năm học ${appConfig.namHoc}`;const u=Auth.currentUser;$('userBox').innerHTML=u?`<div><strong>${u.ho_ten}</strong><small>${u.ma_cb} · ${u.vai_tro}</small></div>`:''}
function allowed(k){if(k==='notices'){const u=Auth.currentUser||{};const r=String(u.vai_tro||'').toLowerCase();const rs=Array.isArray(u.vai_tro_list)?u.vai_tro_list.map(x=>String(x).toLowerCase()):[];return r==='admin'||r==='quản trị hệ thống'||rs.includes('admin')||r.includes('gvcn')||r.includes('chủ nhiệm')||rs.some(x=>x.includes('gvcn')||x.includes('chủ nhiệm'));}return k==='resetpw' ? ['gvcn','giáo viên chủ nhiệm'].includes(String(Auth.currentUser?.vai_tro||'').trim().toLowerCase())||Auth.currentUser?.vai_tro_list?.some(x=>['gvcn','giáo viên chủ nhiệm'].includes(String(x).trim().toLowerCase())) : Auth.hasTab(k)}
async function open(k){if(window.__qlnnQrStop && k!=='qr'){try{await window.__qlnnQrStop();}catch(e){}} if(!allowed(k))return toast('Tài khoản chưa được cấp quyền chức năng này.','err');active=k;document.querySelectorAll('.main-tab').forEach(x=>x.classList.toggle('active',x.dataset.tab===k));pages.forEach(x=>$(`page-${x}`).classList.add('hidden'));$(`page-${k}`).classList.remove('hidden');try{const m=await loadFeature(k);const el=k==='quantri'?$('page-quantri').querySelector('#adminContent'):$(`page-${k}`);if(typeof m.init==='function')await m.init(el);}catch(err){console.error('[QLNN FEATURE]',k,err);toast(`Không thể tải chức năng ${k}: ${err?.message||String(err)}`,'err')}}
async function session(){ $('loginView').classList.add('hidden'); if(Auth.currentUser?.portalRole){$('appView').classList.add('hidden');const pv=$('portalView');pv.classList.remove('hidden');try{const m=await import('./portal.js?v='+APP_VERSION);await m.init(pv,Auth.currentUser,()=>{Auth.logout();$('portalView').classList.add('hidden');$('loginView').classList.remove('hidden');$('password').value='';});}catch(err){console.error('[QLNN PORTAL]',err);pv.innerHTML='<div class="danger-box">Không tải được cổng phụ huynh/học sinh: '+esc(err.message||err)+'</div>';}return;} $('portalView').classList.add('hidden');$('appView').classList.remove('hidden');renderUser();document.querySelectorAll('.main-tab').forEach(b=>b.classList.toggle('hidden',!allowed(b.dataset.tab)));document.querySelectorAll('.main-tab').forEach(b=>{if(b.dataset.tab==='resetpw'||b.dataset.tab==='notices')b.classList.toggle('hidden',!allowed(b.dataset.tab));});const first=pages.find(allowed);if(first)open(first);else toast('Tài khoản chưa được cấp quyền nào.','err')}
function bind(){
 $('loginForm').onsubmit=async e=>{
   e.preventDefault();
   const er=$('loginError');
   er.textContent='';
   const remember=$('rememberMe')?.checked===true;
   const loginRole=$('loginRole')?.value||'staff';
   let r;
   try{r=await Auth.login($('username').value,$('password').value,remember,loginRole);}
   catch(err){console.error('[QLNN LOGIN UNHANDLED]',err);r={ok:false,message:`Lỗi đăng nhập: ${err?.message||String(err)}`};}
   if(!r.ok){er.textContent=r.message;return;}
   session();
 };

 $('logoutBtn').onclick=()=>{Auth.logout();location.reload()};
 document.querySelectorAll('.main-tab').forEach(b=>b.onclick=()=>open(b.dataset.tab));
}
window.App={Auth,toast,open,supabase,appConfig,managedClasses,canManageAbsence,canMonitorAbsence,esc};
$('username').value=Auth.remembered();
$('rememberMe').checked=!!Auth.remembered();
bind();
if(Auth.restore())session();
console.info(`QLNN ${APP_VERSION}`,appConfig);
window.addEventListener('error',e=>console.error('[QLNN ERROR]',e.error||e.message));
window.addEventListener('unhandledrejection',e=>console.error('[QLNN PROMISE]',e.reason));
