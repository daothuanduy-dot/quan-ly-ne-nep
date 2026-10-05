// js/discipline.js (Trích đoạn hàm onChamDiemLopChange)

async function onChamDiemLopChange() {
  const lopVal = document.getElementById('cd-lop').value;
  const inputElem = document.getElementById('cd-hs-input');
  const listElem = document.getElementById('cd-hs-list');
  selectedStudentTab2 = null;

  if (!lopVal) {
    inputElem.value = "-- Chọn Lớp trước để hiển thị học sinh --";
    listElem.innerHTML = '';
    return;
  }

  inputElem.value = "-- Chọn Cá Nhân Học Sinh (Tùy chọn) --";
  const students = await fetchStudentsByClass(lopVal);
  listElem.innerHTML = '<div class="search-select-item text-gray-500 italic" onclick="selectStudentTab2(null)">-- Không chọn cá nhân (Chấm tập thể) --</div>';

  students.forEach(s => {
    const birthStr = s.ngay_sinh ? ` (${s.ngay_sinh})` : '';
    const displayTxt = `${s.ho_ten}${birthStr}`;
    listElem.innerHTML += `<div class="search-select-item font-medium" data-text="${displayTxt}" onclick="selectStudentTab2('${s.ma_hs}', '${s.ho_ten}')">${displayTxt}</div>`;
  });
}
