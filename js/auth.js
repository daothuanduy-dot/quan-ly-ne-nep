import {supabase,appConfig,normalizeTabs,isAdminStaff} from './config.js';

const SESSION_KEY='qlnn_v30516_user';
const REMEMBER_KEY='qlnn_v30516_username';

const norm=d=>d?{
 ma_cb:String(d.ma_cb??'').trim(),
 ho_ten:d.ho_ten??'',
 vai_tro:d.vai_tro??'',
 vai_tro_list:Array.isArray(d.vai_tro_list)?d.vai_tro_list:normalizeTabs(d.vai_tro_list),
 lop_quan_ly:d.lop_quan_ly??'',
 lop_giang_day:d.lop_giang_day??[],
 ma_hs:d.ma_hs??'',
 loai_quan_ly_lop:d.loai_quan_ly_lop??'',
 quyen_tabs:normalizeTabs(d.quyen_tabs),
 trang_thai:d.trang_thai
}:null;

function formatRpcError(status, body){
  let msg='';
  try{ const j=typeof body==='string'?JSON.parse(body):body; msg=j?.message||j?.hint||j?.details||j?.error_description||''; }catch{}
  if(status===404) return 'Không tìm thấy hàm đăng nhập login_can_bo trên Supabase. Hãy chạy SQL 015_v3_0_5_13_fix_login.sql.';
  if(status===401||status===403) return 'Supabase từ chối quyền gọi hàm đăng nhập (401/403). Hãy kiểm tra GRANT EXECUTE cho anon.';
  return msg || `Lỗi máy chủ Supabase (HTTP ${status}).`;
}

export const Auth={
 currentUser:null,

 async login(ma,pw,remember=false){
  const username=String(ma??'').trim();
  const password=String(pw??'');
  if(!username||!password)return{ok:false,message:'Vui lòng nhập đầy đủ mã cán bộ và mật khẩu.'};

  try{
    // Gọi trực tiếp PostgREST RPC để tránh lỗi cache/schema của thư viện phía trình duyệt
    // và để nhận được mã lỗi rõ ràng khi Supabase từ chối yêu cầu.
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),15000);
    let res;
    try{
      res=await fetch(`${appConfig.supabaseUrl}/rest/v1/rpc/login_can_bo`,{
        method:'POST',
        headers:{
          apikey:appConfig.supabaseAnonKey,
          Authorization:`Bearer ${appConfig.supabaseAnonKey}`,
          'Content-Type':'application/json',
          Accept:'application/json'
        },
        body:JSON.stringify({p_ma_cb:username,p_mat_khau:password}),
        signal:controller.signal
      });
    }finally{ clearTimeout(timer); }

    const raw=await res.text();
    if(!res.ok)return{ok:false,message:formatRpcError(res.status,raw)};
    let data=null;
    try{data=raw?JSON.parse(raw):null}catch{data=null;}
    // Một số cấu hình PostgREST có thể trả về mảng 1 phần tử.
    if(Array.isArray(data))data=data[0]??null;
    if(!data)return{ok:false,message:'Mã cán bộ hoặc mật khẩu không đúng, hoặc tài khoản đã bị khóa.'};

    this.currentUser=norm(data);
    sessionStorage.setItem(SESSION_KEY,JSON.stringify(this.currentUser));
    if(remember)localStorage.setItem(REMEMBER_KEY,username);
    else localStorage.removeItem(REMEMBER_KEY);
    return{ok:true,user:this.currentUser};
  }catch(err){
    if(err?.name==='AbortError')return{ok:false,message:'Không nhận được phản hồi từ Supabase sau 15 giây. Kiểm tra kết nối Internet hoặc trạng thái Supabase.'};
    console.error('[QLNN LOGIN]',err);
    return{ok:false,message:`Không thể kết nối Supabase: ${err?.message||String(err)}`};
  }
 },

 restore(){
  try{this.currentUser=norm(JSON.parse(sessionStorage.getItem(SESSION_KEY)||'null'));}
  catch{this.currentUser=null;}
  return this.currentUser;
 },
 logout(){this.currentUser=null;sessionStorage.removeItem(SESSION_KEY);},
 isAdmin(){return isAdminStaff(this.currentUser);},
 hasTab(k){return this.isAdmin()||normalizeTabs(this.currentUser?.quyen_tabs).includes(k);},
 remembered(){return localStorage.getItem(REMEMBER_KEY)||'';}
};
