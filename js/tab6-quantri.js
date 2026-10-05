/**
 * Tab 6: Quản Trị Hệ Thống Module - Version 2.4.0
 * Xây dựng Subtab Thời Khóa Biểu & Cấu hình Thời gian học cho từng Lớp/Khối/Buổi
 */

const Tab6QuanTri = {
    classList: [],
    scheduleData: {}, // HashMap lưu cấu hình thời gian học của các lớp

    async init() {
        console.log("[Tab6QuanTri] Khởi tạo Tab 6 (v2.4.0)...");
        this.switchSubTab(1);
    },

    switchSubTab(subTabIndex) {
        for (let i = 1; i <= 3; i++) {
            const btn = document.getElementById(`subtab-btn-${i}`);
            const content = document.getElementById(`subtab-content-${i}`);
            if (!btn || !content) continue;

            if (i === subTabIndex) {
                content.classList.remove('hidden');
                btn.classList.add('border-blue-600', 'text-blue-600');
                btn.classList.remove('border-transparent', 'text-gray-500');
            } else {
                content.classList.add('hidden');
                btn.classList.remove('border-blue-600', 'text-blue-600');
                btn.classList.add('border-transparent', 'text-gray-500');
            }
        }

        if (subTabIndex === 1) {
            this.loadScheduleData();
        }
    },

    /**
     * Tải danh sách Lớp từ `danh_sach` và Cấu hình Thời gian từ `cai_dat_thoi_gian`
     */
    async loadScheduleData() {
        const container = document.getElementById('schedule-cards-container');
        const selectedGrade = document.getElementById('tkb-grade-filter').value;

        container.innerHTML = `
            <div class="text-center py-12 text-gray-400">
                <i class="fa-solid fa-spinner fa-spin text-3xl mb-2"></i>
                <p>Đang truy vấn Supabase bảng danh_sach & cai_dat_thoi_gian...</p>
            </div>`;

        try {
            // 1. Truy vấn danh sách các lớp duy nhất từ bảng `danh_sach`
            let queryDS = window.supabaseClient.from(CONFIG.TABLES.DANH_SACH).select('lop, khoi');
            if (selectedGrade !== 'ALL') {
                queryDS = queryDS.eq('khoi', selectedGrade);
            }

            const { data: dsData, error: dsError } = await queryDS;

            if (dsError) throw dsError;

            // Loại bỏ các tên lớp trùng lặp
            const classMap = new Map();
            if (dsData && dsData.length > 0) {
                dsData.forEach(item => {
                    if (item.lop && !classMap.has(item.lop)) {
                        const khoiCalculated = item.khoi || item.lop.substring(0, 2);
                        classMap.set(item.lop, khoiCalculated);
                    }
                });
            } else {
                // Fallback danh sách lớp mẫu nếu CSDL `danh_sach` chưa có dữ liệu
                const defaultClasses = selectedGrade === '10' ? ['10A1', '10A2', '10A3'] :
                                       selectedGrade === '11' ? ['11A1', '11A2', '11A3'] :
                                       selectedGrade === '12' ? ['12A1', '12A2', '12A3'] :
                                       ['10A1', '10A2', '11A1', '11A2', '12A1', '12A2'];
                defaultClasses.forEach(c => classMap.set(c, c.substring(0, 2)));
            }

            this.classList = Array.from(classMap.entries()).map(([lop, khoi]) => ({ lop, khoi }));

            // 2. Truy vấn cấu hình thời gian học từ bảng `cai_dat_thoi_gian`
            const { data: scheduleRows, error: schedError } = await window.supabaseClient
                .from(CONFIG.TABLES.CAI_DAT_THOI_GIAN)
                .select('*');

            if (!schedError && scheduleRows) {
                this.scheduleData = {};
                scheduleRows.forEach(row => {
                    const key = `${row.lop}_${row.buoi}`;
                    this.scheduleData[key] = row;
                });
            }

            this.renderScheduleTable();
        } catch (err) {
            console.error("[Tab6QuanTri Error] Lỗi tải cấu hình:", err);
            container.innerHTML = `
                <div class="bg-red-50 text-red-600 p-4 rounded-xl border border-red-200 text-center text-sm font-semibold">
                    Lỗi kết nối CSDL Supabase: ${err.message}
                </div>`;
        }
    },

    /**
     * Render Giao diện Danh sách Cấu hình Thời gian từng Lớp
     */
    renderScheduleTable() {
        const container = document.getElementById('schedule-cards-container');

        if (this.classList.length === 0) {
            container.innerHTML = `<div class="text-center py-8 text-gray-400">Không tìm thấy lớp học nào thuộc khối này.</div>`;
            return;
        }

        container.innerHTML = this.classList.map((item, index) => {
            const sangData = this.scheduleData[`${item.lop}_Sáng`] || {
                trang_thai: 'Học',
                tu_tiet: 1,
                den_tiet: 5,
                gio_bat_dau_diem_danh: '06:45',
                gio_ket_thuc_diem_danh: '11:30'
            };

            const chieuData = this.scheduleData[`${item.lop}_Chiều`] || {
                trang_thai: 'Nghỉ',
                tu_tiet: 1,
                den_tiet: 5,
                gio_bat_dau_diem_danh: '12:45',
                gio_ket_thuc_diem_danh: '17:00'
            };

            return `
            <div class="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                <div class="flex flex-wrap justify-between items-center border-b border-gray-100 pb-3 mb-4 gap-2">
                    <div class="flex items-center gap-3">
                        <span class="bg-blue-600 text-white font-bold text-sm px-3 py-1 rounded-lg">Lớp ${item.lop}</span>
                        <span class="bg-slate-100 text-slate-700 text-xs font-semibold px-2 py-0.5 rounded border border-slate-200">Khối ${item.khoi}</span>
                    </div>

                    <button onclick="Tab6QuanTri.saveSingleClassSchedule('${item.lop}', '${item.khoi}', ${index})" class="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg transition flex items-center gap-1 shadow-sm">
                        <i class="fa-solid fa-check"></i> Lưu Cấu Hình Lớp
                    </button>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <!-- BUỔI SÁNG -->
                    <div class="bg-amber-50/50 border border-amber-200 rounded-xl p-4 space-y-3">
                        <div class="flex justify-between items-center border-b border-amber-200/60 pb-2">
                            <span class="font-bold text-amber-900 text-sm flex items-center gap-1.5">
                                <i class="fa-solid fa-sun text-amber-500"></i> BUỔI SÁNG
                            </span>
                            <select id="status_${index}_sang" onchange="Tab6QuanTri.togglePeriodInputs(${index}, 'sang')" class="bg-white border border-amber-300 text-xs font-bold text-gray-800 rounded px-2 py-1 outline-none">
                                <option value="Học" ${sangData.trang_thai === 'Học' ? 'selected' : ''}>HỌC</option>
                                <option value="Nghỉ" ${sangData.trang_thai === 'Nghỉ' ? 'selected' : ''}>NGHỈ</option>
                            </select>
                        </div>

                        <div id="panel_${index}_sang" class="space-y-3 ${sangData.trang_thai === 'Nghỉ' ? 'opacity-40 pointer-events-none' : ''}">
                            <div class="flex items-center gap-2 text-xs">
                                <span class="text-gray-600 font-semibold min-w-[70px]">Tiết học:</span>
                                <span>Từ tiết</span>
                                <select id="tu_${index}_sang" class="border rounded bg-white px-2 py-1 text-xs">
                                    ${[1,2,3,4,5].map(t => `<option value="${t}" ${sangData.tu_tiet == t ? 'selected':''}>${t}</option>`).join('')}
                                </select>
                                <span>đến tiết</span>
                                <select id="den_${index}_sang" class="border rounded bg-white px-2 py-1 text-xs">
                                    ${[1,2,3,4,5].map(t => `<option value="${t}" ${sangData.den_tiet == t ? 'selected':''}>${t}</option>`).join('')}
                                </select>
                            </div>

                            <div class="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                    <label class="block text-gray-500 text-[11px] mb-0.5">Giờ BĐ điểm danh:</label>
                                    <input type="time" id="start_${index}_sang" value="${sangData.gio_bat_dau_diem_danh || '06:45'}" class="w-full border rounded px-2 py-1 bg-white font-mono font-bold text-gray-800">
                                </div>
                                <div>
                                    <label class="block text-gray-500 text-[11px] mb-0.5">Giờ KT điểm danh:</label>
                                    <input type="time" id="end_${index}_sang" value="${sangData.gio_ket_thuc_diem_danh || '11:30'}" class="w-full border rounded px-2 py-1 bg-white font-mono text-gray-800">
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- BUỔI CHIỀU -->
                    <div class="bg-indigo-50/50 border border-indigo-200 rounded-xl p-4 space-y-3">
                        <div class="flex justify-between items-center border-b border-indigo-200/60 pb-2">
                            <span class="font-bold text-indigo-900 text-sm flex items-center gap-1.5">
                                <i class="fa-solid fa-moon text-indigo-500"></i> BUỔI CHIỀU
                            </span>
                            <select id="status_${index}_chieu" onchange="Tab6QuanTri.togglePeriodInputs(${index}, 'chieu')" class="bg-white border border-indigo-300 text-xs font-bold text-gray-800 rounded px-2 py-1 outline-none">
                                <option value="Học" ${chieuData.trang_thai === 'Học' ? 'selected' : ''}>HỌC</option>
                                <option value="Nghỉ" ${chieuData.trang_thai === 'Nghỉ' ? 'selected' : ''}>NGHỈ</option>
                            </select>
                        </div>

                        <div id="panel_${index}_chieu" class="space-y-3 ${chieuData.trang_thai === 'Nghỉ' ? 'opacity-40 pointer-events-none' : ''}">
                            <div class="flex items-center gap-2 text-xs">
                                <span class="text-gray-600 font-semibold min-w-[70px]">Tiết học:</span>
                                <span>Từ tiết</span>
                                <select id="tu_${index}_chieu" class="border rounded bg-white px-2 py-1 text-xs">
                                    ${[1,2,3,4,5].map(t => `<option value="${t}" ${chieuData.tu_tiet == t ? 'selected':''}>${t}</option>`).join('')}
                                </select>
                                <span>đến tiết</span>
                                <select id="den_${index}_chieu" class="border rounded bg-white px-2 py-1 text-xs">
                                    ${[1,2,3,4,5].map(t => `<option value="${t}" ${chieuData.den_tiet == t ? 'selected':''}>${t}</option>`).join('')}
                                </select>
                            </div>

                            <div class="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                    <label class="block text-gray-500 text-[11px] mb-0.5">Giờ BĐ điểm danh:</label>
                                    <input type="time" id="start_${index}_chieu" value="${chieuData.gio_bat_dau_diem_danh || '12:45'}" class="w-full border rounded px-2 py-1 bg-white font-mono font-bold text-gray-800">
                                </div>
                                <div>
                                    <label class="block text-gray-500 text-[11px] mb-0.5">Giờ KT điểm danh:</label>
                                    <input type="time" id="end_${index}_chieu" value="${chieuData.gio_ket_thuc_diem_danh || '17:00'}" class="w-full border rounded px-2 py-1 bg-white font-mono text-gray-800">
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>`;
        }).join('');
    },

    togglePeriodInputs(index, buoi) {
        const status = document.getElementById(`status_${index}_${buoi}`).value;
        const panel = document.getElementById(`panel_${index}_${buoi}`);
        if (status === 'Nghỉ') {
            panel.classList.add('opacity-40', 'pointer-events-none');
        } else {
            panel.classList.remove('opacity-40', 'pointer-events-none');
        }
    },

    /**
     * Thu thập dữ liệu cấu hình Lớp theo Index
     */
    getFormDataByIndex(lop, khoi, index) {
        return [
            {
                lop: lop,
                khoi: khoi,
                buoi: 'Sáng',
                trang_thai: document.getElementById(`status_${index}_sang`).value,
                tu_tiet: parseInt(document.getElementById(`tu_${index}_sang`).value),
                den_tiet: parseInt(document.getElementById(`den_${index}_sang`).value),
                gio_bat_dau_diem_danh: document.getElementById(`start_${index}_sang`).value,
                gio_ket_thuc_diem_danh: document.getElementById(`end_${index}_sang`).value,
                updated_at: new Date().toISOString()
            },
            {
                lop: lop,
                khoi: khoi,
                buoi: 'Chiều',
                trang_thai: document.getElementById(`status_${index}_chieu`).value,
                tu_tiet: parseInt(document.getElementById(`tu_${index}_chieu`).value),
                den_tiet: parseInt(document.getElementById(`den_${index}_chieu`).value),
                gio_bat_dau_diem_danh: document.getElementById(`start_${index}_chieu`).value,
                gio_ket_thuc_diem_danh: document.getElementById(`end_${index}_chieu`).value,
                updated_at: new Date().toISOString()
            }
        ];
    },

    /**
     * Lưu cấu hình thời gian học của 1 Lớp cụ thể lên Supabase
     */
    async saveSingleClassSchedule(lop, khoi, index) {
        const payload = this.getFormDataByIndex(lop, khoi, index);

        try {
            const { error } = await window.supabaseClient
                .from(CONFIG.TABLES.CAI_DAT_THOI_GIAN)
                .upsert(payload, { onConflict: 'lop,buoi' });

            if (error) throw error;
            alert(`Lưu cấu hình thời gian học thành công cho Lớp ${lop}!`);
        } catch (err) {
            alert(`Lỗi lưu CSDL Supabase: ${err.message}`);
        }
    },

    /**
     * Lưu hàng loạt cấu hình tất cả các Lớp lên Supabase
     */
    async saveAllSchedules() {
        let allPayload = [];
        this.classList.forEach((item, index) => {
            const rows = this.getFormDataByIndex(item.lop, item.khoi, index);
            allPayload = allPayload.concat(rows);
        });

        if (allPayload.length === 0) return;

        try {
            const { error } = await window.supabaseClient
                .from(CONFIG.TABLES.CAI_DAT_THOI_GIAN)
                .upsert(allPayload, { onConflict: 'lop,buoi' });

            if (error) throw error;
            alert(`Đã lưu toàn bộ ${allPayload.length / 2} cấu hình lớp học thành công vào CSDL Supabase!`);
        } catch (err) {
            alert(`Lỗi lưu hàng loạt Supabase: ${err.message}`);
        }
    },

    /**
     * Áp dụng Mẫu chuẩn mặc định
     */
    applyDefaultTemplate() {
        this.classList.forEach((_, index) => {
            document.getElementById(`status_${index}_sang`).value = 'Học';
            document.getElementById(`start_${index}_sang`).value = '06:45';
            document.getElementById(`end_${index}_sang`).value = '11:30';
            this.togglePeriodInputs(index, 'sang');

            document.getElementById(`status_${index}_chieu`).value = 'Nghỉ';
            document.getElementById(`start_${index}_chieu`).value = '12:45';
            document.getElementById(`end_${index}_chieu`).value = '17:00';
            this.togglePeriodInputs(index, 'chieu');
        });
    }
};

window.Tab6QuanTri = Tab6QuanTri;
