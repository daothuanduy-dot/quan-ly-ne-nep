import {APP_VERSION,appConfig,supabase,managedClasses,canManageAbsence,canMonitorAbsence} from './config.js';import {Auth} from './auth.js';import {toast,esc} from './ui.js';
const modules={};
async function loadFeature(k){
 if(modules[k]) return modules[k];
 const map={qr:'./qr-v24.js',baovang:'./baovang-v25.js',chamdiem:'./chamdiem.js',thongke:'./thongke.js',xeploai:'./xeploai.js',quantri:'./admin.js'};
 if(!map[k]) throw new Error('Không tìm thấy module '+k);
 modules[k]=await import(map[k]+'?v='+APP_VERSION);
 return modules[k];
}
const pages=['qr','baovang','chamdiem','thongke','xeploai','quantri'];let active='';
const $=id=>document.getElementById(id);
function renderUser(){$('yearBox').textContent=`Năm học ${appConfig.namHoc}`;const u=Auth.currentUser;$('userBox').innerHTML=u?`<div><strong>${u.ho_ten}</strong><small>${u.ma_cb} · ${u.vai_tro}</small></div>`:''}
function allowed(k){return Auth.hasTab(k)}
async function open(k){if(!allowed(k))return toast('Tài khoản chưa được cấp quyền chức năng này.','err');active=k;document.querySelectorAll('.main-tab').forEach(x=>x.classList.toggle('active',x.dataset.tab===k));pages.forEach(x=>$(`page-${x}`).classList.add('hidden'));$(`page-${k}`).classList.remove('hidden');try{const m=await loadFeature(k);const el=k==='quantri'?$('page-quantri').querySelector('#adminContent'):$(`page-${k}`);if(typeof m.init==='function')await m.init(el);}catch(err){console.error('[QLNN FEATURE]',k,err);toast(`Không thể tải chức năng ${k}: ${err?.message||String(err)}`,'err')}}
function session(){ $('loginView').classList.add('hidden');$('appView').classList.remove('hidden');renderUser();document.querySelectorAll('.main-tab').forEach(b=>b.classList.toggle('hidden',!allowed(b.dataset.tab)));const first=pages.find(allowed);if(first)open(first);else toast('Tài khoản chưa được cấp quyền nào.','err')}
function bind(){
 $('loginForm').onsubmit=async e=>{
   e.preventDefault();
   const er=$('loginError');
   er.textContent='';
   const remember=$('rememberMe')?.checked===true;
   let r;
   try{r=await Auth.login($('username').value,$('password').value,remember);}
   catch(err){console.error('[QLNN LOGIN UNHANDLED]',err);r={ok:false,message:`Lỗi đăng nhập: ${err?.message||String(err)}`};}
   if(!r.ok){er.textContent=r.message;return;}
   session();
 };
 $('togglePassword')?.addEventListener('click',()=>{
   const input=$('password');
   const btn=$('togglePassword');
   const show=input.type==='password';
   input.type=show?'text':'password';
   btn.textContent=show?'🙈':'👁';
   btn.title=show?'Ẩn mật khẩu':'Hiển thị mật khẩu';
   btn.setAttribute('aria-label',btn.title);
 });
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
