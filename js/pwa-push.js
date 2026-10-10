import {appConfig, supabase} from './config.js?v=3.0.5.25.36';

function decodeBase64Url(value){
  const pad='='.repeat((4-value.length%4)%4);
  const b64=(value+pad).replace(/-/g,'+').replace(/_/g,'/');
  const raw=atob(b64);return Uint8Array.from(raw,c=>c.charCodeAt(0));
}
export async function enablePush(user){
  if(!user)throw new Error('Hãy đăng nhập trước khi bật thông báo.');
  if(!('serviceWorker' in navigator)||!('PushManager' in window))throw new Error('Trình duyệt này chưa hỗ trợ Web Push. Hãy cập nhật trình duyệt hoặc dùng Chrome/Edge/Safari mới.');
  if(!appConfig.webPushPublicKey||appConfig.webPushPublicKey.includes('REPLACE_'))throw new Error('PWA đã sẵn sàng nhưng chưa cấu hình khóa VAPID. Xem README_PWA_WEB_PUSH.md và hoàn tất cấu hình máy chủ trước khi bật thông báo.');
  const permission=await Notification.requestPermission();
  if(permission!=='granted')throw new Error('Anh/chị chưa cấp quyền thông báo cho ứng dụng.');
  const reg=await navigator.serviceWorker.ready;
  let sub=await reg.pushManager.getSubscription();
  if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:decodeBase64Url(appConfig.webPushPublicKey)});
  const isPortal=!!user.portalRole;
  const role=isPortal?user.portalRole:'staff';
  const account=String(isPortal?user.ma_hs:user.ma_cb||'').trim();
  const password=isPortal?user.portalPassword:user.credentialPassword;
  if(!account||!password)throw new Error('Không lấy được thông tin phiên đăng nhập để đăng ký thiết bị. Hãy đăng xuất và đăng nhập lại.');
  const {data,error}=await supabase.rpc('qlnn_register_push_subscription',{
    p_ma_tai_khoan:account,
    p_mat_khau:password,
    p_vai_tro:role,
    p_subscription:sub.toJSON(),
    p_user_agent:navigator.userAgent.slice(0,500)
  });
  if(error)throw new Error('Không lưu được thiết bị nhận thông báo. Hãy chạy SQL 028_pwa_web_push.sql: '+error.message);
  const result=Array.isArray(data)?data[0]:data;
  if(result?.ok===false)throw new Error(result.message||'Tài khoản không được phép đăng ký nhận thông báo.');
  window.QlnnPwa?.message('Đã bật nhận thông báo trên thiết bị này.');
  return sub;
}
