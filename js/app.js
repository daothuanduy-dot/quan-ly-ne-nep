/**
 * ============================================================
 * APP.JS
 * Điều khiển ứng dụng chính
 * THPT Lê Hồng Phong
 *
 * Không xử lý đăng nhập trực tiếp.
 *
 * Đăng nhập:
 *     auth.js
 *
 * Cấu hình:
 *     config.js
 *
 * App:
 *     app.js
 *
 * ============================================================
 */

import Auth from './auth.js';

import {
    appConfig,
    supabase
} from './config.js';


/* ============================================================
   APP
============================================================= */

const App = {

    currentUser: null,


    /**
     * ========================================================
     * INIT
     * ========================================================
     */
    async init() {

        console.log(
            '[APP] Khởi tạo ứng dụng...'
        );


        /*
         * Lấy user hiện tại
         */

        this.currentUser =
            Auth.getCurrentUser();


        /*
         * Thiết lập giao diện
         */

        this.bindEvents();


        /*
         * Thiết lập sub-tab quản trị
         */

        this.initAdminTabs();


        /*
         * Theo dõi sự kiện đăng nhập
         */

        document.addEventListener(
            'auth-login',
            event => {

                this.currentUser =
                    event.detail.user;

                this.onLogin(
                    this.currentUser
                );

            }
        );


        /*
         * Theo dõi logout
         */

        document.addEventListener(
            'auth-logout',
            () => {

                this.currentUser =
                    null;

                this.onLogout();

            }
        );


        /*
         * Nếu đã đăng nhập
         */

        if (
            this.currentUser
        ) {

            this.onLogin(
                this.currentUser
            );

        }


        console.log(
            '[APP] Ứng dụng đã khởi tạo.'
        );

    },


    /**
     * ========================================================
     * EVENTS
     * ========================================================
     */
    bindEvents() {


        /*
         * Nút logout
         */

        const logoutButtons =
            document.querySelectorAll(
                '#btnLogout, #btn-logout'
            );


        logoutButtons.forEach(
            button => {

                button.addEventListener(
                    'click',
                    event => {

                        event.preventDefault();

                        Auth.logout();

                    }
                );

            }
        );


        /*
         * Toggle password
         */

        const passwordToggle =
            document.getElementById(
                'togglePassword'
            );


        if (passwordToggle) {

            passwordToggle.addEventListener(
                'click',
                () => {

                    this.togglePassword();

                }
            );

        }


        /*
         * Nút refresh
         */

        const refreshButton =
            document.getElementById(
                'btnRefresh'
            );


        if (refreshButton) {

            refreshButton.addEventListener(
                'click',
                () => {

                    window.location.reload();

                }
            );

        }

    },


    /**
     * ========================================================
     * PASSWORD
     * ========================================================
     */
    togglePassword() {

        const input =
            document.getElementById(
                'password'
            );


        if (!input) {

            return;

        }


        const icon =
            document.getElementById(
                'eyeIcon'
            );


        if (
            input.type ===
            'password'
        ) {

            input.type =
                'text';


            if (icon) {

                icon.textContent =
                    '🙈';

            }

        } else {

            input.type =
                'password';


            if (icon) {

                icon.textContent =
                    '👁️';

            }

        }

    },


    /**
     * ========================================================
     * LOGIN
     * ========================================================
     */
    onLogin(user) {

        this.currentUser =
            user;


        console.log(
            '[APP] User:',
            user
        );


        /*
         * Cập nhật thông tin người dùng
         */

        Auth.updateUI();


        /*
         * Phân quyền giao diện
         */

        this.applyPermissions();


        /*
         * Khởi tạo các module
         */

        this.initializeModules();

    },


    /**
     * ========================================================
     * LOGOUT
     * ========================================================
     */
    onLogout() {

        console.log(
            '[APP] User đã đăng xuất.'
        );


        /*
         * Có thể reset các module
         * nếu cần.
         */

        this.currentUser =
            null;

    },


    /**
     * ========================================================
     * KHỞI TẠO CÁC MODULE
     * ========================================================
     */
    initializeModules() {


        /*
         * Tab 1
         */

        if (
            window.Tab1QR &&
            typeof
            window.Tab1QR.init ===
            'function'
        ) {

            try {

                window.Tab1QR.init();

            } catch (error) {

                console.error(
                    '[APP] Tab1QR:',
                    error
                );

            }

        }


        /*
         * Các module khác của hệ thống
         * sẽ tự khởi tạo nếu đã có.
         */

        const modules = [

            'Tab2BaoVang',

            'Tab3ChamDiem',

            'Tab4ThongKe',

            'Tab5XepLoai',

            'QuanTriHocSinh',

            'QuanTriImport',

            'QuanTriCanBo',

            'QuanTriTKB',

            'QuanTriKetChuyen',

            'QuanTriTieuChi',

            'QuanTriPhanQuyen'

        ];


        modules.forEach(
            moduleName => {

                const module =
                    window[
                        moduleName
                    ];


                if (
                    module &&
                    typeof module.init ===
                    'function'
                ) {

                    try {

                        module.init();

                    } catch (error) {

                        console.error(
                            `[APP] ${moduleName}:`,
                            error
                        );

                    }

                }

            }
        );

    },


    /**
     * ========================================================
     * PHÂN QUYỀN GIAO DIỆN
     * ========================================================
     */
    applyPermissions() {

        const user =
            Auth.getCurrentUser();


        if (!user) {

            return;

        }


        /*
         * Admin:
         * hiển thị tất cả.
         */

        const isAdmin =
            Auth.isAdmin(
                user
            );


        /*
         * ==================================================
         * QUYỀN CÁC TAB CHÍNH
         * ==================================================
         */

        const mainTabPermissions = {

            'tab1':
                'qr',

            'tab2':
                'baovang',

            'tab3':
                'chamdiem',

            'tab4':
                'thongke',

            'tab5':
                'xeploai',

            'tab6':
                'admin'

        };


        Object.entries(
            mainTabPermissions
        ).forEach(
            ([tabId, permission]) => {

                const elements =
                    document.querySelectorAll(
                        `[data-permission="${permission}"]`
                    );


                elements.forEach(
                    element => {

                        const allowed =
                            isAdmin ||
                            Auth.hasTabPermission(
                                permission,
                                user
                            );


                        element.style.display =
                            allowed
                                ? ''
                                : 'none';

                    }
                );

            }
        );


        /*
         * ==================================================
         * QUYỀN 7 SUB TAB QUẢN TRỊ
         * ==================================================
         */

        const adminTabs =
            document.querySelectorAll(
                '.admin-tab[data-tab]'
            );


        adminTabs.forEach(
            tab => {

                const permission =
                    tab.dataset.tab;


                const allowed =
                    isAdmin ||
                    Auth.hasTabPermission(
                        permission,
                        user
                    );


                tab.style.display =
                    allowed
                        ? ''
                        : 'none';

            }
        );


        /*
         * ==================================================
         * Nếu tab hiện tại bị cấm
         * thì chọn tab đầu tiên được phép.
         * ==================================================
         */

        this.selectFirstAllowedAdminTab();

    },


    /**
     * ========================================================
     * CHỌN SUB TAB ĐƯỢC PHÉP
     * ========================================================
     */
    selectFirstAllowedAdminTab() {

        const visible =
            Array.from(
                document.querySelectorAll(
                    '.admin-tab[data-tab]'
                )
            )
            .filter(
                tab =>
                    tab.style.display !==
                    'none'
            );


        if (!visible.length) {

            return;

        }


        const active =
            document.querySelector(
                '.admin-tab.active'
            );


        if (
            active &&
            active.style.display !==
            'none'
        ) {

            return;

        }


        visible[0].click();

    },


    /**
     * ========================================================
     * KHỞI TẠO 7 SUB TAB QUẢN TRỊ
     * ========================================================
     */
    initAdminTabs() {

        const buttons =
            document.querySelectorAll(
                '.admin-tab[data-tab]'
            );


        const contents =
            document.querySelectorAll(
                '.admin-content'
            );


        buttons.forEach(
            button => {

                button.addEventListener(
                    'click',
                    () => {

                        const target =
                            button.dataset.tab;


                        /*
                         * Nếu user không có quyền
                         */

                        if (
                            this.currentUser &&
                            !Auth.isAdmin(
                                this.currentUser
                            ) &&
                            !Auth.hasTabPermission(
                                target,
                                this.currentUser
                            )
                        ) {

                            if (
                                typeof window.showToast ===
                                'function'
                            ) {

                                window.showToast(
                                    'Bạn không có quyền sử dụng chức năng này.',
                                    'error'
                                );

                            }

                            return;

                        }


                        /*
                         * Active button
                         */

                        buttons.forEach(
                            btn => {

                                btn.classList.remove(
                                    'active'
                                );

                            }
                        );


                        button.classList.add(
                            'active'
                        );


                        /*
                         * Active content
                         */

                        contents.forEach(
                            content => {

                                content.classList.remove(
                                    'active'
                                );

                            }
                        );


                        const content =
                            document.getElementById(
                                `content-${target}`
                            );


                        if (content) {

                            content.classList.add(
                                'active'
                            );

                        }


                        /*
                         * Thông báo module
                         */

                        document.dispatchEvent(

                            new CustomEvent(
                                'admin-tab-changed',
                                {
                                    detail: {
                                        tab:
                                            target
                                    }
                                }
                            )

                        );

                    }
                );

            }
        );

    },


    /**
     * ========================================================
     * CHUYỂN SUB TAB BẰNG JAVASCRIPT
     * ========================================================
     */
    switchAdminTab(
        tabName
    ) {

        const button =
            document.querySelector(
                `.admin-tab[data-tab="${tabName}"]`
            );


        if (!button) {

            console.warn(
                '[APP] Không tìm thấy tab:',
                tabName
            );

            return;

        }


        if (
            button.style.display ===
            'none'
        ) {

            if (
                typeof window.showToast ===
                'function'
            ) {

                window.showToast(
                    'Bạn không có quyền sử dụng chức năng này.',
                    'error'
                );

            }

            return;

        }


        button.click();

    },


    /**
     * ========================================================
     * KIỂM TRA QUYỀN
     * ========================================================
     */
    can(permission) {

        const user =
            Auth.getCurrentUser();


        if (!user) {

            return false;

        }


        if (
            Auth.isAdmin(
                user
            )
        ) {

            return true;

        }


        return Auth.hasTabPermission(
            permission,
            user
        );

    }

};


/* ============================================================
   GLOBAL
============================================================= */

window.App = App;


/* ============================================================
   BACKWARD COMPATIBILITY
============================================================= */

/*
 * Một số code cũ có thể gọi:
 *
 * switchSubTab(event, id)
 *
 * Giữ lại hàm này để tránh làm hỏng code cũ.
 */

window.switchSubTab = function(
    event,
    subTabId
) {

    if (event) {

        event.preventDefault();

    }


    /*
     * Code cũ dùng ID trực tiếp.
     */

    document
        .querySelectorAll(
            '.sub-tab-btn'
        )
        .forEach(
            btn =>
                btn.classList.remove(
                    'active'
                )
        );


    document
        .querySelectorAll(
            '.sub-tab-pane'
        )
        .forEach(
            pane =>
                pane.classList.remove(
                    'active'
                )
        );


    if (
        event &&
        event.currentTarget
    ) {

        event.currentTarget.classList.add(
            'active'
        );

    }


    const pane =
        document.getElementById(
            subTabId
        );


    if (pane) {

        pane.classList.add(
            'active'
        );

    }

};


/* ============================================================
   DOM READY
============================================================= */

document.addEventListener(
    'DOMContentLoaded',
    async function() {

        try {

            await App.init();

        } catch (error) {

            console.error(
                '[APP] Lỗi khởi tạo:',
                error
            );

        }

    }
);


/* ============================================================
   EXPORT
============================================================= */

export default App;

export {
    App
};
