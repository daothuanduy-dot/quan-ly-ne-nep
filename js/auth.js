import { supabase, normalizeTabs, isAdminStaff } from './config.js';

const SESSION_KEY = 'qlnn_v302_current_user';
const REMEMBER_KEY = 'qlnn_v302_remembered_username';

function normalizeUser(data) {
  if (!data) return null;
  return {
    ma_cb: data.ma_cb ?? '',
    ho_ten: data.ho_ten ?? '',
    vai_tro: data.vai_tro ?? '',
    vai_tro_list: Array.isArray(data.vai_tro_list) ? data.vai_tro_list : normalizeTabs(data.vai_tro_list),
    lop_quan_ly: data.lop_quan_ly ?? '',
    lop_giang_day: data.lop_giang_day ?? [],
    quyen_tabs: normalizeTabs(data.quyen_tabs),
    trang_thai: data.trang_thai,
    email: data.email ?? null
  };
}

export const Auth = {
  currentUser: null,

  async login(maCb, matKhau, remember = false) {
    const username = String(maCb ?? '').trim();
    const password = String(matKhau ?? '');

    if (!username || !password) {
      return { ok: false, message: 'Vui lòng nhập mã cán bộ và mật khẩu.' };
    }

    const { data, error } = await supabase.rpc('login_can_bo', {
      p_ma_cb: username,
      p_mat_khau: password
    });

    if (error) {
      console.error('login_can_bo:', error);
      return { ok: false, message: `Không đăng nhập được: ${error.message}` };
    }

    if (!data) {
      return { ok: false, message: 'Mã cán bộ hoặc mật khẩu không đúng, hoặc tài khoản đang bị khóa.' };
    }

    this.currentUser = normalizeUser(data);
    localStorage.setItem(SESSION_KEY, JSON.stringify(this.currentUser));
    if (remember) localStorage.setItem(REMEMBER_KEY, username);
    else localStorage.removeItem(REMEMBER_KEY);

    return { ok: true, user: this.currentUser };
  },

  restore() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      this.currentUser = raw ? normalizeUser(JSON.parse(raw)) : null;
    } catch (_) {
      this.currentUser = null;
    }
    return this.currentUser;
  },

  logout() {
    this.currentUser = null;
    localStorage.removeItem(SESSION_KEY);
  },

  isLoggedIn() {
    return !!this.currentUser;
  },

  isAdmin() {
    return isAdminStaff(this.currentUser);
  },

  hasTab(tabKey) {
    if (this.isAdmin()) return true;
    return normalizeTabs(this.currentUser?.quyen_tabs).includes(tabKey);
  },

  canOpenAdmin() {
    return this.isAdmin() || this.hasTab('quantri');
  },

  rememberedUsername() {
    return localStorage.getItem(REMEMBER_KEY) || '';
  }
};
