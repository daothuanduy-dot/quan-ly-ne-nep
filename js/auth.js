import {supabase,normalizeTabs,isAdminStaff} from './config.js';
const KEY='qlnn_v304_user', REM='qlnn_v304_remember';
const norm=d=>d?{
 ma_cb:String(d.ma_cb??'').trim(),ho_ten:d.ho_ten??'',vai_tro:d.vai_tro??'',
 vai_tro_list:Array.isArray(d.vai_tro_list)?d.vai_tro_list:normalizeTabs(d.vai_tro_list),
 lop_quan_ly:d.lop_quan_ly??'',lop_giang_day:d.lop_giang_day??[],
 quyen_tabs:normalizeTabs(d.quyen_tabs),trang_thai:d.trang_thai
}:null;
export const Auth={
 currentUser:null,
 async login(ma,pw,remember=false){
  const {data,error}=await supabase.rpc('login_can_bo',{p_ma_cb:String(ma).trim(),p_mat_khau:String(pw)});
  if(error)return{ok:false,message:error.message};
  if(!data)return{ok:false,message:'Mã cán bộ hoặc mật khẩu không đúng, hoặc tài khoản bị khóa.'};
  this.currentUser=norm(data);localStorage.setItem(KEY,JSON.stringify(this.currentUser));
  if(remember)localStorage.setItem(REM,this.currentUser.ma_cb);else localStorage.removeItem(REM);
  return{ok:true,user:this.currentUser};
 },
 restore(){try{this.currentUser=norm(JSON.parse(localStorage.getItem(KEY)||'null'))}catch{this.currentUser=null}return this.currentUser},
 logout(){this.currentUser=null;localStorage.removeItem(KEY)},
 isAdmin(){return isAdminStaff(this.currentUser)},
 hasTab(k){return this.isAdmin()||normalizeTabs(this.currentUser?.quyen_tabs).includes(k)},
 remembered(){return localStorage.getItem(REM)||''}
};
