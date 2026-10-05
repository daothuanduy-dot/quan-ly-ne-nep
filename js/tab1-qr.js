/**
 * Tab 1: QR Scanner Module - Version 2.4.0
 * Kết nối Supabase:
 * 1. Trích xuất đúng 10 ký tự Mã Học Sinh.
 * 2. Truy vấn `danh_sach` lấy HoTen, Lop.
 * 3. Kiểm tra Giờ học/Buổi học của Lớp từ bảng `cai_dat_thoi_gian`.
 * 4. Kiểm tra chống quét trùng.
 * 5. Ghi vào `DiemDanhMaster`.
 */

const Tab1QR = {
    html5QrcodeScanner: null,
    isProcessing: false,
    lastScannedCode: null,
    lastScannedTime: 0,
    todayRecords: [],

    async init() {
        console.log("[Tab1QR] Khởi tạo Tab 1 (v2.4.0)...");
        await this.loadTodayDiemDanhMaster();
        this.initScanner();
    },

    initScanner() {
        if (!document.getElementById('reader') || this.html5QrcodeScanner) return;

        this.html5QrcodeScanner = new Html5QrcodeScanner(
            "reader",
            { 
                fps: 10, 
                qrbox: { width: 250, height: 250 },
                rememberLastUsedCamera: true
            },
            false
        );

        this.html5QrcodeScanner.render((decodedText) => this.handleQRScan(decodedText));
    },

    stopScanner() {
        if (this.html5QrcodeScanner) {
            this.html5QrcodeScanner.clear().catch(err => console.error(err));
            this.html5QrcodeScanner = null;
        }
    },

    async loadTodayDiemDanhMaster() {
        const countBadge = document.getElementById('scan-count');
        if (countBadge) countBadge.textContent = "Đang tải CSDL...";

        const todayStr = new Date().toISOString().split('T')[0];

        try {
            const { data, error } = await window.supabaseClient
                .from(CONFIG.TABLES.DIEM_DANH_MASTER)
                .select('*')
                .eq('ngay_diem_danh', todayStr)
                .order('thoi_gian_quet', { ascending: false });

            if (error) throw error;
            this.todayRecords = data || [];
        } catch (err) {
            console.error("[Supabase Error] Lỗi tải DiemDanhMaster:", err);
            this.todayRecords = [];
        }

        this.renderScanHistory();
    },

    /**
     * Trích xuất đúng 10 ký tự Mã Học Sinh
     */
    extractStudentId(qrText) {
        if (!qrText) return null;
        const cleanText = qrText.trim();
        if (cleanText.length === 10) return cleanText;
        const match = cleanText.match(/\b[A-Za-z0-9]{10}\b/);
        return match ? match[0] : cleanText.substring(0, 10);
    },

    getCurrentSession() {
        return new Date().getHours() < 12 ? 'Sáng' : 'Chiều';
    },

    /**
     * Logic chính Quét mã QR
     */
    async handleQRScan(decodedText) {
        const nowMs = Date.now();

        // Anti-spam Camera (Chờ 3 giây cho cùng 1 mã)
        if (this.isProcessing || (this.lastScannedCode === decodedText && (nowMs - this.lastScannedTime < 3000))) {
            return;
        }

        this.isProcessing = true;
        this.lastScannedCode = decodedText;
        this.lastScannedTime = nowMs;

        // 1. Trích xuất 10 ký tự
        const maHocSinh = this.extractStudentId(decodedText);
        if (!maHocSinh || maHocSinh.length !== 10) {
            this.showFeedbackUI(false, "MÃ QR KHÔNG HỢP LỆ!", "Mã học sinh phải chứa đúng 10 ký tự.");
            setTimeout(() => { this.isProcessing = false; }, 2000);
            return;
        }

        // 2. Truy vấn bảng `danh_sach`
        const student = await this.getStudentFromDatabase(maHocSinh);
        if (!student) {
            this.showFeedbackUI(false, "KHÔNG TÌM THẤY HỌC SINH!", `Mã HS [${maHocSinh}] không tồn tại trong bảng danh_sach.`);
            setTimeout(() => { this.isProcessing = false; }, 2500);
            return;
        }

        // 3. ĐỐI CHIẾU LỊCH HỌC TỪ BẢNG `cai_dat_thoi_gian`
        const currentSession = this.getCurrentSession(); // "Sáng" / "Chiều"
        const scheduleCheck = await this.validateClassSchedule(student.lop, currentSession);

        if (!scheduleCheck.valid) {
            this.showFeedbackUI(false, "TỪ CHỐI GHI NHẬN!", scheduleCheck.reason);
            setTimeout(() => { this.isProcessing = false; }, 3000);
            return;
        }

        // 4. Kiểm tra chống quét trùng buổi/ngày
        const todayStr = new Date().toISOString().split('T')[0];
        const isDuplicate = this.todayRecords.some(r => 
            r.ma_hoc_sinh === student.ma_hoc_sinh && 
            r.ngay_diem_danh === todayStr && 
            r.buoi === currentSession
        );

        if (isDuplicate) {
            this.showFeedbackUI(false, "CẢNH BÁO TRÙNG!", `Học sinh ${student.ho_ten} (${student.lop}) ĐÃ ĐƯỢC ĐIỂM DANH trong buổi ${currentSession}!`);
            setTimeout(() => { this.isProcessing = false; }, 2500);
            return;
        }

        // 5. Lấy cán bộ làm việc
        const currentUser = window.Auth ? window.Auth.getCurrentUser() : null;
        if (!currentUser) {
            alert("Phiên làm việc hết hạn! Vui lòng đăng nhập lại.");
            this.isProcessing = false;
            return;
        }

        const selectedRadio = document.querySelector('input[name="late_status"]:checked');
        const lateType = selectedRadio ? selectedRadio.value : "Không phép";
        const timeStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        const recordData = {
            ma_hoc_sinh: student.ma_hoc_sinh,
            ho_ten: student.ho_ten,
            lop: student.lop,
            ngay_diem_danh: todayStr,
            buoi: currentSession,
            loai_diem_danh: "Đi muộn",
            trang_thai: lateType,
            thoi_gian_quet: timeStr,
            ma_can_bo_ghi_nhan: currentUser.ma_can_bo,
            ten_can_bo_ghi_nhan: currentUser.ho_ten
        };

        // 6. Ghi Supabase
        const insertSuccess = await this.insertToDiemDanhMaster(recordData);

        if (insertSuccess) {
            this.todayRecords.unshift(recordData);
            this.updateLatestCard(recordData);
            this.renderScanHistory();
            this.showFeedbackUI(true, "ĐÃ GHI CSDL SUPABASE!", `${recordData.ho_ten} - Lớp ${recordData.lop}`);
        } else {
            this.showFeedbackUI(false, "LỖI GHI CSDL!", "Không thể chèn bản ghi vào bảng DiemDanhMaster.");
        }

        setTimeout(() => { this.isProcessing = false; }, 2000);
    },

    async getStudentFromDatabase(maHocSinh) {
        try {
            const { data, error } = await window.supabaseClient
                .from(CONFIG.TABLES.DANH_SACH)
                .select('ma_hoc_sinh, ho_ten, lop')
                .eq('ma_hoc_sinh', maHocSinh)
                .maybeSingle();

            if (error) return null;
            return data;
        } catch (err) {
            return null;
        }
    },

    /**
     * Kiểm tra thời gian học đối chiếu bảng `cai_dat_thoi_gian`
     */
    async validateClassSchedule(className, currentSession) {
        try {
            const { data, error } = await window.supabaseClient
                .from(CONFIG.TABLES.CAI_DAT_THOI_GIAN)
                .select('*')
                .eq('lop', className)
                .eq('buoi', currentSession)
                .maybeSingle();

            if (error || !data) {
                // Nếu chưa cấu hình riêng cho lớp -> Mặc định cho phép trong khung giờ chuẩn
                return { valid: true };
            }

            // 1. Nếu Lớp được cấu hình NGHỈ trong buổi này
            if (data.trang_thai === 'Nghỉ') {
                return { 
                    valid: false, 
                    reason: `Lớp ${className} được cấu hình NGHỈ HỌC trong buổi ${currentSession}!` 
                };
            }

            // 2. Kiểm tra giờ bắt đầu ghi nhận điểm danh
            const now = new Date();
            const currentMinutes = now.getHours() * 60 + now.getMinutes();

            const [startH, startM] = (data.gio_bat_dau_diem_danh || "06:45").split(':').map(Number);
            const [endH, endM] = (data.gio_ket_thuc_diem_danh || "11:30").split(':').map(Number);

            const startMinutes = startH * 60 + startM;
            const endMinutes = endH * 60 + endM;

            if (currentMinutes < startMinutes) {
                return { 
                    valid: false, 
                    reason: `Chưa đến giờ bắt đầu ghi nhận điểm danh (${data.gio_bat_dau_diem_danh}) cho lớp ${className}!` 
                };
            }

            if (currentMinutes > endMinutes) {
                return { 
                    valid: false, 
                    reason: `Đã quá thời gian điểm danh quy định (${data.gio_ket_thuc_diem_danh}) của lớp ${className}!` 
                };
            }

            return { valid: true };
        } catch (err) {
            return { valid: true };
        }
    },

    async insertToDiemDanhMaster(record) {
        try {
            const { error } = await window.supabaseClient
                .from(CONFIG.TABLES.DIEM_DANH_MASTER)
                .insert([record]);

            return !error;
        } catch (err) {
            return false;
        }
    },

    updateLatestCard(record) {
        const card = document.getElementById('latest-scan-card');
        if (!card) return;

        card.classList.remove('hidden');
        document.getElementById('scan-id').textContent = record.ma_hoc_sinh;
        document.getElementById('scan-name').textContent = record.ho_ten;
        document.getElementById('scan-class').textContent = record.lop;
        document.getElementById('scan-time').textContent = `${record.thoi_gian_quet} (${record.buoi})`;
        document.getElementById('scanned-by-tag').textContent = `Cán bộ: ${record.ten_can_bo_ghi_nhan}`;

        const typeBadge = document.getElementById('scan-type');
        typeBadge.textContent = `Đi muộn ${record.trang_thai.toUpperCase()}`;
        typeBadge.className = `text-xs px-2 py-0.5 rounded font-bold ${
            record.trang_thai === 'Có phép' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
        }`;
    },

    showFeedbackUI(isSuccess, title, detail) {
        const feedback = document.getElementById('scan-feedback');
        if (!feedback) return;

        feedback.className = `absolute inset-0 text-white flex flex-col justify-center items-center z-20 p-4 text-center transition-all duration-300 ${
            isSuccess ? 'bg-emerald-600/95' : 'bg-red-600/95'
        }`;

        feedback.innerHTML = `
            <i class="fa-solid ${isSuccess ? 'fa-circle-check animate-bounce' : 'fa-circle-xmark animate-pulse'} text-5xl mb-2"></i>
            <span class="text-lg font-bold">${title}</span>
            <span class="text-xs opacity-90 mt-1 max-w-xs">${detail}</span>
        `;

        feedback.classList.remove('hidden');
        feedback.classList.add('flex');

        setTimeout(() => {
            feedback.classList.add('hidden');
            feedback.classList.remove('flex');
        }, isSuccess ? 1800 : 2800);
    },

    renderScanHistory() {
        const tbody = document.getElementById('scan-history-tbody');
        const countBadge = document.getElementById('scan-count');
        
        if (!tbody) return;
        countBadge.textContent = `${this.todayRecords.length} học sinh`;

        if (this.todayRecords.length === 0) {
            tbody.innerHTML = `
                <tr id="empty-row">
                    <td colspan="5" class="text-center py-8 text-gray-400">
                        Chưa có dữ liệu ghi nhận đi muộn hôm nay.
                    </td>
                </tr>`;
            return;
        }

        tbody.innerHTML = this.todayRecords.map(item => `
            <tr class="hover:bg-slate-50 transition-colors">
                <td class="p-2.5 font-mono text-gray-500">
                    ${item.thoi_gian_quet} 
                    <span class="text-[10px] text-gray-400">(${item.buoi})</span>
                </td>
                <td class="p-2.5 font-bold text-gray-700">${item.ma_hoc_sinh}</td>
                <td class="p-2.5 font-medium text-gray-900">${item.ho_ten}</td>
                <td class="p-2.5 text-gray-600">${item.lop}</td>
                <td class="p-2.5 text-center">
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold ${
                        item.trang_thai === 'Có phép' 
                        ? 'bg-amber-100 text-amber-800' 
                        : 'bg-red-100 text-red-800'
                    }">
                        ${item.trang_thai}
                    </span>
                </td>
            </tr>
        `).join('');
    }
};

window.Tab1QR = Tab1QR;
