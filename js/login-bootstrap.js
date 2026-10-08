/* QLNN V3.0.5.25.5 - login bootstrap
   Purpose: login must work even if a feature module has a separate loading error.
   This file is intentionally classic JS and does not depend on any ES module/CDN. */
(function(){
  'use strict';
  const VERSION='3.0.5.25.5';
  const SUPABASE_URL='https://vbhtgkvvmwfztswxlvnl.supabase.co';
  const SUPABASE_ANON_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZiaHRna3Z2bXdmenRzd3hsdm5sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEwMjE2MzgsImV4cCI6MjEwNjU5NzYzOH0.CqsEoBOVB4CS9UphogsIRtR1syY82kx5uzvcz_K_luo';
  const SESSION_KEY='qlnn_v30516_user';
  const REMEMBER_KEY='qlnn_v30516_username';
  const $=id=>document.getElementById(id);
  function showError(msg){const el=$('loginError');if(el)el.textContent=String(msg||'Có lỗi xảy ra.');}
  function setBusy(b){const btn=document.querySelector('#loginForm button[type="submit"]');if(btn){btn.disabled=b;btn.textContent=b?'Đang kiểm tra…':'Đăng nhập';}}
  function normalize(data){if(Array.isArray(data))data=data[0]||null;return data;}
  async function rpcLogin(username,password){
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),15000);
    try{
      const res=await fetch(SUPABASE_URL+'/rest/v1/rpc/login_can_bo?select=*',{
        method:'POST',cache:'no-store',credentials:'omit',
        headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ANON_KEY,'Content-Type':'application/json','Accept':'application/json','Prefer':'return=representation','X-Client-Info':'qlnn/'+VERSION},
        body:JSON.stringify({p_ma_cb:username,p_mat_khau:password}),signal:controller.signal
      });
      const raw=await res.text();
      let body=null;try{body=raw?JSON.parse(raw):null}catch{}
      if(!res.ok){
        const detail=body?.message||body?.hint||body?.details||body?.error_description||raw;
        if(res.status===404)return {ok:false,message:'Không tìm thấy RPC login_can_bo (HTTP 404). Hãy chạy lại SQL 015_v3_0_5_14_fix_login.sql trên đúng project Supabase.'};
        if(res.status===401||res.status===403)return {ok:false,message:`Supabase từ chối quyền gọi RPC (HTTP ${res.status}). Hãy kiểm tra GRANT EXECUTE cho anon.`};
        if(res.status===400)return {ok:false,message:`RPC login_can_bo trả HTTP 400: ${detail||'tham số hoặc chữ ký hàm không khớp.'}`};
        return {ok:false,message:`Supabase HTTP ${res.status}: ${detail||'không xác định'}`};
      }
      const data=normalize(body);
      if(!data)return {ok:false,message:'RPC đã phản hồi nhưng không có tài khoản phù hợp. Kiểm tra mã cán bộ, mật khẩu và trạng thái tài khoản.'};
      return {ok:true,user:data};
    }catch(err){
      if(err&&err.name==='AbortError')return {ok:false,message:'Supabase không phản hồi sau 15 giây. Kiểm tra mạng hoặc trạng thái Supabase.'};
      return {ok:false,message:'Không thể kết nối tới Supabase: '+(err?.message||String(err))};
    }finally{clearTimeout(timer)}
  }
  async function loadApp(){
    try{
      await import('./app.js?v='+VERSION);
    }catch(err){
      console.error('[QLNN APP LOAD]',err);
      $('loginView')?.classList.remove('hidden');
      $('appView')?.classList.add('hidden');
      showError('Đăng nhập thành công nhưng không tải được ứng dụng: '+(err?.message||String(err))+' | Hãy mở Console để xem file/module lỗi.');
      throw err;
    }
  }
  function setup(){
    const remembered=localStorage.getItem(REMEMBER_KEY)||'';
    if($('username'))$('username').value=remembered;
    if($('rememberMe'))$('rememberMe').checked=!!remembered;
    $('togglePassword')?.addEventListener('click',function(){const i=$('password');if(!i)return;const show=i.type==='password';i.type=show?'text':'password';this.textContent=show?'🙈':'👁';});
    $('loginForm')?.addEventListener('submit',async function(e){
      e.preventDefault();showError('');
      const username=String($('username')?.value||'').trim();const password=String($('password')?.value||'');
      if(!username||!password){showError('Vui lòng nhập đầy đủ mã cán bộ và mật khẩu.');return;}
      setBusy(true);
      const result=await rpcLogin(username,password);
      if(!result.ok){setBusy(false);showError(result.message);return;}
      sessionStorage.setItem(SESSION_KEY,JSON.stringify(result.user));
      if($('rememberMe')?.checked)localStorage.setItem(REMEMBER_KEY,username);else localStorage.removeItem(REMEMBER_KEY);
      try{await loadApp();}finally{setBusy(false);}
    });
    const saved=sessionStorage.getItem(SESSION_KEY);
    if(saved){
      try{JSON.parse(saved);loadApp().catch(()=>{});}catch{sessionStorage.removeItem(SESSION_KEY);}
    }
  }
  window.QlnnLogin={version:VERSION,rpcLogin,loadApp};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});else setup();
})();
