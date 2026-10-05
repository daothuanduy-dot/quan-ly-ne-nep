// Global State & Persistent Data
let academicYear = "";
let dsHocSinh = [];
let dsLop = [
    { id: "10A1", tenLop: "10A1", khoi: "10" },
    { id: "10A2", tenLop: "10A2", khoi: "10" },
    { id: "11A1", tenLop: "11A1", khoi: "11" },
    { id: "11A2", tenLop: "11A2", khoi: "11" },
    { id: "12A1", tenLop: "12A1", khoi: "12" },
    { id: "12A2", tenLop: "12A2", khoi: "12" }
];

let caHocTheoKhoi = {
    "10": { sang: true, chieu: false },
    "11": { sang: false, chieu: true },
    "12": { sang: true, chieu: true }
};

let html5QrcodeScanner = null;

// Initialize System on DOM Load
document.addEventListener("DOMContentLoaded", function () {
    initAcademicYear();
    loadLocalStorageData();
    renderSessionConfigTable();
    renderStudentList();
    initQRScanner();
});

// 1. TỰ ĐỘNG CẤU HÌNH NĂM HỌC THEO THỜI GIAN HỆ THỐNG
function initAcademicYear() {
    const storedYear = localStorage.getItem("academicYear");
    if (storedYear) {
        academicYear = storedYear;
    } else {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1; // 1 - 12
        // Tháng 8 trở đi được tính sang năm học mới (Ví dụ T10/2026 -> 2026-2027)
        if (month >= 8) {
            academicYear = `${year}-${year + 1}`;
        } else {
            academicYear = `${year - 1}-${year}`;
        }
        localStorage.setItem("academicYear", academicYear);
    }
    document.getElementById("currentAcademicYearDisplay").innerText = academicYear;
}

// 2. LOCALSTORAGE MANAGEMENT
function loadLocalStorageData() {
    const savedStudents = localStorage.getItem("dsHocSinh");
    if (savedStudents) {
        dsHocSinh = JSON.parse(savedStudents);
    } else {
        // Khởi tạo dữ liệu mẫu nếu chưa có
        dsHocSinh = [
            { id: "1", maHS: "3160986684", hoTen: "Nguyễn Mai Lan", ngaySinh: "19/06/2010", khoi: "10", tenLop: "10A1", trangThai: "Đang học" },
            { id: "2", maHS: "3160986685", hoTen: "Trần Văn An", ngaySinh: "15/08/2010", khoi: "10", tenLop: "10A1", trangThai: "Đang học" },
            { id: "3", maHS: "3160986686", hoTen: "Lê Hoàng Nam", ngaySinh: "02/03/2009", khoi: "11", tenLop: "11A1", trangThai: "Đang học" },
            { id: "4", maHS: "3160986687", hoTen: "Phạm Minh Tuấn", ngaySinh: "11/11/2008", khoi: "12", tenLop: "12A1", trangThai: "Đang học" }
        ];
        saveStudentsToStorage();
    }

    const savedCaHoc = localStorage.getItem("caHocTheoKhoi");
    if (savedCaHoc) {
        caHocTheoKhoi = JSON.parse(savedCaHoc);
    }
}

function saveStudentsToStorage() {
    localStorage.setItem("dsHocSinh", JSON.stringify(dsHocSinh));
}

function saveCaHocToStorage() {
    localStorage.setItem("caHocTheoKhoi", JSON.stringify(caHocTheoKhoi));
}

// 3. KHẮC PHỤC LỖI QUÉT MÃ QR (REGEXP EXTRACTION)
function parseQRCodeData(qrData) {
    if (!qrData) return "";
    
    // Tìm mẫu "Mã HS: <Mã_Số>" trong chuỗi
    const maHSMatch = qrData.match(/Mã HS:\s*([A-Za-z0-9_-]+)/i);
    if (maHSMatch && maHSMatch[1]) {
        return maHSMatch[1].trim();
    }

    // Trường hợp QR chỉ là mã số thuần túy
    return qrData.trim();
}

function initQRScanner() {
    html5QrcodeScanner = new Html5QrcodeScanner("reader", {
        fps: 10,
        qrbox: { width: 250, height: 250 }
    });

    html5QrcodeScanner.render(onScanSuccess, onScanFailure);
}

function onScanSuccess(decodedText) {
    const maHS = parseQRCodeData(decodedText);
    const resultBox = document.getElementById("scanResult");
    resultBox.classList.remove("hidden", "success", "error");

    const student = dsHocSinh.find(s => s.maHS === maHS && s.trangThai === "Đang học");
    const absentTypeRadio = document.querySelector('input[name="absentType"]:checked');
    const absentText = absentTypeRadio.value === "COPHEP" ? "Có phép" : "Không phép";

    if (student) {
        resultBox.classList.add("success");
        resultBox.innerHTML = `
            <strong> ĐÃ GHI NHẬN THÀNH CÔNG:</strong><br>
            - Học sinh: <strong>${student.hoTen}</strong> (Mã HS: ${student.maHS})<br>
            - Lớp: ${student.tenLop} (Khối ${student.khoi})<br>
            - Trạng thái báo vắng: <span style="color:red; font-weight:bold;">${absentText}</span>
        `;
    } else {
        resultBox.classList.add("error");
        resultBox.innerHTML = `
            <strong> KHÔNG TÌM THẤY HỌC SINH!</strong><br>
            - Mã HS tách được: <strong>"${maHS}"</strong><br>
            - Chuỗi gốc từ QR: "${decodedText}"<br>
            <em>Vui lòng kiểm tra xem Học sinh đã có trong hệ thống danh sách chưa.</em>
        `;
    }
}

function onScanFailure(error) {
    // Không làm gì để tránh tràn log console khi đang camera đang quét
}

// 4. TAB NAVIGATION CONTROLLER
function switchTab(tabId) {
    document.querySelectorAll(".nav-btn").forEach(btn => btn.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach(panel => panel.classList.remove("active"));

    event.target.classList.add("active");
    document.getElementById(tabId).classList.add("active");
}

function switchSubTab(subTabId) {
    document.querySelectorAll(".sub-btn").forEach(btn => btn.classList.remove("active"));
    document.querySelectorAll(".sub-panel").forEach(panel => panel.classList.remove("active"));

    event.target.classList.add("active");
    document.getElementById(subTabId).classList.add("active");
}

// 5. CẤU HÌNH THỜI GIAN HỌC THEO KHỐI
function renderSessionConfigTable() {
    const tbody = document.getElementById("sessionConfigTable");
    tbody.innerHTML = "";

    ["10", "11", "12"].forEach(khoi => {
        const config = caHocTheoKhoi[khoi] || { sang: true, chieu: true };
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><strong>Khối ${khoi}</strong></td>
            <td>
                <input type="checkbox" id="sang_${khoi}" ${config.sang ? "checked" : ""} onchange="updateSessionConfig('${khoi}')">
                <label for="sang_${khoi}">Học Sáng</label>
            </td>
            <td>
                <input type="checkbox" id="chieu_${khoi}" ${config.chieu ? "checked" : ""} onchange="updateSessionConfig('${khoi}')">
                <label for="chieu_${khoi}">Học Chiều</label>
            </td>
            <td>
                <span style="font-size: 12px; color: #28a745; font-weight: bold;">Cấu hình linh hoạt</span>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function updateSessionConfig(khoi) {
    const sangChecked = document.getElementById(`sang_${khoi}`).checked;
    const chieuChecked = document.getElementById(`chieu_${khoi}`).checked;

    caHocTheoKhoi[khoi] = { sang: sangChecked, chieu: chieuChecked };
    saveCaHocToStorage();
}

// 6. CHUYỂN LỚP HỌC SINH (RÀNG BUỘC CÙNG KHỐI)
function onTransferKhoiChange() {
    const selectedKhoi = document.getElementById("transferKhoiSelect").value;
    const studentSelect = document.getElementById("transferStudentSelect");
    const targetClassSelect = document.getElementById("transferTargetClassSelect");
    const btnExecute = document.getElementById("btnExecuteTransfer");

    studentSelect.innerHTML = '<option value="">-- Chọn Học Sinh --</option>';
    targetClassSelect.innerHTML = '<option value="">-- Chọn Lớp Đến --</option>';
    
    if (!selectedKhoi) {
        studentSelect.disabled = true;
        targetClassSelect.disabled = true;
        btnExecute.disabled = true;
        return;
    }

    // Lọc học sinh theo khối được chọn
    const filteredStudents = dsHocSinh.filter(s => s.khoi === selectedKhoi && s.trangThai === "Đang học");
    filteredStudents.forEach(s => {
        const option = document.createElement("option");
        option.value = s.id;
        option.innerText = `${s.hoTen} (${s.maHS}) - Lớp hiện tại: ${s.tenLop}`;
        studentSelect.appendChild(option);
    });

    studentSelect.disabled = false;
    targetClassSelect.disabled = true;
    btnExecute.disabled = true;
}

function onTransferStudentSelect() {
    const selectedStudentId = document.getElementById("transferStudentSelect").value;
    const selectedKhoi = document.getElementById("transferKhoiSelect").value;
    const targetClassSelect = document.getElementById("transferTargetClassSelect");
    const btnExecute = document.getElementById("btnExecuteTransfer");

    targetClassSelect.innerHTML = '<option value="">-- Chọn Lớp Đến --</option>';

    if (!selectedStudentId) {
        targetClassSelect.disabled = true;
        btnExecute.disabled = true;
        return;
    }

    const currentStudent = dsHocSinh.find(s => s.id === selectedStudentId);

    // CHỈ HIỂN THỊ CÁC LỚP TRONG CÙNG KHỐI HỌC
    const sameKhoiClasses = dsLop.filter(l => l.khoi === selectedKhoi && l.tenLop !== currentStudent.tenLop);

    sameKhoiClasses.forEach(l => {
        const option = document.createElement("option");
        option.value = l.tenLop;
        option.innerText = `Lớp ${l.tenLop} (Khối ${l.khoi})`;
        targetClassSelect.appendChild(option);
    });

    targetClassSelect.disabled = false;
    btnExecute.disabled = false;
}

function executeTransfer() {
    const studentId = document.getElementById("transferStudentSelect").value;
    const newClassName = document.getElementById("transferTargetClassSelect").value;

    const student = dsHocSinh.find(s => s.id === studentId);
    if (!student || !newClassName) return;

    const oldClassName = student.tenLop;
    student.tenLop = newClassName;

    saveStudentsToStorage();
    renderStudentList();
    
    alert(`Đã chuyển học sinh ${student.hoTen} từ lớp ${oldClassName} sang lớp ${newClassName} thành công!`);
    
    // Reset form chuyển lớp
    document.getElementById("transferKhoiSelect").value = "";
    onTransferKhoiChange();
}

// 7. SUBTAB QUẢN LÝ HỌC SINH (CRUD & IMPORT/EXPORT EXCEL)
function renderStudentList() {
    const tbody = document.getElementById("studentListTable");
    tbody.innerHTML = "";

    const filterKhoi = document.getElementById("filterKhoi").value;
    const filterSearch = document.getElementById("filterSearch").value.toLowerCase().trim();

    const filtered = dsHocSinh.filter(s => {
        let matchKhoi = true;
        if (filterKhoi === "GRADUATED") {
            matchKhoi = s.trangThai === "Đã tốt nghiệp";
        } else if (filterKhoi !== "ALL") {
            matchKhoi = s.khoi === filterKhoi && s.trangThai === "Đang học";
        }

        let matchSearch = true;
        if (filterSearch) {
            matchSearch = s.hoTen.toLowerCase().includes(filterSearch) || s.maHS.toLowerCase().includes(filterSearch);
        }

        return matchKhoi && matchSearch;
    });

    filtered.forEach(s => {
        const tr = document.createElement("tr");
        const statusBadge = s.trangThai === "Đang học" 
            ? `<span class="status-badge active">Đang học</span>` 
            : `<span class="status-badge graduated">Đã tốt nghiệp</span>`;

        tr.innerHTML = `
            <td><strong>${s.maHS}</strong></td>
            <td>${s.hoTen}</td>
            <td>${s.ngaySinh || "N/A"}</td>
            <td>Khối ${s.khoi}</td>
            <td>${s.tenLop}</td>
            <td>${statusBadge}</td>
            <td>
                <button class="btn btn-info" style="padding:4px 8px; font-size:12px;" onclick="openEditStudentModal('${s.id}')">Sửa</button>
                <button class="btn btn-danger" style="padding:4px 8px; font-size:12px;" onclick="deleteStudent('${s.id}')">Xóa</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function openAddStudentModal() {
    document.getElementById("modalTitle").innerText = "Thêm Học Sinh Mới";
    document.getElementById("studentEditId").value = "";
    document.getElementById("inputMaHS").value = "";
    document.getElementById("inputHoTen").value = "";
    document.getElementById("inputNgaySinh").value = "";
    document.getElementById("inputKhoi").value = "10";
    
    onModalKhoiChange();
    document.getElementById("studentModal").classList.remove("hidden");
}

function openEditStudentModal(id) {
    const student = dsHocSinh.find(s => s.id === id);
    if (!student) return;

    document.getElementById("modalTitle").innerText = "Chỉnh Sửa Thông Tin Học Sinh";
    document.getElementById("studentEditId").value = student.id;
    document.getElementById("inputMaHS").value = student.maHS;
    document.getElementById("inputHoTen").value = student.hoTen;
    document.getElementById("inputNgaySinh").value = student.ngaySinh;
    document.getElementById("inputKhoi").value = student.khoi;

    onModalKhoiChange();
    document.getElementById("inputLop").value = student.tenLop;

    document.getElementById("studentModal").classList.remove("hidden");
}

function onModalKhoiChange() {
    const khoi = document.getElementById("inputKhoi").value;
    const selectLop = document.getElementById("inputLop");
    selectLop.innerHTML = "";

    const filteredClasses = dsLop.filter(l => l.khoi === khoi);
    filteredClasses.forEach(l => {
        const option = document.createElement("option");
        option.value = l.tenLop;
        option.innerText = l.tenLop;
        selectLop.appendChild(option);
    });
}

function closeStudentModal() {
    document.getElementById("studentModal").classList.add("hidden");
}

function saveStudentForm(e) {
    e.preventDefault();

    const editId = document.getElementById("studentEditId").value;
    const maHS = document.getElementById("inputMaHS").value.trim();
    const hoTen = document.getElementById("inputHoTen").value.trim();
    const ngaySinh = document.getElementById("inputNgaySinh").value.trim();
    const khoi = document.getElementById("inputKhoi").value;
    const tenLop = document.getElementById("inputLop").value;

    if (editId) {
        // Cập nhật
        const index = dsHocSinh.findIndex(s => s.id === editId);
        if (index !== -1) {
            dsHocSinh[index] = { ...dsHocSinh[index], maHS, hoTen, ngaySinh, khoi, tenLop };
        }
    } else {
        // Thêm mới
        const duplicate = dsHocSinh.find(s => s.maHS === maHS);
        if (duplicate) {
            alert("Mã HS này đã tồn tại trong hệ thống!");
            return;
        }

        const newStudent = {
            id: Date.now().toString(),
            maHS,
            hoTen,
            ngaySinh,
            khoi,
            tenLop,
            trangThai: "Đang học"
        };
        dsHocSinh.push(newStudent);
    }

    saveStudentsToStorage();
    renderStudentList();
    closeStudentModal();
}

function deleteStudent(id) {
    if (confirm("Bạn có chắc chắn muốn xóa học sinh này?")) {
        dsHocSinh = dsHocSinh.filter(s => s.id !== id);
        saveStudentsToStorage();
        renderStudentList();
    }
}

// 8. IMPORT & EXPORT FILE EXCEL ( SHEETJS )
function downloadTemplateExcel() {
    const templateData = [
        { "Mã HS": "3160986688", "Họ và Tên": "Trần Thị Bích", "Ngày Sinh": "20/10/2010", "Khối": "10", "Lớp": "10A1" },
        { "Mã HS": "3160986689", "Họ và Tên": "Lê Văn Cường", "Ngày Sinh": "12/05/2010", "Khối": "10", "Lớp": "10A2" }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "DanhSachHocSinh");
    XLSX.writeFile(workbook, "File_Mau_Danh_Sach_Hoc_Sinh.xlsx");
}

function importStudentExcel(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (evt) {
        try {
            const data = new Uint8Array(evt.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const jsonResult = XLSX.utils.sheet_to_json(worksheet);

            let addedCount = 0;
            jsonResult.forEach(row => {
                const maHS = row["Mã HS"] ? row["Mã HS"].toString().trim() : "";
                if (maHS) {
                    const existingIndex = dsHocSinh.findIndex(s => s.maHS === maHS);
                    const studentItem = {
                        id: existingIndex !== -1 ? dsHocSinh[existingIndex].id : Date.now().toString() + Math.random().toString(36).substr(2, 4),
                        maHS: maHS,
                        hoTen: row["Họ và Tên"] || row["Họ tên"] || "Chưa nhập tên",
                        ngaySinh: row["Ngày Sinh"] || row["Ngày sinh"] || "",
                        khoi: row["Khối"] ? row["Khối"].toString() : "10",
                        tenLop: row["Lớp"] || "10A1",
                        trangThai: "Đang học"
                    };

                    if (existingIndex !== -1) {
                        dsHocSinh[existingIndex] = studentItem;
                    } else {
                        dsHocSinh.push(studentItem);
                    }
                    addedCount++;
                }
            });

            saveStudentsToStorage();
            renderStudentList();
            alert(`Đã import thành công ${addedCount} học sinh vào hệ thống!`);
        } catch (err) {
            alert("Lỗi định dạng file Excel. Vui lòng tải file mẫu để kiểm tra!");
        }
        e.target.value = ""; // Reset input file
    };
    reader.readAsArrayBuffer(file);
}

// 9. KẾT CHUYỂN NĂM HỌC VÀ TỐT NGHIỆP (KHỐI 12)
function promoteAcademicYear() {
    const confirmAction = confirm(
        `XÁC NHẬN KẾT CHUYỂN NĂM HỌC:\n\n` +
        `- Tất cả Học sinh Khối 10 -> Lên Khối 11\n` +
        `- Tất cả Học sinh Khối 11 -> Lên Khối 12\n` +
        `- Học sinh Khối 12 -> Tốt nghiệp / Ra trường\n` +
        `- Tự động chuyển đổi năm học hệ thống sang năm tiếp theo.\n\n` +
        `Bạn có chắc chắn muốn thực hiện?`
    );

    if (!confirmAction) return;

    let promotedCount = 0;
    let graduatedCount = 0;

    dsHocSinh.forEach(student => {
        if (student.trangThai === "Đang học") {
            const currentKhoi = parseInt(student.khoi, 10);

            if (currentKhoi === 12) {
                // Khối 12 ra trường
                student.trangThai = "Đã tốt nghiệp";
                student.khoi = "Đã ra trường";
                student.tenLop = "N/A";
                graduatedCount++;
            } else if (currentKhoi === 10 || currentKhoi === 11) {
                // Khối 10 & 11 lên lớp
                const nextKhoi = currentKhoi + 1;
                student.khoi = nextKhoi.toString();
                // Thay thế tên lớp (VD: 10A1 -> 11A1)
                student.tenLop = student.tenLop.replace(currentKhoi.toString(), nextKhoi.toString());
                promotedCount++;
            }
        }
    });

    // Cập nhật chuỗi Năm học
    const years = academicYear.split("-");
    const nextStartYear = parseInt(years[1], 10);
    academicYear = `${nextStartYear}-${nextStartYear + 1}`;

    localStorage.setItem("academicYear", academicYear);
    document.getElementById("currentAcademicYearDisplay").innerText = academicYear;

    saveStudentsToStorage();
    renderStudentList();

    alert(
        `KẾT CHUYỂN THÀNH CÔNG!\n\n` +
        `- Số học sinh được chuyển khối: ${promotedCount}\n` +
        `- Số học sinh khối 12 đã tốt nghiệp: ${graduatedCount}\n` +
        `- Năm học mới: ${academicYear}`
    );
}
