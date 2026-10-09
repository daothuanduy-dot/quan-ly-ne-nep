/* V3.0.5.25.23: chỉ khởi tạo app một lần; Auth trong app.js là bộ xử lý đăng nhập duy nhất. */
(function(){
  'use strict';
  const REMEMBER_KEY='qlnn_v30520_username';
  const $=id=>document.getElementById(id);
  async function start(){
    const remembered=localStorage.getItem(REMEMBER_KEY)||'';
    if($('username'))$('username').value=remembered;
    if($('rememberMe'))$('rememberMe').checked=!!remembered;
    $('loginRole')?.addEventListener('change',()=>{
      const role=$('loginRole').value;
      const label=$('loginIdLabel'); const input=$('username');
      if(label){label.firstChild.textContent=role==='staff'?'Mã cán bộ':'Mã học sinh';}
      if(input){input.autocomplete='username';input.placeholder=role==='staff'?'Nhập mã cán bộ':'Nhập mã học sinh';}
    });
    $('togglePassword')?.addEventListener('click',function(){const i=$('password');if(!i)return;const show=i.type==='password';i.type=show?'text':'password';this.textContent=show?'🙈':'👁';});
    try{await import('./app.js?v=3.0.5.25.23');}
    catch(err){console.error('[QLNN APP LOAD]',err);const el=$('loginError');if(el)el.textContent='Không tải được ứng dụng: '+(err?.message||String(err));}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
