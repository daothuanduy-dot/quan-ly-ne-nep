/**
 * ============================================================
 * AUTH.JS
 * Quản lý xác thực người dùng
 * THPT Lê Hồng Phong
 *
 * Kiến trúc:
 *   config.js
 *       ↓
 *   Supabase
 *       ↓
 *   bảng can_bo
 *       ↓
 *   Auth
 *
 * Không sử dụng api_login.php
 * Không sử dụng sessionStorage.currentUser
 *
 * Tài khoản đăng nhập sử dụng:
 *   ma_cb
 *   mat_khau
 *
 * ============================================================
 */

import {
    supabase,
    appConfig
} from './config.js';


const Auth = {

    /**
     * Người dùng hiện tại
     */
    currentUser: null,


    /**
     * Key lưu phiên
     */
    STORAGE_KEY: 'currentUser',


    /**
     * Key ghi nhớ tài khoản
     */
    REMEMBER_KEY: 'remembered_username',


    /**
     * ========================================================
     * KHỞI TẠO
     * ========================================================
     */
    async init() {

        try {

            console.log(
                '[AUTH] Khởi tạo hệ thống xác thực...'
            );


            /*
             * Đọc user đã đăng nhập
             */
            const saved =
                localStorage.getItem(
                    this.STORAGE_KEY
                );


            if (saved) {

                try {

                    this.currentUser =
                        JSON.parse(saved);

                } catch (error) {

                    console.warn(
                        '[AUTH] currentUser không hợp lệ.'
                    );

                    this.clearSession();

                }

            }


            /*
             * Nếu đã có session
             */
            if (this.currentUser) {

                /*
                 * Kiểm tra lại user trong CSDL
                 */
                const valid =
                    await this.refreshCurrentUser();


                if (!valid) {

                    this.clearSession();

                }

            }


            /*
             * Khôi phục tài khoản đã nhớ
             */
            this.restoreRememberedUsername();


            /*
             * Cập nhật giao diện
             */
            this.updateUI();


            /*
             * Hiển thị màn hình tương ứng
             */
            this.checkAuthState();


            return this.currentUser;

        } catch (error) {

            console.error(
                '[AUTH] Lỗi khởi tạo:',
                error
            );

            this.currentUser = null;

            this.checkAuthState();

            return null;
        }

    },


    /**
     * ========================================================
     * ĐĂNG NHẬP
     * ========================================================
     *
     * Đăng nhập trực tiếp bằng:
     *
     *   ma_cb
     *   mat_khau
     *
     * từ bảng can_bo.
     *
     * Lưu ý:
     * Đây là cơ chế chuyển tiếp.
     *
     * Khi hệ thống hoàn thiện:
     * nên chuyển sang Supabase Auth.
     *
     * ========================================================
     */
    async handleLogin(event) {

        if (event) {

            event.preventDefault();

        }


        const usernameInput =
            document.getElementById(
                'username'
            );


        const passwordInput =
            document.getElementById(
                'password'
            );


        const rememberCheckbox =
            document.getElementById(
                'rememberMe'
            );


        const errorDiv =
            document.getElementById(
                'login-error'
            );


        const submitBtn =
            document.getElementById(
                'login-submit-btn'
            );


        if (!usernameInput || !passwordInput) {

            console.error(
                '[AUTH] Không tìm thấy form đăng nhập.'
            );

            return false;

        }


        const maCb =
            usernameInput.value.trim();


        const matKhau =
            passwordInput.value;


        const remember =
            rememberCheckbox
                ? rememberCheckbox.checked
                : false;


        /*
         * Xóa lỗi cũ
         */

        if (errorDiv) {

            errorDiv.textContent = '';

            errorDiv.classList.add('hidden');

        }


        /*
         * Kiểm tra dữ liệu
         */

        if (!maCb || !matKhau) {

            this.showLoginError(
                'Vui lòng nhập đầy đủ mã cán bộ và mật khẩu.'
            );

            return false;

        }


        /*
         * Disable nút
         */

        const oldButtonText =
            submitBtn
                ? submitBtn.innerHTML
                : 'Đăng nhập';


        if (submitBtn) {

            submitBtn.disabled = true;

            submitBtn.innerHTML =
                '<i class="fa-solid fa-spinner fa-spin"></i> Đang đăng nhập...';

        }


        try {

            console.log(
                '[AUTH] Đang xác thực:',
                maCb
            );


            /*
             * ==================================================
             * TRUY VẤN CAN_BO
             * ==================================================
             *
             * QUAN TRỌNG:
             * dùng ma_cb, KHÔNG dùng ma_can_bo.
             */

            const {
                data,
                error
            } = await supabase

                .from('can_bo')

                .select('*')

                .eq('ma_cb', maCb)

                .eq('mat_khau', matKhau)

                .maybeSingle();


            if (error) {

                throw error;

            }


            if (!data) {

                throw new Error(
                    'Mã cán bộ hoặc mật khẩu không chính xác.'
                );

            }


            /*
             * Kiểm tra trạng thái nếu CSDL có trường
             * trang_thai.
             */

            if (
                Object.prototype.hasOwnProperty.call(
                    data,
                    'trang_thai'
                )
            ) {

                const status =
                    String(
                        data.trang_thai ?? ''
                    )
                    .trim()
                    .toLowerCase();


                if (
                    [
                        'false',
                        '0',
                        'khóa',
                        'khoa',
                        'inactive',
                        'disabled'
                    ].includes(status)
                ) {

                    throw new Error(
                        'Tài khoản cán bộ đang bị khóa.'
                    );

                }

            }


            /*
             * ==================================================
             * CHUẨN HÓA USER
             * ==================================================
             */

            this.currentUser =
                this.normalizeUser(data);


            /*
             * Lưu phiên
             */

            this.saveSession();


            /*
             * Ghi nhớ tài khoản
             */

            if (remember) {

                localStorage.setItem(
                    this.REMEMBER_KEY,
                    maCb
                );

            } else {

                localStorage.removeItem(
                    this.REMEMBER_KEY
                );

            }


            /*
             * Cập nhật UI
             */

            this.updateUI();

            this.checkAuthState();


            /*
             * Thông báo
             */

            if (
                typeof window.showToast ===
                'function'
            ) {

                window.showToast(
                    'Đăng nhập thành công.',
                    'success'
                );

            }


            console.log(
                '[AUTH] Đăng nhập thành công:',
                this.currentUser
            );


            /*
             * Thông báo cho các module khác
             */

            document.dispatchEvent(

                new CustomEvent(
                    'auth-login',
                    {
                        detail: {
                            user:
                                this.currentUser
                        }
                    }
                )

            );


            return true;

        } catch (error) {

            console.error(
                '[AUTH] Login error:',
                error
            );


            this.showLoginError(
                this.translateError(
                    error
                )
            );


            return false;

        } finally {

            if (submitBtn) {

                submitBtn.disabled = false;

                submitBtn.innerHTML =
                    oldButtonText;

            }

        }

    },


    /**
     * ========================================================
     * CHUẨN HÓA USER
     * ========================================================
     */
    normalizeUser(data) {

        const user = {
            ...data,

            ma_cb:
                data.ma_cb ??
                data.ma_can_bo ??
                '',

            ho_ten:
                data.ho_ten ??
                '',

            vai_tro:
                data.vai_tro ??
                'Cán bộ',

            chuc_vu:
                data.chuc_vu ??
                '',

            lop_quan_ly:
                data.lop_quan_ly ??
                '',

            vai_tro_list:
                this.normalizeRoles(data),

            quyen_tabs:
                this.normalizePermissions(data),

            loginTime:
                new Date().toISOString()
        };


        /*
         * Không sử dụng ma_can_bo
         * trong dữ liệu chuẩn.
         */

        delete user.ma_can_bo;


        return user;

    },


    /**
     * ========================================================
     * CHUẨN HÓA VAI TRÒ
     * ========================================================
     */
    normalizeRoles(data) {

        if (
            Array.isArray(
                data.vai_tro_list
            )
        ) {

            return data.vai_tro_list;

        }


        if (
            Array.isArray(
                data.vai_tro
            )
        ) {

            return data.vai_tro;

        }


        if (
            typeof data.vai_tro ===
            'string'
        ) {

            return data.vai_tro

                .split(',')

                .map(
                    x => x.trim()
                )

                .filter(Boolean);

        }


        return [];

    },


    /**
     * ========================================================
     * CHUẨN HÓA QUYỀN TAB
     * ========================================================
     */
    normalizePermissions(data) {

        if (
            Array.isArray(
                data.quyen_tabs
            )
        ) {

            return data.quyen_tabs;

        }


        if (
            typeof data.quyen_tabs ===
            'string'
        ) {

            try {

                const parsed =
                    JSON.parse(
                        data.quyen_tabs
                    );


                if (
                    Array.isArray(
                        parsed
                    )
                ) {

                    return parsed;

                }

            } catch (error) {

                return data.quyen_tabs

                    .split(',')

                    .map(
                        x => x.trim()
                    )

                    .filter(Boolean);

            }

        }


        /*
         * Admin mặc định được tất cả
         */

        if (
            this.isAdmin(data)
        ) {

            return [
                'students',
                'import',
                'staff',
                'schedule',
                'transfer',
                'criteria',
                'permissions'
            ];

        }


        return [];

    },


    /**
     * ========================================================
     * KIỂM TRA ADMIN
     * ========================================================
     */
    isAdmin(user = this.currentUser) {

        if (!user) {

            return false;

        }


        const roles =
            this.normalizeRoles(
                user
            );


        return roles.some(
            role => {

                const value =
                    String(
                        role
                    )
                    .trim()
                    .toLowerCase();


                return [

                    'admin',

                    'administrator',

                    'quan_tri',

                    'quản trị',

                    'quản trị hệ thống',

                    'ban giám hiệu',

                    'ban giam hieu'

                ].includes(value);

            }
        );

    },


    /**
     * ========================================================
     * KIỂM TRA QUYỀN TAB
     * ========================================================
     */
    hasTabPermission(
        tab,
        user = this.currentUser
    ) {

        if (!user) {

            return false;

        }


        /*
         * Admin có toàn quyền.
         */

        if (
            this.isAdmin(user)
        ) {

            return true;

        }


        const permissions =
            Array.isArray(
                user.quyen_tabs
            )
                ? user.quyen_tabs
                : [];


        return permissions.includes(
            tab
        );

    },


    /**
     * ========================================================
     * KIỂM TRA SESSION
     * ========================================================
     */
    isLoggedIn() {

        return !!this.currentUser;

    },


    /**
     * ========================================================
     * LẤY USER
     * ========================================================
     */
    getCurrentUser() {

        return this.currentUser;

    },


    /**
     * ========================================================
     * LƯU SESSION
     * ========================================================
     */
    saveSession() {

        if (!this.currentUser) {

            return;

        }


        localStorage.setItem(

            this.STORAGE_KEY,

            JSON.stringify(
                this.currentUser
            )

        );

    },


    /**
     * ========================================================
     * XÓA SESSION
     * ========================================================
     */
    clearSession() {

        localStorage.removeItem(
            this.STORAGE_KEY
        );

        this.currentUser = null;

    },


    /**
     * ========================================================
     * KIỂM TRA USER TRONG CSDL
     * ========================================================
     */
    async refreshCurrentUser() {

        if (!this.currentUser) {

            return false;

        }


        const maCb =
            this.currentUser.ma_cb;


        if (!maCb) {

            return false;

        }


        try {

            const {
                data,
                error
            } = await supabase

                .from('can_bo')

                .select('*')

                .eq('ma_cb', maCb)

                .maybeSingle();


            if (error) {

                console.warn(
                    '[AUTH] Không thể refresh user:',
                    error
                );

                /*
                 * Không tự logout khi mạng lỗi.
                 */

                return true;

            }


            if (!data) {

                return false;

            }


            this.currentUser =
                this.normalizeUser(
                    data
                );


            this.saveSession();


            return true;

        } catch (error) {

            console.error(
                '[AUTH] refreshCurrentUser:',
                error
            );

            return true;

        }

    },


    /**
     * ========================================================
     * KIỂM TRA TRẠNG THÁI AUTH
     * ========================================================
     */
    checkAuthState() {

        const loginModal =
            document.getElementById(
                'login-modal'
            );


        const loginScreen =
            document.getElementById(
                'login-screen'
            );


        const appContainer =
            document.getElementById(
                'app-container'
            );


        const appScreen =
            document.getElementById(
                'app-screen'
            );


        const isLoggedIn =
            !!this.currentUser;


        /*
         * Login modal kiểu mới
         */

        if (loginModal) {

            loginModal.classList.toggle(
                'hidden',
                isLoggedIn
            );

        }


        /*
         * Login screen kiểu cũ
         */

        if (loginScreen) {

            loginScreen.style.display =
                isLoggedIn
                    ? 'none'
                    : 'flex';

        }


        /*
         * App container
         */

        if (appContainer) {

            appContainer.classList.toggle(
                'hidden',
                !isLoggedIn
            );

            appContainer.classList.toggle(
                'flex',
                isLoggedIn
            );

        }


        /*
         * App screen
         */

        if (appScreen) {

            appScreen.style.display =
                isLoggedIn
                    ? 'block'
                    : 'none';

        }


        /*
         * Nếu có user:
         * khởi tạo dashboard
         */

        if (isLoggedIn) {

            this.updateUI();


            document.dispatchEvent(

                new CustomEvent(
                    'auth-ready',
                    {
                        detail: {
                            user:
                                this.currentUser
                        }
                    }
                )

            );

        }

    },


    /**
     * ========================================================
     * CẬP NHẬT UI USER
     * ========================================================
     */
    updateUI() {

        const user =
            this.currentUser;


        if (!user) {

            return;

        }


        const name =
            user.ho_ten ||
            user.ma_cb ||
            'Cán bộ';


        const role =
            user.vai_tro ||
            'Cán bộ';


        const elements = [

            'display-fullname',

            'display-user-name',

            'userName'

        ];


        elements.forEach(
            id => {

                const el =
                    document.getElementById(
                        id
                    );


                if (!el) return;


                if (
                    id ===
                    'display-user-name'
                ) {

                    el.textContent =
                        `Xin chào, ${name}`;

                } else {

                    el.textContent =
                        name;

                }

            }
        );


        const roleElements = [

            'display-role',

            'display-user-role',

            'userRole'

        ];


        roleElements.forEach(
            id => {

                const el =
                    document.getElementById(
                        id
                    );


                if (el) {

                    el.textContent =
                        role;

                }

            }
        );


        /*
         * Avatar
         */

        const avatar =
            document.getElementById(
                'userAvatar'
            );


        if (avatar) {

            const parts =
                name
                    .trim()
                    .split(/\s+/);


            avatar.textContent =
                parts
                    .slice(-2)
                    .map(
                        x =>
                            x
                                .charAt(0)
                                .toUpperCase()
                    )
                    .join('');

        }

    },


    /**
     * ========================================================
     * GHI NHỚ USERNAME
     * ========================================================
     */
    restoreRememberedUsername() {

        const input =
            document.getElementById(
                'username'
            );


        const checkbox =
            document.getElementById(
                'rememberMe'
            );


        if (!input) {

            return;

        }


        const saved =
            localStorage.getItem(
                this.REMEMBER_KEY
            );


        if (saved) {

            input.value =
                saved;


            if (checkbox) {

                checkbox.checked =
                    true;

            }

        }

    },


    /**
     * ========================================================
     * ĐĂNG XUẤT
     * ========================================================
     */
    logout(
        askConfirm = true
    ) {

        if (
            askConfirm &&
            !confirm(
                'Bạn có chắc chắn muốn đăng xuất khỏi hệ thống?'
            )
        ) {

            return;

        }


        /*
         * Dừng QR scanner nếu có
         */

        if (
            window.Tab1QR &&
            typeof
            window.Tab1QR.stopScanner ===
            'function'
        ) {

            try {

                window.Tab1QR.stopScanner();

            } catch (error) {

                console.warn(
                    '[AUTH] Không thể dừng QR:',
                    error
                );

            }

        }


        this.clearSession();


        /*
         * Xóa password khỏi form
         */

        const password =
            document.getElementById(
                'password'
            );


        if (password) {

            password.value = '';

        }


        this.checkAuthState();


        document.dispatchEvent(

            new CustomEvent(
                'auth-logout'
            )

        );

    },


    /**
     * ========================================================
     * HIỂN THỊ LỖI
     * ========================================================
     */
    showLoginError(message) {

        const errorDiv =
            document.getElementById(
                'login-error'
            );


        if (errorDiv) {

            errorDiv.textContent =
                message;

            errorDiv.classList.remove(
                'hidden'
            );

            return;

        }


        if (
            typeof window.showToast ===
            'function'
        ) {

            window.showToast(
                message,
                'error'
            );

        } else {

            alert(message);

        }

    },


    /**
     * ========================================================
     * DỊCH LỖI
     * ========================================================
     */
    translateError(error) {

        if (!error) {

            return 'Không thể đăng nhập.';

        }


        const message =
            String(
                error.message ||
                error
            );


        if (
            message.includes(
                'Failed to fetch'
            )
        ) {

            return (
                'Không thể kết nối Supabase. ' +
                'Vui lòng kiểm tra Internet.'
            );

        }


        if (
            message.includes(
                'column'
            ) &&
            message.includes(
                'does not exist'
            )
        ) {

            return (
                'Cấu trúc bảng can_bo chưa khớp với chương trình. ' +
                'Vui lòng kiểm tra trường ma_cb.'
            );

        }


        return message;

    }

};


/* ============================================================
   GÁN GLOBAL
============================================================= */

window.Auth = Auth;


/* ============================================================
   FORM LOGIN
============================================================= */

document.addEventListener(
    'DOMContentLoaded',
    function() {

        const loginForm =
            document.getElementById(
                'login-form'
            );


        if (loginForm) {

            loginForm.addEventListener(
                'submit',
                event => {

                    Auth.handleLogin(
                        event
                    );

                }
            );

        }


        Auth.init();

    }
);


/* ============================================================
   EXPORT
============================================================= */

export default Auth;

export {
    Auth
};
