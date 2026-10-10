/* V3.0.5.25.36: chỉ khởi tạo app một lần; Auth trong app.js là bộ xử lý đăng nhập duy nhất. */
(function(){
  'use strict';
  const REMEMBER_KEY='qlnn_v30520_username';
  const ROLE_KEY='qlnn_v30520_role';
  const $=id=>document.getElementById(id);
  async function start(){
    const remembered=localStorage.getItem(REMEMBER_KEY)||'';
    const rememberedRole=localStorage.getItem(ROLE_KEY)||'staff';
    if($('username'))$('username').value=remembered;
    if($('loginRole'))$('loginRole').value=rememberedRole;
    if($('rememberMe'))$('rememberMe').checked=!!remembered;
    const syncRole=()=>{const role=$('loginRole')?.value||'staff';const label=$('loginIdLabel');const input=$('username');if(label)label.firstChild.textContent=role==='staff'?'Mã cán bộ':'Mã học sinh';if(input)input.placeholder=role==='staff'?'Nhập mã cán bộ':'Nhập mã học sinh';};
    syncRole();
    $('loginRole')?.addEventListener('change',syncRole);
    $('togglePassword')?.addEventListener('click',function(){const i=$('password');if(!i)return;const show=i.type==='password';i.type=show?'text':'password';this.textContent=show?'🙈':'👁';});
    try{await import('./app.js?v=3.0.5.25.36');}
    catch(err){console.error('[QLNN APP LOAD]',err);const el=$('loginError');if(el)el.textContent='Không tải được ứng dụng: '+(err?.message||String(err));}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
