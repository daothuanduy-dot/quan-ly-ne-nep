// CẤU HÌNH KẾT NỐI SUPABASE
const SUPABASE_URL = "https://vbhtgkvvmwfztswxlvnl.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZiaHRna3Z2bXdmenRzd3hsdm5sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEwMjE2MzgsImV4cCI6MjEwNjU5NzYzOH0.CqsEoBOVB4CS9UphogsIRtR1syY82kx5uzvcz_K_luo";
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// BIẾN TOÀN CỤC
let allLopList = [];
let currentClassStudents = [];
let allStudentsList = [];
let studentFastMap = new Map();
let allDanhMucDiem = [];
let activeFilteredMasterRecords = [];
let currentUser = { ma_cb: "ADMIN", ho_ten: "Đào Thuận Duy", vai_tro: "Admin" };

// HÀM HỖ TRỢ THỜI GIAN
function getCurrentBuoi() { return new Date().getHours() < 12 ? 'Sáng' : 'Chiều'; }
function parseLocalDateStr(dateStr) {
  if (!dateStr) return new Date();
  const parts = dateStr.split('-');
  return parts.length < 3 ? new Date() : new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 0, 0, 0);
}
function formatDateToYYYYMMDD(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// THUẬT TOÁN SẮP XẾP TÊN VIỆT NAM (TÊN -> ĐỆM -> HỌ A-Z)
function splitVietnameseName(fullName) {
  if (!fullName) return { ho: '', dem: '', ten: '' };
  const parts = String(fullName).trim().split(/\s+/);
  if (parts.length === 1) return { ho: '', dem: '', ten: parts[0] };
  const ten = parts[parts.length - 1];
  const ho = parts[0];
  const dem = parts.slice(1, parts.length - 1).join(' ');
  return { ho, dem, ten };
}

function compareVietnameseNamesAsc(aName, bName) {
  const nameA = splitVietnameseName(aName);
  const nameB = splitVietnameseName(bName);
  let cmpTen = nameA.ten.localeCompare(nameB.ten, 'vi');
  if (cmpTen !== 0) return cmpTen;
  let cmpDem = nameA.dem.localeCompare(nameB.dem, 'vi');
  if (cmpDem !== 0) return cmpDem;
  return nameA.ho.localeCompare(nameB.ho, 'vi');
}

// THUẬT TOÁN TÌM KIẾM CHỮ CÁI ĐẦU (INITIALS: dtd -> Đào Thuận Duy)
function removeAccents(str) {
  if (!str) return '';
  return String(str).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase();
}
function getInitials(str) {
  if (!str) return '';
  return removeAccents(str).split(/\s+/).map(w => w[0]).join('');
}
function matchSearchKeyword(sourceText, keyword) {
  if (!keyword) return true;
  const cleanSource = removeAccents(sourceText);
  const cleanKw = removeAccents(keyword).trim();
  const initials = getInitials(sourceText);
  return cleanSource.includes(cleanKw) || initials.includes(cleanKw.replace(/\s+/g, ''));
}

// LỚP HỌC & HỌC SINH BASE
async function fetchAllStudents() {
  try {
    const { data } = await _supabase.from('hoc_sinh').select('*');
    allStudentsList = [];
    studentFastMap.clear();

    (data || []).forEach(s => {
      const cleanMa = String(s.ma_hs || s.ma_hoc_sinh || s.id || '').trim();
      const cleanLop = String(s.ten_lop || s.lop || s.lop_ten || '').trim();
      const cleanKhoi = String(s.khoi_id || s.khoi || (cleanLop ? cleanLop.match(/\d+/)?.[0] : '10')).trim();

      const item = { ma_hs: cleanMa, ho_ten: String(s.ho_ten || s.ten || '').trim(), ten_lop: cleanLop, khoi_id: cleanKhoi, ngay_sinh: s.ngay_sinh || '' };
      if (cleanMa) {
        allStudentsList.push(item);
        studentFastMap.set(cleanMa, item);
      }
    });

    allStudentsList.sort((a, b) => compareVietnameseNamesAsc(a.ho_ten, b.ho_ten));
  } catch (e) {}
}

async function fetchAllClasses() {
  try {
    let { data } = await _supabase.from('lop').select('ten_lop, khoi_id').order('ten_lop', { ascending: true });
    if (!data || data.length === 0) {
      const resHS = await _supabase.from('hoc_sinh').select('ten_lop, lop, khoi_id');
      data = resHS.data || [];
    }

    const classMap = new Map();
    (data || []).forEach(item => {
      const cleanLop = String(item.ten_lop || item.lop || '').trim();
      if (!cleanLop) return;
      const detectedKhoi = cleanLop.match(/\d+/)?.[0] || '10';
      if (!classMap.has(cleanLop)) classMap.set(cleanLop, { ten_lop: cleanLop, khoi_id: detectedKhoi });
    });

    allLopList = Array.from(classMap.values()).sort((a, b) => a.ten_lop.localeCompare(b.ten_lop, 'vi', { numeric: true }));

    populateLopDropdown('bv-khoi', 'bv-lop');
    populateLopDropdown('cd-khoi', 'cd-lop');
    populateLopDropdown('tk-khoi', 'tk-lop');
    
    const sdbLop = document.getElementById('sdb-lop');
    if (sdbLop) { sdbLop.innerHTML = '<option value="">-- Chọn Lớp --</option>'; allLopList.forEach(c => sdbLop.innerHTML += `<option value="${c.ten_lop}">${c.ten_lop}</option>`); }
  } catch (err) {}
}

function populateLopDropdown(khoiSelectId, lopSelectId) {
  const khoiVal = document.getElementById(khoiSelectId)?.value.trim() || '';
  const lopSelect = document.getElementById(lopSelectId);
  if (!lopSelect) return;
  lopSelect.innerHTML = '<option value="">-- Chọn Lớp --</option>';
  allLopList.filter(item => !khoiVal || item.khoi_id === khoiVal || item.ten_lop.startsWith(khoiVal))
    .forEach(item => lopSelect.innerHTML += `<option value="${item.ten_lop}">${item.ten_lop}</option>`);
}

function switchTab(index) {
  document.querySelectorAll('.tab-btn').forEach((btn, i) => btn.classList.toggle('active', i === index));
  document.querySelectorAll('.tab-content').forEach((c, i) => c.classList.toggle('hidden', i !== index));
  if (index === 3 && typeof renderFullStatistics === 'function') renderFullStatistics();
  if (index !== 0 && typeof stopQRScanner === 'function') stopQRScanner();
}

function performCanBoLogin() { document.getElementById('login-overlay').classList.add('hidden'); }
function handleLogout() { if (confirm("Đăng xuất hệ thống?")) window.location.reload(); }