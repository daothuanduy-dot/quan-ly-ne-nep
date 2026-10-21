# V3.0.5.25.47 — Formula builder

Baseline: uploaded GitHub ZIP (UI shows V3.0.5.25.44; internal config.js imports may differ).

## Modified
- sw.js
- index.html
- css/app.css
- js/admin.js
- js/login-bootstrap.js

## Added
- js/formula-admin.js
- js/formula-engine.js
- supabase/migrations/20261021_qlnn_cong_thuc_thi_dua.sql

## Unchanged (byte-identical)
- README.md
- README_PWA_WEB_PUSH.md
- manifest.webmanifest
- css/styles.css
- css/app.js
- js/pwa.js
- js/baovang-v25.js
- js/quantri-tieuchi.js
- js/quantri-import.js
- js/tab3-chamdiem.js
- js/quantri-hocsinh.js
- js/tab5-xeploai.js
- js/quantri-phanquyen.js
- js/qr-v24.js
- js/portal.js
- js/auth.js
- js/baovang.js
- js/thongke.js
- js/quantri-canbo.js
- js/criteria-defaults.js
- js/config.js
- js/app.js
- js/tab4-thongke.js
- js/baovang-v24.js
- js/pwa-push.js
- js/qr.js
- js/quantri-tkb.js
- js/thongbao.js
- js/chamdiem.js
- js/quantri-ketchuyen.js
- js/tab1-qr.js
- js/push-events.js
- js/xeploai.js
- js/ui.js
- js/reset-parent.js
- js/tab6-quantri.js
- js/tab2-baovang.js
- icons/icon-512.png
- icons/icon-192.png

## Important
- SQL migration creates qlnn_cong_thuc_thi_dua with RLS enabled but no policies. Saving/loading formulas requires admin-only access policy compatible with the real auth model. Do NOT add anonymous write policies.
- Formula builder is configuration UI and isolated formula preview only; it does NOT yet change actual competition scoring, ranking, or historical results.
- Formula values in preview are manually supplied counts.
- SQL is not executed automatically.
- No deployment to GitHub or Supabase was performed.
