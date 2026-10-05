let html5QrcodeScanner = null;
let pendingQRData = null;
let isProcessingQR = false;
let qrSyncQueue = JSON.parse(localStorage.getItem('lhp_qr_sync_queue') || '[]');

// THEO DÕI MẠNG INTERNET
window.addEventListener('online', () => { updateNetworkBadge(true); triggerManualSync(); });
window.addEventListener('offline', () => { updateNetworkBadge(false); });

function updateNetworkBadge(isOnline) {
  const badge = document.getElementById('network-status-badge');
  if (!badge) return;
  if (isOnline) {
    badge.className = "text-xs px-2.5 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800";
    badge.innerHTML = '<i class="fa-solid fa-wifi"></i> Online';
  } else {
    badge.className = "text-xs px-2.5 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800";
    badge.innerHTML = '<i class="fa-solid fa-plane"></i> Offline (Lưu tạm)';
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  updateNetworkBadge(navigator.onLine);
  renderQRLogListUI();
  await fetchAllClasses();
  await fetchAllStudents();
  if (navigator.onLine && qrSyncQueue.some(i => i.status === 'pending')) {
    triggerManualSync();
  }
});

// GIẢI MÃ MÃ QR KHÔNG BỊ NHẦM LỚP/KHỐI
function parseQRData(rawQR) {
  if (!rawQR) return { maHS: '', hoTen: 'Chưa xác định', lop: 'Chưa xếp lớp', khoi: '10' };
  let str = String(rawQR).trim();

  if (str.startsWith('{') && str.endsWith('}')) {
    try {
      const obj = JSON.parse(str);
      const maHS = String(obj.ma_hs || obj.maHS || obj.id || '').trim();
      const hoTen = String(obj.ho_ten || obj.hoTen || obj.ten || '').trim();
      const lop = String(obj.lop || obj.ten_lop || '').trim();
      const cached = studentFastMap.get(maHS);

      const finalLop = (lop && !/^\d{8,}$/.test(lop)) ? lop : (cached?.ten_lop || 'Chưa xếp lớp');
      const finalName = hoTen || cached?.ho_ten || `Học sinh ${maHS}`;
      const finalKhoi = finalLop !== 'Chưa xếp lớp' ? (finalLop.match(/\d+/)?.[0] || '10') : (cached?.khoi_id || '10');

      return { maHS, hoTen: finalName, lop: finalLop, khoi: finalKhoi };
    } catch(e){}
  }

  if (studentFastMap.has(str)) {
    const cached = studentFastMap.get(str);
    const finalLop = cached.ten_lop || 'Chưa xếp lớp';
    return {
      maHS: cached.ma_hs,
      hoTen: cached.ho_ten || `Học sinh ${cached.ma_hs}`,
      lop: finalLop,
      khoi: cached.khoi_id || (finalLop !== 'Chưa xếp lớp' ? finalLop.match(/\d+/)?.[0] || '10' : '10')
    };
  }

  const parts = str.split(/[|;,]+/);
  if (parts.length >= 2) {
    const maHS = parts[0].trim();
    const hoTen = parts[1].trim();
    const lop = parts.length >= 3 ? parts[2].trim() : '';

    const cached = studentFastMap.get(maHS);
    const finalLop = (lop && !/^\d{8,}$/.test(lop)) ? lop : (cached?.ten_lop || 'Chưa xếp lớp');
    const finalName = hoTen || cached?.ho_ten || `Học sinh ${maHS}`;
    const finalKhoi = finalLop !== 'Chưa xếp lớp' ? (finalLop.match(/\d+/)?.[0] || '10') : (cached?.khoi_id || '10');

    return { maHS, hoTen: finalName, lop: finalLop, khoi: finalKhoi };
  }

  const cleanMa = parts[0].trim();
  const cached = studentFastMap.get(cleanMa);
  const finalLop = cached?.ten_lop || 'Chưa xếp lớp';
  const finalName = cached?.ho_ten || `Học sinh ${cleanMa}`;
  const finalKhoi = cached?.khoi_id || (finalLop !== 'Chưa xếp lớp' ? finalLop.match(/\d+/)?.[0] || '10' : '10');

  return { maHS: cleanMa, hoTen: finalName, lop: finalLop, khoi: finalKhoi };
}

// BẮT MÃ QR VÀ MỞ MODAL TỨC THỜI ($0\text{ ms}$)
async function onQRScanned(rawQR) {
  if (!rawQR || isProcessingQR) return;
  isProcessingQR = true;

  if (html5QrcodeScanner) { 
    try { html5QrcodeScanner.pause(true); } catch(e){} 
  }

  const parsed = parseQRData(rawQR);
  const actionRadio = document.querySelector('input[name="qr-action"]:checked');
  const action = actionRadio ? actionRadio.value : 'muon_khong_phep';
  const actionText = actionRadio ? actionRadio.parentElement.innerText.trim() : 'Đi học muộn (Không phép)';

  pendingQRData = { ...parsed, action, actionText };

  document.getElementById('modal-ma-hs').innerText = parsed.maHS;
  document.getElementById('modal-ho-ten').innerText = parsed.hoTen;
  document.getElementById('modal-lop').innerText = parsed.lop !== 'Chưa xếp lớp' ? `Lớp ${parsed.lop} (Khối ${parsed.khoi})` : 'Chưa xếp lớp';
  document.getElementById('modal-hinh-thuc').innerText = actionText;
  document.getElementById('qr-modal').classList.remove('hidden');
}

// XÁC NHẬN LƯU VÀ ĐỒNG BỘ
async function confirmSaveQR() {
  if (!pendingQRData) return;
  const { maHS, hoTen, lop, khoi, action, actionText } = pendingQRData;

  let diemVal = 0, maHDVal = 'HD02a';
  if (action === 'muon_co_phep') { diemVal = -0.75; maHDVal = 'HD02c'; }
  else if (action === 'muon_khong_phep') { diemVal = -1.0; maHDVal = 'HD02a'; }
  else if (action === 'diem_thuong') { diemVal = 1.0; maHDVal = 'KT01'; }
  else if (action === 'diem_tru') { diemVal = -1.0; maHDVal = 'VP01'; }

  const autoBuoi = getCurrentBuoi();
  const todayStr = formatDateToYYYYMMDD(new Date());
  const nowTimeStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

  const syncItem = {
    id: Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    ma_hs: String(maHS).slice(0, 30),
    ho_ten: String(hoTen || `Học sinh ${maHS}`).slice(0, 50),
    khoi: String(khoi || '10'),
    lop: String(lop || 'Chưa xếp lớp').slice(0, 20),
    ngay_diem_danh: todayStr,
    buoi: autoBuoi,
    trang_thai: action,
    action_text: actionText,
    ma_hd: maHDVal,
    chi_tiet: `${actionText} (${nowTimeStr})`.slice(0, 100),
    diem: diemVal,
    ten_nguoi_cap_nhat: currentUser ? String(currentUser.ho_ten).slice(0, 50) : 'Cán bộ',
    time_str: nowTimeStr,
    status: 'pending'
  };

  closeQRModal();

  if (navigator.onLine) {
    const isSuccess = await sendSingleRecordToDB(syncItem);
    syncItem.status = isSuccess ? 'synced' : 'pending';
  } else {
    syncItem.status = 'pending';
  }

  qrSyncQueue.push(syncItem);
  saveSyncState();
  renderQRLogListUI();
}

// ĐẨY BẢN GHI VỀ SUPABASE & TỰ CHUYỂN VẮNG -> ĐI MUỘN
async function sendSingleRecordToDB(item) {
  try {
    const { data: existingRecords } = await _supabase.from('diem_danh_master')
      .select('id, trang_thai')
      .eq('ma_hs', item.ma_hs)
      .eq('ngay_diem_danh', item.ngay_diem_danh)
      .eq('buoi', item.buoi);

    const vangRecord = existingRecords ? existingRecords.find(r => String(r.trang_thai || '').toLowerCase().includes('vang')) : null;

    if (vangRecord) {
      const { error: updateErr } = await _supabase.from('diem_danh_master').update({
        trang_thai: item.trang_thai,
        diem: item.diem,
        ma_hd: item.ma_hd,
        chi_tiet: `[SỬA VẮNG -> MUỘN lúc ${item.time_str}]${item.action_text}`.slice(0, 100),
        ten_nguoi_cap_nhat: item.ten_nguoi_cap_nhat
      }).eq('id', vangRecord.id);

      if (updateErr) throw updateErr;
    } else {
      const { error: insertErr } = await _supabase.from('diem_danh_master').insert([{
        ma_hs: item.ma_hs,
        ho_ten: item.ho_ten,
        khoi: String(item.khoi),
        lop: String(item.lop),
        ngay_diem_danh: item.ngay_diem_danh,
        buoi: item.buoi,
        trang_thai: item.trang_thai,
        ma_hd: item.ma_hd,
        chi_tiet: item.chi_tiet,
        diem: item.diem,
        ten_nguoi_cap_nhat: item.ten_nguoi_cap_nhat
      }]);

      if (insertErr) throw insertErr;
    }

    return true;
  } catch (err) {
    console.error("Lỗi đồng bộ item:", item.ma_hs, err);
    return false;
  }
}

async function triggerManualSync() {
  if (!navigator.onLine) return alert("Hiện tại chưa có kết nối Internet!");

  const pendingItems = qrSyncQueue.filter(i => i.status === 'pending');
  if (pendingItems.length === 0) return alert("Tất cả lượt quét đã được đồng bộ!");

  for (let item of pendingItems) {
    const success = await sendSingleRecordToDB(item);
    if (success) item.status = 'synced';
  }

  saveSyncState();
  renderQRLogListUI();
}

function saveSyncState() {
  if (qrSyncQueue.length > 50) qrSyncQueue = qrSyncQueue.slice(-50);
  localStorage.setItem('lhp_qr_sync_queue', JSON.stringify(qrSyncQueue));
}

function renderQRLogListUI() {
  const logContainer = document.getElementById('qr-log-list');
  const pendingBadge = document.getElementById('pending-count-badge');
  
  const pendingItems = qrSyncQueue.filter(i => i.status === 'pending');
  if (pendingBadge) pendingBadge.innerText = pendingItems.length;

  if (!logContainer) return;
  logContainer.innerHTML = '';

  if (qrSyncQueue.length === 0) {
    logContainer.innerHTML = '<p class="text-sm text-gray-400 italic text-center p-2">Chưa có lượt quét nào...</p>';
    return;
  }

  const reversedQueue = [...qrSyncQueue].reverse();

  reversedQueue.forEach(item => {
    const isSynced = item.status === 'synced';
    const badgeHTML = isSynced 
      ? '<span class="bg-emerald-100 text-emerald-800 text-[11px] font-bold px-2 py-0.5 rounded"><i class="fa-solid fa-check-double"></i> Đã đồng bộ</span>'
      : '<span class="bg-amber-100 text-amber-800 text-[11px] font-bold px-2 py-0.5 rounded"><i class="fa-solid fa-clock"></i> Chờ đồng bộ</span>';

    logContainer.innerHTML += `
      <div class="p-2.5 ${isSynced ? 'bg-white' : 'bg-amber-50'} border rounded-lg text-xs space-y-1 shadow-sm">
        <div class="flex justify-between items-center">
          <strong class="text-gray-800 text-sm">${item.ho_ten} (${item.lop})</strong>${badgeHTML}
        </div>
        <div class="flex justify-between text-gray-500">
          <span>${item.chi_tiet}</span>
          <span class="font-mono text-[11px]">${item.time_str}</span>
        </div>
      </div>
    `;
  });
}

function closeQRModal() {
  document.getElementById('qr-modal').classList.add('hidden');
  isProcessingQR = false;
  if (html5QrcodeScanner) { try { html5QrcodeScanner.resume(); } catch(e){} }
}

function startQRScanner() {
  if (html5QrcodeScanner) return;
  html5QrcodeScanner = new Html5Qrcode("reader", { experimentalFeatures: { useBarCodeDetectorIfSupported: true } });
  const config = { fps: 15, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 };
  html5QrcodeScanner.start({ facingMode: "environment" }, config, onQRScanned).catch(err => alert("Lỗi Camera: " + err));
}

function stopQRScanner() { 
  if (html5QrcodeScanner) { 
    html5QrcodeScanner.stop().then(() => { 
      html5QrcodeScanner.clear(); 
      html5QrcodeScanner = null; 
      isProcessingQR = false;
    }); 
  } 
}

function processManualQR() { 
  const val = document.getElementById('manual-ma-hs').value.trim(); 
  if(val) onQRScanned(val); 
}