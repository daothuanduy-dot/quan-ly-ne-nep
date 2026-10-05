// Khởi tạo Supabase Client
// Thay thế SUPABASE_URL và SUPABASE_ANON_KEY bằng thông tin từ dự án Supabase của bạn
const SUPABASE_URL = 'https://vbhtgkvmwfztswxlvnl.supabase.co'; // Lấy từ Dashboard Supabase
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZiaHRna3Z2bXdmenRzd3hsdm5sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEwMjE2MzgsImV4cCI6MjEwNjU5NzYzOH0.CqsEoBOVB4CS9UphogsIRtR1syY82kx5uzvcz_K_luo';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Chuyển đổi Date object hoặc chuỗi ngày ISO sang định dạng ddmmyyyy (VD: 05102026 hoặc 05/10/2026)
 * @param {Date|string} dateInput 
 * @param {boolean} withSeparator - Có dùng dấu gạch chéo '/' hay không (Mặc định: true -> 05/10/2026)
 */
function formatDateDDMMYYYY(dateInput, withSeparator = true) {
    if (!dateInput) return '';
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '';

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();

    return withSeparator ? `${day}/${month}/${year}` : `${day}${month}${year}`;
}

/**
 * Chuyển đổi chuỗi ddmmyyyy (VD: 05/10/2026 hoặc 05102026) sang định dạng YYYY-MM-DD để lưu vào Supabase
 * @param {string} strDate 
 */
function parseDDMMYYYYToISO(strDate) {
    if (!strDate) return null;
    const cleanStr = strDate.replace(/\//g, '');
    if (cleanStr.length !== 8) return null;

    const day = cleanStr.substring(0, 2);
    const month = cleanStr.substring(2, 4);
    const year = cleanStr.substring(4, 8);

    return `${year}-${month}-${day}`;
}
