import { APP_VERSION, appConfig } from './config.js';
import { Auth } from './auth.js';
import { initPermissions } from './quantri-phanquyen.js';

const tabKeys = ['qr','baovang','chamdiem','thongke','xeploai','quantri'];
let activeTab = null;
let activeAdminTab = null;

function $(id) { return document.getElementById(id); }

function toast(message, type = '') {
  const el = $('toast');
  if (!el) return;
  el.textContent = message;
  el.className = `toast ${type}`.trim();
  el.classList.remove('hidden');
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => el.classList.add('hidden'), 3500);
}

function showView(loggedIn) {
  $('loginView').classList.toggle('hidden', loggedIn);
  $('appView').classList.toggle('hidden', !loggedIn);
}

function renderUser() {
  const u = Auth.currentUser;
  $('userBox').innerHTML = u ? `
    <div>
      <strong>${escapeHtml(u.ho_ten || u.ma_cb)}</strong>
      <small>${escapeHtml(u.ma_cb)} · ${escapeHtml(u.vai_tro || 'Cán bộ')}</small>
    </div>` : '';
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

function setTabVisibility() {
  document.querySelectorAll('#mainTabs .tab').forEach(btn => {
    const key = btn.dataset.tab;
    const allowed = Auth.hasTab(key);
    btn.classList.toggle('hidden', !allowed);
  });
}

function openTab(key) {
  if (!Auth.hasTab(key)) {
    toast('Tài khoản chưa được cấp quyền cho chức năng này.', 'err');
    return;
  }

  activeTab = key;
  document.querySelectorAll('#mainTabs .tab').forEach(b => b.classList.toggle('active', b.dataset.tab === key));
  document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
  $(`page-${key}`)?.classList.remove('hidden');

  if (key === 'quantri') {
    if (!Auth.canOpenAdmin()) {
      toast('Bạn không có quyền quản trị hệ thống.', 'err');
      return;
    }
    openAdminTab(activeAdminTab || 'permissions');
  }
}

async function openAdminTab(key) {
  if (!Auth.canOpenAdmin()) return;

  activeAdminTab = key;
  document.querySelectorAll('.admin-tab').forEach(b => b.classList.toggle('active', b.dataset.adminTab === key));
  document.querySelectorAll('.admin-page').forEach(p => p.classList.add('hidden'));

  const target = $(`admin-${key}`);
  target?.classList.remove('hidden');

  if (key === 'permissions') {
    await initPermissions($('permissionsRoot'));
  }
}

function bindEvents() {
  $('loginForm').addEventListener('submit', async e => {
    e.preventDefault();
    const err = $('loginError');
    err.textContent = '';

    const btn = e.submitter;
    btn.disabled = true;
    btn.textContent = 'Đang đăng nhập...';

    const result = await Auth.login($('username').value, $('password').value, false);

    btn.disabled = false;
    btn.textContent = 'Đăng nhập';

    if (!result.ok) {
      err.textContent = result.message;
      return;
    }

    startSession();
  });

  $('logoutBtn').addEventListener('click', () => {
    Auth.logout();
    showView(false);
    $('password').value = '';
    $('loginError').textContent = '';
  });

  document.querySelectorAll('#mainTabs .tab').forEach(btn => {
    btn.addEventListener('click', () => openTab(btn.dataset.tab));
  });

  document.querySelectorAll('.admin-tab').forEach(btn => {
    btn.addEventListener('click', () => openAdminTab(btn.dataset.adminTab));
  });
}

function startSession() {
  showView(true);
  renderUser();
  setTabVisibility();

  const first = tabKeys.find(x => Auth.hasTab(x));
  if (first) openTab(first);
  else toast('Tài khoản chưa được cấp quyền sử dụng chức năng nào.', 'err');
}

async function start() {
  bindEvents();

  const remembered = Auth.rememberedUsername();
  if (remembered) $('username').value = remembered;

  const restored = Auth.restore();
  if (restored) startSession();
  else showView(false);

  console.info(`Quản lý nề nếp & thi đua ${APP_VERSION}`, appConfig);
}

window.App = {
  toast,
  Auth,
  openTab,
  openAdminTab
};

start();
