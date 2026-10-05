/**
 * Tab 1: QR Scanner Module v2.3.0
 */
const Tab1QR = {
    html5QrcodeScanner: null,
    scanRecords: [],

    init() {
        this.scanRecords = JSON.parse(localStorage.getItem('late_records') || '[]');
        this.renderScanHistory();
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
            /* verbose= */ false
        );

        this.html5QrcodeScanner.render((decodedText) => this.onScanSuccess(decodedText));
    },

    stopScanner() {
        if (this.html5QrcodeScanner) {
            this.html5QrcodeScanner.clear().catch(err => console.error(err));
            this.html5QrcodeScanner = null;
        }
    },

    parseQRData(qrText) {
        try {
            return JSON.parse(qrText);
        } catch (e) {
            const parts = qrText.split('|');
            if (parts.length >= 3) {
                return {
                    studentId: parts[0].trim(),
                    name: parts[1].trim(),
                    className: parts[2].trim()
                };
            }
            return {
                studentId: qrText.substring(0, 8),
                name: "Học sinh quét mã",
                className: "K10"
            };
        }
    },

    onScanSuccess(decodedText) {
        // Lấy trạng thái đi muộn từ 2 Radio Button
        const selectedRadio = document.querySelector('input[name="late_status"]:checked');
        const lateType = selectedRadio ? selectedRadio.value : "Không phép";
        
        const studentInfo = this.parseQRData(decodedText);
        const currentUser = Auth.getCurrentUser();
        const now = new Date();
        const timeString = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        const newRecord = {
            studentId: studentInfo.studentId || "HS-UNK",
            name: studentInfo.name || "Chưa rõ tên",
            className: studentInfo.className || "K10",
            lateType: lateType, // "Có phép" hoặc "Không phép"
            time: timeString,
            date: now.toISOString().split('T')[0],
            recordedBy: currentUser ? `${currentUser.ho_ten} (${currentUser.ma_can_bo})` : "Chưa xác định"
        };

        // Lưu bản ghi
        this.scanRecords.unshift(newRecord);
        localStorage.setItem('late_records', JSON.stringify(this.scanRecords));

        // Cập nhật Thẻ hiển thị học sinh vừa quét
        document.getElementById('latest-scan-card').classList.remove('hidden');
        document.getElementById('scan-id').textContent = newRecord.studentId;
        document.getElementById('scan-name').textContent = newRecord.name;
        document.getElementById('scan-class').textContent = newRecord.className;
        document.getElementById('scan-time').textContent = newRecord.time;
        document.getElementById('scanned-by-tag').textContent = `Cán bộ: ${currentUser ? currentUser.ho_ten : '--'}`;

        const typeBadge = document.getElementById('scan-type');
        typeBadge.textContent = `Đi muộn ${newRecord.lateType.toUpperCase()}`;
        typeBadge.className = `text-xs px-2 py-0.5 rounded font-bold ${
            newRecord.lateType === 'Có phép' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
        }`;

        // Hiệu ứng Flash xác nhận
        const feedback = document.getElementById('scan-feedback');
        feedback.classList.remove('hidden');
        feedback.classList.add('flex');
        setTimeout(() => {
            feedback.classList.add('hidden');
            feedback.classList.remove('flex');
        }, 1200);

        this.renderScanHistory();
    },

    renderScanHistory() {
        const tbody = document.getElementById('scan-history-tbody');
        const countBadge = document.getElementById('scan-count');
        
        if (!tbody) return;
        countBadge.textContent = `${this.scanRecords.length} học sinh`;

        if (this.scanRecords.length === 0) {
            tbody.innerHTML = `
                <tr id="empty-row">
                    <td colspan="5" class="text-center py-8 text-gray-400">
                        Chưa có dữ liệu quét trong phiên làm việc.
                    </td>
                </tr>`;
            return;
        }

        tbody.innerHTML = this.scanRecords.map(item => `
            <tr class="hover:bg-slate-50 transition-colors">
                <td class="p-2.5 font-mono text-gray-500">${item.time}</td>
                <td class="p-2.5 font-bold text-gray-700">${item.studentId}</td>
                <td class="p-2.5 font-medium text-gray-900">${item.name}</td>
                <td class="p-2.5 text-gray-600">${item.className}</td>
                <td class="p-2.5 text-center">
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold ${
                        item.lateType === 'Có phép' 
                        ? 'bg-amber-100 text-amber-800' 
                        : 'bg-red-100 text-red-800'
                    }">
                        ${item.lateType}
                    </span>
                </td>
            </tr>
        `).join('');
    }
};

window.Tab1QR = Tab1QR;
