/**
 * Global Configuration & Supabase Client Init - Version 2.4.0
 */
const CONFIG = {
    VERSION: '2.4.0',
    // Cấu hình kết nối Supabase từ Anon Key của bạn
    SUPABASE_URL: 'https://vbhtgkvvmwfztswxlvnl.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZiaHRna3Z2bXdmenRzd3hsdm5sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEwMjE2MzgsImV4cCI6MjEwNjU5NzYzOH0.CqsEoBOVB4CS9UphogsIRtR1syY82kx5uzvcz_K_luo',
    TABLES: {
        CAN_BO: 'can_bo',
        DANH_SACH: 'danh_sach',
        DIEM_DANH_MASTER: 'DiemDanhMaster',
        CAI_DAT_THOI_GIAN: 'cai_dat_thoi_gian'
    }
};

// Khởi tạo Supabase Client Toàn Cục
if (window.supabase) {
    window.supabaseClient = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
} else {
    console.error("Chưa tải thư viện Supabase JS Client! Hãy kiểm tra thẻ script CDN trong index.html");
}

window.CONFIG = CONFIG;
