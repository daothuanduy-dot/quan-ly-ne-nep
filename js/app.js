// ============================================================
// FILE: js/app.js
// VERSION: 3.0.1
// PURPOSE: Application shell, login, navigation and core CRUD
// ============================================================
import { appConfig, supabase, normalizeClass, nextClass, yearShift } from './config.js';
import { Auth } from './auth.js';

const App = {
  version: '3.0.0',
  students: [],
  staff: [],
  criteria: [],
  permissionRows: [],
  importRows: [],
  currentTab: 'qr',
  currentAdminTab: 'students',

  async init() {
    console.log(`[Nề nếp] v${this.version} starting...`);
    this.setStaticInfo();
    this.bindEvents();
    Auth.init();
    if (Auth.isLoggedIn()) await this.start();
  },

  setStaticInfo() {
    document.getElementById('namHocLabel')?.replaceChildren(document.createTextNode(appConfig.namHoc));
    const d = new Date();
    const date = d.toLocaleDateString('vi-VN');
    const day = d.getDay();
    const buoi = d.getHours() < 12 ? 'Sáng' : 'Chiều';
    const dateEl = document.getElementById('qrDate'); if (dateEl) dateEl.textContent = date;
    const sessionEl = document.getElementById('qrSession'); if (sessionEl) sessionEl.textContent = buoi;
    const cur = document.getElementById('transferCurrentYear'); if (cur) cur.value = appConfig.namHoc;
    const nxt = document.getElementById('transferNextYear'); if (nxt) nxt.value = yearShift(appConfig.namHoc, 1);
    console.log(`[Nề nếp] ngày=${date}, thứ=${day}, buổi=${buoi}`);
  },

  bindEvents() {
    document.getElementById('loginForm')?.addEventListener('submit', e => this.handleLogin(e));
    document.getElementById('btnLogout')?.addEventListener('click', () => Auth.logout());
    document.getElementById('btnRefresh')?.addEventListener('click', () => location.reload());
    document.getElementById('btnQrProcess')?.addEventListener('click', () => this.processQr());
    document.getElementById('qrInput')?.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); this.processQr(); } });

    document.querySelectorAll('.main-tab').forEach(b => b.addEventListener('click', () => this.switchTab(b.dataset.tab)));
    document.querySelectorAll('.admin-tab').forEach(b => b.addEventListener('click', () => this.switchAdminTab(b.dataset.tab)));

    document.getElementById('studentSearch')?.addEventListener('input', () => this.renderStudents());
    document.getElementById('studentGradeFilter')?.addEventListener('change', () => { this.updateClassFilter(); this.renderStudents(); });
    document.getElementById('studentClassFilter')?.addEventListener('change', () => this.renderStudents());
    document.getElementById('btnStudentAdd')?.addEventListener('click', () => this.studentModal());
    document.getElementById('btnStudentReload')?.addEventListener('click', () => this.loadStudents());

    document.getElementById('staffSearch')?.addEventListener('input', () => this.renderStaff());
    document.getElementById('btnStaffAdd')?.addEventListener('click', () => this.staffModal());
    document.getElementById('btnStaffReload')?.addEventListener('click', () => this.loadStaff());

    document.getElementById('criteriaSearch')?.addEventListener('input', () => this.renderCriteria());
    document.getElementById('btnCriteriaAdd')?.addEventListener('click', () => this.criteriaModal());
    document.getElementById('btnCriteriaReload')?.addEventListener('click', () => this.loadCriteria());

    document.getElementById('permissionSearch')?.addEventListener('input', () => this.renderPermissions());
    document.getElementById('btnPermissionReload')?.addEventListener('click', () => this.loadPermissions());

    document.getElementById('btnDownloadTemplate')?.addEventListener('click', () => this.downloadTemplate());
    document.getElementById('btnImportPreview')?.addEventListener('click', () => this.previewImport());
    document.getElementById('btnImportCommit')?.addEventListener('click', () => this.commitImport());
    document.getElementById('btnPreviewTransfer')?.addEventListener('click', () => this.previewTransfer());
    document.getElementById('btnExecuteTransfer')?.addEventListener('click', () => this.executeTransfer());
    document.getElementById('btnGraduate')?.addEventListener('click', () => this.graduate());

    document.getElementById('modalClose')?.addEventListener('click', () => this.closeModal());
    document.getElementById('modalCancel')?.addEventListener('click', () => this.closeModal());
    document.getElementById('modalBackdrop')?.addEventListener('click', e => { if (e.target.id === 'modalBackdrop') this.closeModal(); });
  },

  async handleLogin(e) {
    e.preventDefault();
    const u = document.getElementById('loginUsername')?.value.trim();
    const p = document.getElementById('loginPassword')?.value || '';
    const msg = document.getElementById('loginMessage');
    const btn = e.submitter || e.target.querySelector('button[type="submit"]');
    if (msg) msg.textContent = '';
    if (!u || !p) { if (msg) msg.textContent = 'Vui lòng nhập đầy đủ thông tin.'; return; }
    if (btn) btn.disabled = true;
    try {
      const user = await Auth.login(u, p);
      if (document.getElementById('rememberLogin')?.checked) localStorage.setItem('remembered_username', u);
      else localStorage.removeItem('remembered_username');
      const name = user.ho_ten || user.ma_cb;
      this.toast(`Đăng nhập thành công: ${name}`, 'ok');
      await this.start();
    } catch (error) {
      console.error('[AUTH ERROR]', error);
      if (msg) msg.textContent = error.message || 'Đăng nhập thất bại.';
    } finally { if (btn) btn.disabled = false; }
  },

  async start() {
    Auth.updateUI();
    this.applyPermissions();
    const remembered = localStorage.getItem('remembered_username');
    if (remembered) { const i = document.getElementById('loginUsername'); if (i) i.value = remembered; const c = document.getElementById('rememberLogin'); if (c) c.checked = true; }
    await this.loadStudents();
    await this.loadStats();
  },

  applyPermissions() {
    document.querySelectorAll('.main-tab[data-permission]').forEach(b => b.classList.toggle('hidden', !Auth.hasPermission(b.dataset.permission)));
    document.querySelector('.main-tab[data-tab="quantri"]')?.classList.toggle('hidden', !Auth.isAdmin());
  },

  switchTab(tab) {
    const btn = document.querySelector(`.main-tab[data-tab="${CSS.escape(tab)}"]`);
    if (!btn || btn.classList.contains('hidden')) return;
    this.currentTab = tab;
    document.querySelectorAll('.main-tab').forEach(b => b.classList.toggle('active', b === btn));
    document.querySelectorAll('.pane').forEach(p => p.classList.toggle('active', p.dataset.pane === tab));
    if (tab === 'thongke') this.loadStats();
    if (tab === 'quantri') this.switchAdminTab(this.currentAdminTab);
  },

  switchAdminTab(tab) {
    if (!Auth.isAdmin()) return;
    const btn = document.querySelector(`.admin-tab[data-tab="${CSS.escape(tab)}"]`); if (!btn) return;
    this.currentAdminTab = tab;
    document.querySelectorAll('.admin-tab').forEach(b => b.classList.toggle('active', b === btn));
    document.querySelectorAll('.admin-pane').forEach(p => p.classList.toggle('active', p.dataset.admin === tab));
    if (tab === 'students') this.loadStudents();
    if (tab === 'staff') this.loadStaff();
    if (tab === 'criteria') this.loadCriteria();
    if (tab === 'permissions') this.loadPermissions();
  },

  async processQr() {
    const value = document.getElementById('qrInput')?.value.trim(); if (!value) return this.toast('Nhập mã QR hoặc mã học sinh.', 'err');
    try {
      const { data, error } = await supabase.from('danh_sach').select('ma_hs,ho_ten,khoi,lop,ma_qr').or(`ma_hs.eq.${value},ma_qr.eq.${value}`).maybeSingle();
      if (error) throw error;
      if (!data) return this.toast('Không tìm thấy học sinh.', 'err');
      document.getElementById('qrStatus').textContent = 'Đã tìm thấy';
      document.getElementById('qrResult').innerHTML = `<strong>${this.esc(data.ho_ten)}</strong><div class="hint">${this.esc(data.ma_hs)} · ${this.esc(data.lop)} · khối ${this.esc(data.khoi)}</div>`;
    } catch (e) { this.toast(`QR: ${e.message}`, 'err'); }
  },

  async loadStudents() {
    try {
      const { data, error } = await supabase.from('danh_sach').select('*').order('khoi').order('lop').order('ho_ten');
      if (error) throw error; this.students = data || []; this.updateClassFilter(); this.renderStudents(); this.set('statStudents', this.students.length);
    } catch (e) { console.error(e); this.toast(`Không tải được học sinh: ${e.message}`, 'err'); }
  },

  renderStudents() {
    const body = document.getElementById('studentTableBody'); if (!body) return;
    const q = (document.getElementById('studentSearch')?.value || '').toLowerCase(); const g = document.getElementById('studentGradeFilter')?.value || ''; const c = document.getElementById('studentClassFilter')?.value || '';
    const rows = this.students.filter(s => `${s.ma_hs||''} ${s.ho_ten||''} ${s.lop||''}`.toLowerCase().includes(q) && (!g || String(s.khoi) === g) && (!c || normalizeClass(s.lop) === normalizeClass(c)));
    body.innerHTML = rows.length ? rows.map(s => `<tr><td>${this.esc(s.ma_hs)}</td><td>${this.esc(s.ho_ten)}</td><td>${this.esc(s.khoi)}</td><td>${this.esc(s.lop)}</td><td>${this.esc(s.ngay_sinh||'')}</td><td>${this.esc(s.trang_thai||'Hoạt động')}</td><td><button class="btn btn-sm" data-edit-student="${this.escA(s.ma_hs)}">Sửa</button> <button class="btn btn-sm btn-danger" data-del-student="${this.escA(s.ma_hs)}">Xóa</button></td></tr>`).join('') : '<tr><td colspan="7" class="empty">Không có dữ liệu.</td></tr>';
    body.querySelectorAll('[data-edit-student]').forEach(b => b.onclick = () => this.studentModal(this.students.find(x => x.ma_hs === b.dataset.editStudent)));
    body.querySelectorAll('[data-del-student]').forEach(b => b.onclick = () => this.deleteStudent(b.dataset.delStudent));
  },

  updateClassFilter() {
    const sel = document.getElementById('studentClassFilter'); if (!sel) return; const g = document.getElementById('studentGradeFilter')?.value || ''; const old = sel.value;
    const cls = [...new Set(this.students.filter(s => !g || String(s.khoi) === g).map(s => normalizeClass(s.lop)).filter(Boolean))].sort(); sel.innerHTML = '<option value="">Tất cả lớp</option>' + cls.map(x => `<option value="${this.escA(x)}">${this.esc(x)}</option>`).join(''); if (cls.includes(old)) sel.value = old;
  },

  studentModal(item = null) {
    this.openModal(item ? 'Sửa học sinh' : 'Thêm học sinh', `<div class="grid g2"><div class="field"><label>Mã HS *</label><input id="m_ma_hs" value="${this.escA(item?.ma_hs||'')}" ${item?'readonly':''}></div><div class="field"><label>Họ tên *</label><input id="m_ho_ten" value="${this.escA(item?.ho_ten||'')}"></div><div class="field"><label>Khối</label><input id="m_khoi" value="${this.escA(item?.khoi||'')}"></div><div class="field"><label>Lớp</label><input id="m_lop" value="${this.escA(item?.lop||'')}"></div><div class="field"><label>Ngày sinh</label><input id="m_ngay_sinh" type="date" value="${this.escA(item?.ngay_sinh||'')}"></div><div class="field"><label>Email</label><input id="m_email" value="${this.escA(item?.email||'')}"></div><div class="field"><label>Mật khẩu</label><input id="m_mat_khau" value="${this.escA(item?.mat_khau||'')}"></div><div class="field"><label>Trạng thái</label><input id="m_trang_thai" value="${this.escA(item?.trang_thai||'Hoạt động')}"></div></div>`, async () => {
      const payload = { ma_hs:this.v('m_ma_hs'), ho_ten:this.v('m_ho_ten'), khoi:this.v('m_khoi'), lop:normalizeClass(this.v('m_lop')), ngay_sinh:this.v('m_ngay_sinh')||null, email:this.v('m_email')||null, mat_khau:this.v('m_mat_khau')||null, trang_thai:this.v('m_trang_thai')||'Hoạt động' };
      if (!payload.ma_hs || !payload.ho_ten) throw new Error('Mã HS và họ tên là bắt buộc.');
      const r = item ? await supabase.from('danh_sach').update(payload).eq('ma_hs', item.ma_hs) : await supabase.from('danh_sach').insert(payload); if (r.error) throw r.error; this.closeModal(); this.toast('Đã lưu học sinh.','ok'); await this.loadStudents();
    });
  },

  async deleteStudent(id) { if (!confirm(`Xóa học sinh ${id}?`)) return; const { error } = await supabase.from('danh_sach').delete().eq('ma_hs', id); if (error) return this.toast(error.message,'err'); await this.loadStudents(); this.toast('Đã xóa.','ok'); },

  async loadStaff() { try { const {data,error}=await supabase.from('can_bo').select('ma_cb,ho_ten,vai_tro,lop_quan_ly').order('ho_ten'); if(error)throw error; this.staff=data||[]; this.renderStaff(); this.set('statStaff',this.staff.length);} catch(e){this.toast(`Không tải được cán bộ: ${e.message}`,'err');} },
  renderStaff(){const body=document.getElementById('staffTableBody');if(!body)return;const q=(document.getElementById('staffSearch')?.value||'').toLowerCase();const rows=this.staff.filter(s=>`${s.ma_cb||''} ${s.ho_ten||''} ${s.vai_tro||''}`.toLowerCase().includes(q));body.innerHTML=rows.length?rows.map(s=>`<tr><td>${this.esc(s.ma_cb)}</td><td>${this.esc(s.ho_ten)}</td><td>${this.esc(s.vai_tro)}</td><td>${this.esc(s.lop_quan_ly)}</td><td><button class="btn btn-sm" data-edit-staff="${this.escA(s.ma_cb)}">Sửa</button></td></tr>`).join(''):'<tr><td colspan="5" class="empty">Không có dữ liệu.</td></tr>';body.querySelectorAll('[data-edit-staff]').forEach(b=>b.onclick=()=>this.staffModal(this.staff.find(x=>x.ma_cb===b.dataset.editStaff)));},
  staffModal(item=null){this.openModal(item?'Sửa cán bộ':'Thêm cán bộ',`<div class="grid g2"><div class="field"><label>Mã CB *</label><input id="m_ma_cb" value="${this.escA(item?.ma_cb||'')}" ${item?'readonly':''}></div><div class="field"><label>Họ tên *</label><input id="m_cb_name" value="${this.escA(item?.ho_ten||'')}"></div><div class="field"><label>Mật khẩu</label><input id="m_cb_pass" value="${this.escA(item?.mat_khau||'')}"></div><div class="field"><label>Vai trò</label><input id="m_cb_role" value="${this.escA(item?.vai_tro||'')}"></div><div class="field"><label>Lớp quản lý</label><input id="m_cb_class" value="${this.escA(item?.lop_quan_ly||'')}"></div></div>`,async()=>{const p={ma_cb:this.v('m_ma_cb'),ho_ten:this.v('m_cb_name'),mat_khau:this.v('m_cb_pass')||null,vai_tro:this.v('m_cb_role'),lop_quan_ly:this.v('m_cb_class')};if(!p.ma_cb||!p.ho_ten)throw new Error('Mã CB và họ tên là bắt buộc.');const r=item?await supabase.from('can_bo').update(p).eq('ma_cb',item.ma_cb):await supabase.from('can_bo').insert(p);if(r.error)throw r.error;this.closeModal();await this.loadStaff();this.toast('Đã lưu cán bộ.','ok');});},

  async loadCriteria(){try{const {data,error}=await supabase.from('danh_muc_diem').select('*').order('mang').order('ten_hd');if(error)throw error;this.criteria=data||[];this.renderCriteria();this.set('statCriteria',this.criteria.length);}catch(e){this.toast(`Không tải được tiêu chí: ${e.message}`,'err');}},
  renderCriteria(){const body=document.getElementById('criteriaTableBody');if(!body)return;const q=(document.getElementById('criteriaSearch')?.value||'').toLowerCase();const rows=this.criteria.filter(s=>`${s.ma_hd||''} ${s.ten_hd||''} ${s.mang||''}`.toLowerCase().includes(q));body.innerHTML=rows.length?rows.map(s=>`<tr><td>${this.esc(s.ma_hd)}</td><td>${this.esc(s.ten_hd)}</td><td>${this.esc(s.mang)}</td><td>${this.esc(s.loai)}</td><td>${this.esc(s.diem)}</td><td><button class="btn btn-sm" data-edit-criteria="${s.id}">Sửa</button></td></tr>`).join(''):'<tr><td colspan="6" class="empty">Không có dữ liệu.</td></tr>';body.querySelectorAll('[data-edit-criteria]').forEach(b=>b.onclick=()=>this.criteriaModal(this.criteria.find(x=>String(x.id)===b.dataset.editCriteria)));},
  criteriaModal(item=null){this.openModal(item?'Sửa tiêu chí':'Thêm tiêu chí',`<div class="grid g2"><div class="field"><label>Mã HĐ *</label><input id="m_ma_hd" value="${this.escA(item?.ma_hd||'')}"></div><div class="field"><label>Tên HĐ *</label><input id="m_ten_hd" value="${this.escA(item?.ten_hd||'')}"></div><div class="field"><label>Mảng</label><select id="m_mang"><option>Nề nếp</option><option>Học tập</option><option>Đoàn đội</option><option>Hoạt động tập thể</option></select></div><div class="field"><label>Loại</label><select id="m_loai"><option>Cá nhân</option><option>Tập thể</option></select></div><div class="field"><label>Điểm</label><input id="m_diem" type="number" step="0.5" value="${this.escA(item?.diem??0)}"></div></div>`,async()=>{const p={ma_hd:this.v('m_ma_hd'),ten_hd:this.v('m_ten_hd'),mang:this.v('m_mang'),loai:this.v('m_loai'),diem:Number(this.v('m_diem')||0)};if(!p.ma_hd||!p.ten_hd)throw new Error('Mã và tên hành vi là bắt buộc.');const r=item?await supabase.from('danh_muc_diem').update(p).eq('id',item.id):await supabase.from('danh_muc_diem').insert(p);if(r.error)throw r.error;this.closeModal();await this.loadCriteria();this.toast('Đã lưu tiêu chí.','ok');});},

  async loadPermissions(){if(!Auth.isAdmin())return;try{const {data,error}=await supabase.from('danh_sach').select('ma_hs,ho_ten,quyen_bao_vang,quyen_cham_diem,quyen_thong_ke,quyen_xep_loai').order('ho_ten').limit(500);if(error)throw error;this.permissionRows=data||[];this.renderPermissions();}catch(e){this.toast(`Không tải được phân quyền: ${e.message}`,'err');}},
  renderPermissions(){const box=document.getElementById('permissionModule');if(!box)return;box.innerHTML='<p class="hint">Phần quyền cán bộ sẽ được chuẩn hóa riêng theo bảng quan hệ. Bản v3 không tự ghi nhầm quyền vào bảng cán bộ khi schema chưa có cột tương ứng.</p>';},

  downloadTemplate(){const csv='ma_hs,ho_ten,khoi,lop,ngay_sinh,email,mat_khau,trang_thai\nHS0001,Nguyen Van A,10,10C5,2010-01-01,,123456,Hoạt động';const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\\ufeff'+csv],{type:'text/csv;charset=utf-8'}));a.download='mau_nhap_hoc_sinh_v3.csv';a.click();URL.revokeObjectURL(a.href);},
  async previewImport(){const f=document.getElementById('excelFile')?.files?.[0];if(!f)return this.toast('Chọn file CSV trước.','err');if(!f.name.toLowerCase().endsWith('.csv'))return this.toast('Bản v3 chỉ nhận CSV ở chức năng lõi.','err');const text=await f.text();const lines=text.split(/\r?\n/).filter(Boolean);const h=lines[0].split(',');this.importRows=lines.slice(1).map(l=>{const c=l.split(',');const o={};h.forEach((x,i)=>o[x.trim()]=(c[i]||'').trim());return o;});document.getElementById('importPreview').innerHTML=`<div class="table-wrap"><table><thead><tr>${h.map(x=>`<th>${this.esc(x)}</th>`).join('')}</tr></thead><tbody>${this.importRows.slice(0,50).map(r=>`<tr>${h.map(x=>`<td>${this.esc(r[x.trim()]||'')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;},
  async commitImport(){if(!this.importRows.length)return this.toast('Chưa có dữ liệu xem trước.','err');const r=await supabase.from('danh_sach').upsert(this.importRows,{onConflict:'ma_hs'});if(r.error)return this.toast(r.error.message,'err');this.toast(`Đã nhập ${this.importRows.length} học sinh.`,'ok');await this.loadStudents();},

  async loadStats(){try{const [a,b,c,d]=await Promise.all([supabase.from('danh_sach').select('*',{count:'exact',head:true}),supabase.from('can_bo').select('*',{count:'exact',head:true}),supabase.from('lop').select('*',{count:'exact',head:true}),supabase.from('danh_muc_diem').select('*',{count:'exact',head:true})]);this.set('statStudents',a.count??'—');this.set('statStaff',b.count??'—');this.set('statClasses',c.count??'—');this.set('statCriteria',d.count??'—');}catch(e){console.warn('[STATS]',e.message);}},

  previewTransfer(){const rows=this.students.filter(s=>['10','11','12'].includes(String(s.khoi))).slice(0,200);const box=document.getElementById('transferPreview');if(!box)return;box.innerHTML=`<table><thead><tr><th>Mã HS</th><th>Họ tên</th><th>Lớp cũ</th><th>Dự kiến</th></tr></thead><tbody>${rows.map(s=>`<tr><td>${this.esc(s.ma_hs)}</td><td>${this.esc(s.ho_ten)}</td><td>${this.esc(s.lop)}</td><td>${this.esc(String(s.khoi)==='12'?'Tốt nghiệp':nextClass(s.lop)||'—')}</td></tr>`).join('')}</tbody></table>`;},
  async executeTransfer(){if(!confirm('Chỉ thực hiện sau khi đã kiểm tra danh sách. Tiếp tục?'))return;for(const s of this.students.filter(x=>['10','11'].includes(String(x.khoi)))){const nc=nextClass(s.lop);const ng=String(s.khoi)==='10'?'11':'12';if(nc){const {error}=await supabase.from('danh_sach').update({khoi:ng,lop:nc}).eq('ma_hs',s.ma_hs);if(error)return this.toast(error.message,'err');}}this.toast('Đã kết chuyển.','ok');await this.loadStudents();},
  async graduate(){if(!confirm('Đánh dấu toàn bộ học sinh khối 12 là Tốt nghiệp?'))return;const {data,error}=await supabase.from('danh_sach').select('ma_hs').eq('khoi','12');if(error)return this.toast(error.message,'err');for(const s of data||[]){const r=await supabase.from('danh_sach').update({trang_thai:'Tốt nghiệp'}).eq('ma_hs',s.ma_hs);if(r.error)return this.toast(r.error.message,'err');}this.toast('Đã đánh dấu tốt nghiệp.','ok');await this.loadStudents();},

  openModal(title, html, saveFn){document.getElementById('modalTitle').textContent=title;document.getElementById('modalBody').innerHTML=html;document.getElementById('modalBackdrop').classList.add('open');const b=document.getElementById('modalSave');b.onclick=async()=>{b.disabled=true;try{await saveFn();this.closeModal();}catch(e){this.toast(e.message,'err');}finally{b.disabled=false;}};},
  closeModal(){document.getElementById('modalBackdrop')?.classList.remove('open');},
  v(id){return document.getElementById(id)?.value?.trim()||'';},
  set(id,v){const e=document.getElementById(id);if(e)e.textContent=v;},
  toast(m,type=''){const e=document.getElementById('toast');if(!e)return;e.textContent=m;e.className=`toast show ${type}`;clearTimeout(this._t);this._t=setTimeout(()=>e.className='toast',4000);},
  esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));},
  escA(v){return this.esc(v);}
};

window.App = App;
window.getCurrentUser = () => Auth.currentUser;
window.switchSubTab = tab => App.switchAdminTab(tab);

document.addEventListener('DOMContentLoaded', () => App.init(), { once: true });
export default App;
