/* Progressive Web App bootstrap; GitHub Pages subpath is /quan-ly-ne-nep/. */
(function(){
  'use strict';
  const BASE='/quan-ly-ne-nep/';
  let installPrompt=null;
  const byId=id=>document.getElementById(id);
  function message(text){
    const toast=byId('toast');
    if(toast){toast.textContent=text;toast.classList.remove('hidden');setTimeout(()=>toast.classList.add('hidden'),5000);}
    else alert(text);
  }
  if('serviceWorker' in navigator){
    window.addEventListener('load',()=>navigator.serviceWorker.register(BASE+'sw.js',{scope:BASE}).catch(err=>console.warn('[PWA] Service worker registration failed',err)));
  }
  window.addEventListener('beforeinstallprompt',event=>{
    event.preventDefault();installPrompt=event;
    [byId('installAppBtn'),byId('installAppLoginBtn')].filter(Boolean).forEach(btn=>btn.classList.remove('hidden'));
  });
  window.addEventListener('appinstalled',()=>{installPrompt=null;[byId('installAppBtn'),byId('installAppLoginBtn')].filter(Boolean).forEach(btn=>btn.classList.add('hidden'));message('Đã cài ứng dụng vào thiết bị.');});
  document.addEventListener('click',async event=>{
    const btn=event.target.closest('#installAppBtn, #installAppLoginBtn');if(!btn)return;
    if(installPrompt){installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;[byId('installAppBtn'),byId('installAppLoginBtn')].filter(Boolean).forEach(x=>x.classList.add('hidden'));return;}
    message(/iphone|ipad|ipod/i.test(navigator.userAgent)?'Trên iPhone/iPad: mở bằng Safari → Chia sẻ → Thêm vào màn hình chính.':'Nếu chưa thấy lời mời cài đặt, mở menu trình duyệt và chọn Cài đặt ứng dụng/Thêm vào màn hình chính.');
  });
  document.addEventListener('click',async event=>{
    const btn=event.target.closest('#enablePushBtn, [data-enable-push]');if(!btn)return;
    try{
      btn.disabled=true;
      const mod=await import('./pwa-push.js?v=3.0.5.25.33');
      await mod.enablePush(window.App?.Auth?.currentUser);
    }catch(err){console.error('[PWA PUSH]',err);message(err?.message||'Không thể bật thông báo đẩy.');}
    finally{btn.disabled=false;}
  });
  function ensurePortalPushButton(){
    const portal=byId('portalView');
    if(!portal||portal.classList.contains('hidden')){document.getElementById('portalPushButton')?.remove();return;}
    if(document.getElementById('portalPushButton'))return;
    const b=document.createElement('button');b.id='portalPushButton';b.type='button';b.dataset.enablePush='1';b.textContent='🔔 Bật thông báo';
    b.style.cssText='position:fixed;right:16px;bottom:calc(16px + env(safe-area-inset-bottom));z-index:9998;border:0;border-radius:999px;padding:12px 16px;background:#0f8f83;color:#fff;font-weight:700;box-shadow:0 5px 20px #163b552b;';
    document.body.appendChild(b);
  }
  const portalObserver=new MutationObserver(ensurePortalPushButton);
  document.addEventListener('DOMContentLoaded',()=>{const p=byId('portalView');if(p)portalObserver.observe(p,{attributes:true,attributeFilter:['class']});ensurePortalPushButton();});
  window.QlnnPwa={message,base:BASE};
})();
