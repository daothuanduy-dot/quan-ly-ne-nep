import {supabase,normalizeTabs,isAdminStaff} from './config.js';

const SESSION_KEY='qlnn_v30512_user';
const REMEMBER_KEY='qlnn_v30512_username';

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

export const Auth={
 currentUser:null,

 async login(ma,pw,remember=false){
  const username=String(ma??'').trim();
  const password=String(pw??'');
  const {data,error}=await supabase.rpc('login_can_bo',{
    p_ma_cb:username,
    p_mat_khau:password
  });

  if(error)return{ok:false,message:error.message};
  if(!data)return{ok:false,message:'Mã cán bộ hoặc mật khẩu không đúng, hoặc tài khoản bị khóa.'};

  this.currentUser=norm(data);

  // Không lưu mật khẩu. Chỉ lưu phiên đăng nhập trong session của tab/trình duyệt.
  sessionStorage.setItem(SESSION_KEY,JSON.stringify(this.currentUser));

  if(remember){
    localStorage.setItem(REMEMBER_KEY,username);
  }else{
    localStorage.removeItem(REMEMBER_KEY);
  }

  return{ok:true,user:this.currentUser};
 },

 restore(){
  try{
    this.currentUser=norm(JSON.parse(sessionStorage.getItem(SESSION_KEY)||'null'));
  }catch{
    this.currentUser=null;
  }
  return this.currentUser;
 },

 logout(){
  this.currentUser=null;
  sessionStorage.removeItem(SESSION_KEY);
 },

 isAdmin(){
  return isAdminStaff(this.currentUser);
 },

 hasTab(k){
  return this.isAdmin()||normalizeTabs(this.currentUser?.quyen_tabs).includes(k);
 },

 remembered(){
  return localStorage.getItem(REMEMBER_KEY)||'';
 }
};
