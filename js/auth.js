// ============================================================
// FILE: js/auth.js
// VERSION: 3.0.1
// PURPOSE: Authentication via Supabase RPC login_can_bo
// ============================================================
import { supabase, appConfig } from './config.js';

const SESSION_KEY = 'nenep_current_user_v3_0_1';
const REMEMBER_KEY = 'nenep_remembered_username_v3_0_1';

function normalizeUser(row) {
  if (!row) return null;

  let roles = [];
  if (Array.isArray(row.vai_tro_list)) {
    roles = row.vai_tro_list;
  } else if (typeof row.vai_tro_list === 'string') {
    try { roles = JSON.parse(row.vai_tro_list); }
    catch { roles = row.vai_tro_list.split(',').map(x => x.trim()).filter(Boolean); }
  }
  if (row.vai_tro) roles.push(row.vai_tro);

  return {
    ...row,
    ma_cb: String(row.ma_cb ?? '').trim(),
    ho_ten: row.ho_ten ?? '',
    vai_tro: row.vai_tro ?? '',
    lop_quan_ly: row.lop_quan_ly ?? '',
    vai_tro_list: [...new Set(roles.filter(Boolean).map(String))],
    quyen_tabs: row.quyen_tabs ?? [],
    loginTime: new Date().toISOString()
  };
}

const Auth = {
  currentUser: null,

  init() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      this.currentUser = raw ? normalizeUser(JSON.parse(raw)) : null;
    } catch (error) {
      console.warn(`[Auth v${appConfig.version}] session error`, error);
      this.currentUser = null;
      localStorage.removeItem(SESSION_KEY);
    }
    this.updateUI();
    return this.currentUser;
  },

  async login(maCb, matKhau) {
    const username = String(maCb || '').trim();
    const password = String(matKhau || '');

    if (!username || !password) {
      throw new Error('Vui lòng nhập mã cán bộ và mật khẩu.');
    }

    console.info(`[Auth v${appConfig.version}] Calling ${appConfig.loginFunction} for ${username}`);

    const { data, error } = await supabase.rpc(appConfig.loginFunction, {
      p_ma_cb: username,
      p_mat_khau: password
    });

    if (error) {
      console.error(`[Auth v${appConfig.version}] RPC error`, error);
      throw new Error(
        `Lỗi CSDL đăng nhập: ${error.message || 'Không xác định'}${error.code ? ` [${error.code}]` : ''}`
      );
    }

    const row = Array.isArray(data) ? data[0] : data;

    if (!row) {
      throw new Error('Mã cán bộ hoặc mật khẩu không đúng.');
    }

    return this.finishLogin(row);
  },

  finishLogin(row) {
    this.currentUser = normalizeUser(row);
    localStorage.setItem(SESSION_KEY, JSON.stringify(this.currentUser));
    this.updateUI();
    window.dispatchEvent(new CustomEvent('auth:login', { detail: this.currentUser }));
    return this.currentUser;
  },

  logout() {
    this.currentUser = null;
    localStorage.removeItem(SESSION_KEY);
    this.updateUI();
    window.dispatchEvent(new Event('auth:logout'));
  },

  isLoggedIn() { return !!this.currentUser; },

  isAdmin() {
    if (!this.currentUser) return false;
    const roles = [
      this.currentUser.vai_tro,
      ...(this.currentUser.vai_tro_list || [])
    ].filter(Boolean).map(x => String(x).trim().toLowerCase());

    return roles.some(role =>
      ['admin','administrator','quan_tri','quantri','quản trị','quản trị hệ thống','ban giám hiệu','ban giam hieu'].includes(role)
      || role.includes('admin')
    );
  },

  hasPermission(key) {
    if (!this.currentUser) return false;
    if (this.isAdmin()) return true;

    const map = {
      vang: 'quyen_bao_vang',
      diem: 'quyen_cham_diem',
      thongke: 'quyen_thong_ke',
      xeploai: 'quyen_xep_loai'
    };

    if (map[key] && Object.prototype.hasOwnProperty.call(this.currentUser, map[key])) {
      return !!this.currentUser[map[key]];
    }
    return key === 'qr';
  },

  updateUI() {
    const login = document.getElementById('loginView');
    const shell = document.getElementById('appShell');
    const info = document.getElementById('userInfo');

    if (this.currentUser) {
      login?.classList.add('hidden');
      shell?.classList.remove('hidden');
      if (info) {
        info.textContent = `${this.currentUser.ho_ten || this.currentUser.ma_cb}${this.currentUser.vai_tro ? ` · ${this.currentUser.vai_tro}` : ''}`;
      }
    } else {
      shell?.classList.add('hidden');
      login?.classList.remove('hidden');
      if (info) info.textContent = 'Chưa đăng nhập';
    }
  }
};

window.Auth = Auth;
export { Auth };
export default Auth;
