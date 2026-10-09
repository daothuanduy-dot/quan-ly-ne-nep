import {supabase,appConfig,normalizeTabs,isAdminStaff} from './config.js?v=3.0.5.25.27';

const SESSION_KEY='qlnn_v30520_user';
const REMEMBER_KEY='qlnn_v30520_username';
const ROLE_KEY='qlnn_v30520_role';

const norm=d=>d?{
 ma_cb:String(d.ma_cb??d.ma_hs??'').trim(),
 ho_ten:d.ho_ten??'',
 vai_tro:d.vai_tro??'',
 vai_tro_list:Array.isArray(d.vai_tro_list)?d.vai_tro_list:normalizeTabs(d.vai_tro_list),
 lop_quan_ly:d.lop_quan_ly??'',
 lop_giang_day:d.lop_giang_day??[],
 ma_hs:d.ma_hs??'',
 portalRole:d.portalRole??'',
 portalPassword:d.portalPassword??'',
 credentialPassword:d.credentialPassword??'',
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

 async login(ma,pw,remember=false,loginRole='staff'){
  const username=String(ma??'').trim();
  const password=String(pw??'');
  if(!username||!password)return{ok:false,message:'Vui lòng nhập đầy đủ mã tài khoản và mật khẩu.'};

  try{
    if(loginRole==='parent'||loginRole==='student'){
      const requestLogin=()=>fetch(`${appConfig.supabaseUrl}/rest/v1/rpc/login_hoc_sinh`,{
        method:'POST',cache:'no-store',credentials:'omit',
        headers:{apikey:appConfig.supabaseAnonKey,Authorization:`Bearer ${appConfig.supabaseAnonKey}`,'Content-Type':'application/json',Accept:'application/json'},
        body:JSON.stringify({p_ma_hs:username,p_mat_khau:password,p_vai_tro:loginRole})
      });
      let response=await requestLogin();
      let raw=await response.text(); let d=null; try{d=raw?JSON.parse(raw):null}catch{}
      if(!response.ok)return{ok:false,message:response.status===404?'Chưa cài đặt chức năng tài khoản phụ huynh/học sinh. Hãy chạy tệp SQL 021_v3_0_5_25_23_portal_phu_huynh_phuc_khao.sql và 022_reset_mat_khau_phu_huynh_gvcn.sql.':`Không thể đăng nhập tài khoản học sinh (HTTP ${response.status}): ${raw.slice(0,180)}`};
      if(Array.isArray(d))d=d[0]??null;
      if(typeof d==='string'){try{d=JSON.parse(d)}catch{}}
      // Retry one time when the RPC returns an empty result; helps transient cold-start/network responses.
      if(!d||!d.ma_hs){await new Promise(resolve=>setTimeout(resolve,350));response=await requestLogin();raw=await response.text();try{d=raw?JSON.parse(raw):null}catch{d=null;}if(Array.isArray(d))d=d[0]??null;if(typeof d==='string'){try{d=JSON.parse(d)}catch{}}}
      if(!response.ok)return{ok:false,message:`Không thể đăng nhập tài khoản học sinh (HTTP ${response.status}): ${raw.slice(0,180)}`};
      if(!d||!d.ma_hs)return{ok:false,message:'Không xác thực được tài khoản. Kiểm tra mã học sinh, mật khẩu đang lưu trong danh sách và trạng thái học sinh; nếu vừa đổi mật khẩu, hãy tải lại trang rồi thử lại.'};
      this.currentUser=norm({...d,ma_cb:d.ma_hs,portalRole:loginRole,portalPassword:password,vai_tro:loginRole==='parent'?'Phụ huynh học sinh':'Học sinh'});
      sessionStorage.setItem(SESSION_KEY,JSON.stringify(this.currentUser));
      if(remember){localStorage.setItem(REMEMBER_KEY,username);localStorage.setItem(ROLE_KEY,loginRole);}else{localStorage.removeItem(REMEMBER_KEY);localStorage.removeItem(ROLE_KEY);}
      return{ok:true,user:this.currentUser};
    }
    // Gọi trực tiếp PostgREST RPC; chỉ một bộ xử lý submit đăng nhập tồn tại.
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

    this.currentUser=norm({...data,credentialPassword:password});
    sessionStorage.setItem(SESSION_KEY,JSON.stringify(this.currentUser));
    if(remember){localStorage.setItem(REMEMBER_KEY,username);localStorage.setItem(ROLE_KEY,'staff');}
    else{localStorage.removeItem(REMEMBER_KEY);localStorage.removeItem(ROLE_KEY);}
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
 remembered(){return localStorage.getItem(REMEMBER_KEY)||'';},
 rememberedRole(){return localStorage.getItem(ROLE_KEY)||'staff';}
};
