export const appConfig={
  supabaseUrl:'https://vbhtgkvvmwfztswxlvnl.supabase.co',
  // Giữ ANON/PUBLISHABLE KEY hiện tại của bạn tại đây. KHÔNG dùng service_role.
  supabaseAnonKey:'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZiaHRna3Z2bXdmenRzd3hsdm5sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEwMjE2MzgsImV4cCI6MjEwNjU5NzYzOH0.CqsEoBOVB4CS9UphogsIRtR1syY82kx5uzvcz_K_luo',
  namHoc:'2026-2027',
  tenTruong:'THPT Lê Hồng Phong',
  classPatterns:{10:{khoi:'10',tenKhoi:'C',nextKhoi:'11',nextTenKhoi:'B'},11:{khoi:'11',tenKhoi:'B',nextKhoi:'12',nextTenKhoi:'A'},12:{khoi:'12',tenKhoi:'A',nextKhoi:null,nextTenKhoi:null}},
  enforceAdmin:false
};
export const supabase=createClient(appConfig.supabaseUrl,appConfig.supabaseAnonKey);
export async function getCurrentStaff(){
  try{const {data:{user}}=await supabase.auth.getUser();if(!user)return null;const maCb=user.user_metadata?.ma_cb||user.email?.split('@')[0];if(!maCb)return{email:user.email};const {data,error}=await supabase.from('can_bo').select('*').eq('ma_cb',maCb).maybeSingle();if(error)throw error;return data?{...data,email:user.email}:{email:user.email,ma_cb:maCb};}catch(e){console.warn('getCurrentStaff',e);return null;}
}
export async function requireAdmin(){const staff=await getCurrentStaff();if(!staff)return false;if(!appConfig.enforceAdmin)return true;const roles=[staff.vai_tro,...(staff.vai_tro_list||[])].filter(Boolean).map(x=>String(x).toLowerCase());return roles.some(x=>['admin','quantri','quản trị','quản trị hệ thống'].includes(x));}
export function normalizeClass(v){return String(v??'').trim().toUpperCase().replace(/\s+/g,'');}
export function classParts(v){const m=normalizeClass(v).match(/^(\d{2})([A-Z]?)(\d+)$/);return m?{khoi:m[1],nhom:m[2],so:m[3]}:{khoi:'',nhom:'',so:''};}
export function nextClass(v){const p=classParts(v);if(p.khoi==='10')return`11B${p.so}`;if(p.khoi==='11')return`12A${p.so}`;return v;}
export function yearShift(v,d=1){const m=String(v).match(/^(\d{4})-(\d{4})$/);if(!m)return v;const a=Number(m[1])+d;return`${a}-${a+1}`;}
