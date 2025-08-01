import { initNhapHang } from './modules/nhapHang.js';
import { initBanHang } from './modules/banHang.js';
import { initMenu } from './modules/menu.js';
import { initBaoCao } from './modules/baoCao.js';

// Hàm này sẽ chạy khi toàn bộ trang web đã được tải xong
document.addEventListener('DOMContentLoaded', () => { 
    console.log("Ứng dụng đã sẵn sàng!");
    
    // Khởi tạo chức năng chuyển đổi tab
    initTabs();

    // Khởi tạo module Quản lý Menu (phải chạy trước Bán Hàng)
    initMenu();

    // Khởi tạo module Nhập Hàng
    initNhapHang();
    
    // Khởi tạo module Bán Hàng
    initBanHang();

    // Khởi tạo module Báo Cáo
    initBaoCao();
});

function initTabs() {
    const tabLinks = document.querySelectorAll('.tab-link');
    const tabContents = document.querySelectorAll('.tab-content');

    tabLinks.forEach(link => {
        link.addEventListener('click', () => {
            const tabId = link.dataset.tab;

            tabLinks.forEach(l => l.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            link.classList.add('active');
            document.getElementById(tabId).classList.add('active');
        });
    });
}
