import { db, collection, query, where, getDocs, Timestamp, orderBy } from '../config/firebase.js';
import { currencyFormatter } from '../utils/formatters.js';

// --- Lấy các phần tử HTML ---
const inputChonThangBaoCao = document.getElementById('chon-thang-bao-cao');
const btnXemBaoCaoThang = document.getElementById('btn-xem-bao-cao-tong-quan');
const statDoanhThu = document.getElementById('stat-doanh-thu');
const statChiPhi = document.getElementById('stat-chi-phi');
const statLoiNhuan = document.getElementById('stat-loi-nhuan');
const bangChiTietDoanhThu = document.getElementById('bang-chi-tiet-doanh-thu');
const bangChiTietChiPhi = document.getElementById('bang-chi-tiet-chi-phi');
const profitChartCanvas = document.getElementById('profit-chart');

// Báo cáo theo ngày
const inputChonNgayBaoCao = document.getElementById('chon-ngay-bao-cao');
const btnXemBaoCaoNgay = document.getElementById('btn-xem-bao-cao-ngay');
const statDoanhThuNgay = document.getElementById('stat-doanh-thu-ngay');
const statChiPhiNgay = document.getElementById('stat-chi-phi-ngay');
const statLoiNhuanNgay = document.getElementById('stat-loi-nhuan-ngay');

// --- Biến trạng thái ---
let profitChartInstance = null;

/**
 * Hàm trợ giúp để lấy tổng tiền từ một collection trong một khoảng thời gian.
 * @param {string} collectionName Tên của collection.
 * @param {string} dateField Tên trường chứa dữ liệu ngày tháng (Timestamp).
 * @param {string} amountField Tên trường chứa dữ liệu số tiền.
 * @param {Date} startDate Ngày bắt đầu.
 * @param {Date} endDate Ngày kết thúc.
 * @returns {Promise<number>} Tổng số tiền.
 */
async function getTotalAmountInRange(collectionName, dateField, amountField, startDate, endDate) {
    const q = query(
        collection(db, collectionName),
        where(dateField, '>=', startDate),
        where(dateField, '<', endDate)
    );
    const querySnapshot = await getDocs(q);
    let total = 0;
    querySnapshot.forEach(doc => {
        total += doc.data()[amountField];
    });
    return total;
}

/**
 * Hiển thị báo cáo tổng quan (doanh thu, chi phí, lợi nhuận) cho tháng được chọn.
 */
async function hienThiBaoCaoTongQuan() {
    const [year, month] = inputChonThangBaoCao.value.split('-').map(Number);
    if (!year || !month) return;

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    // Lấy dữ liệu
    const [totalRevenue, totalCost, salesDetails, costDetails] = await Promise.all([
        getTotalAmountInRange('QuyetC1_lich_su_ban_hang', 'ngay_thanh_toan', 'tong_tien', startDate, endDate),
        getTotalAmountInRange('QuyetC1_lich_su_nhap_hang', 'ngay_nhap', 'thanh_tien', startDate, endDate),
        getDocs(query(collection(db, 'QuyetC1_lich_su_ban_hang'), where('ngay_thanh_toan', '>=', startDate), where('ngay_thanh_toan', '<', endDate), orderBy('ngay_thanh_toan', 'desc'))),
        getDocs(query(collection(db, 'QuyetC1_lich_su_nhap_hang'), where('ngay_nhap', '>=', startDate), where('ngay_nhap', '<', endDate), orderBy('ngay_nhap', 'desc')))
    ]);

    const profit = totalRevenue - totalCost;

    // Cập nhật các ô thống kê
    statDoanhThu.textContent = currencyFormatter.format(totalRevenue);
    statChiPhi.textContent = currencyFormatter.format(totalCost);
    statLoiNhuan.textContent = currencyFormatter.format(profit);

    // Hiển thị bảng chi tiết doanh thu
    bangChiTietDoanhThu.innerHTML = `
        <thead>
            <tr>
                <th>Ngày Thanh Toán</th>
                <th>Bàn</th>
                <th>Tổng Tiền</th>
            </tr>
        </thead>
        <tbody>
            ${salesDetails.docs.map(doc => {
                const data = doc.data();
                return `
                    <tr>
                        <td>${data.ngay_thanh_toan.toDate().toLocaleString('vi-VN')}</td>
                        <td>${data.ten_ban}</td>
                        <td>${currencyFormatter.format(data.tong_tien)}</td>
                    </tr>
                `;
            }).join('')}
        </tbody>
    `;
    if (salesDetails.empty) {
        bangChiTietDoanhThu.querySelector('tbody').innerHTML = `<tr><td colspan="3" style="text-align:center;">Không có hóa đơn nào trong tháng này.</td></tr>`;
    }

    // Hiển thị bảng chi tiết chi phí
    const costTableBody = bangChiTietChiPhi.querySelector('tbody');
    costTableBody.innerHTML = costDetails.docs.map(doc => {
        const data = doc.data();
        return `
            <tr>
                <td>${data.ngay_nhap.toDate().toLocaleDateString('vi-VN')}</td>
                <td>${data.ten_san_pham}</td>
                <td>${data.so_luong}</td>
                <td>${data.don_vi_tinh}</td>
                <td>${currencyFormatter.format(data.don_gia)}</td>
                <td>${currencyFormatter.format(data.thanh_tien)}</td>
            </tr>
        `;
    }).join('');

    if (costDetails.empty) {
        costTableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;">Không có chi phí nào trong tháng này.</td></tr>`;
    }
}

/**
 * Hiển thị báo cáo (doanh thu, chi phí, lợi nhuận) cho ngày được chọn.
 */
async function hienThiBaoCaoNgay() {
    const selectedDateValue = inputChonNgayBaoCao.value;
    if (!selectedDateValue) return;

    // Đặt múi giờ để tính toán ngày chính xác
    const startDate = new Date(selectedDateValue + 'T00:00:00');
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 1);

    // Lấy dữ liệu
    const [dailyRevenue, dailyCost] = await Promise.all([
        getTotalAmountInRange('QuyetC1_lich_su_ban_hang', 'ngay_thanh_toan', 'tong_tien', startDate, endDate),
        getTotalAmountInRange('QuyetC1_lich_su_nhap_hang', 'ngay_nhap', 'thanh_tien', startDate, endDate)
    ]);

    const dailyProfit = dailyRevenue - dailyCost;

    // Cập nhật các ô thống kê
    statDoanhThuNgay.textContent = currencyFormatter.format(dailyRevenue);
    statChiPhiNgay.textContent = currencyFormatter.format(dailyCost);
    statLoiNhuanNgay.textContent = currencyFormatter.format(dailyProfit);
}

/**
 * Lấy dữ liệu và vẽ biểu đồ lợi nhuận 6 tháng gần nhất.
 */
async function hienThiBieuDoLoiNhuan() {
    const labels = [];
    const profitData = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const year = date.getFullYear();
        const month = date.getMonth();

        const startDate = new Date(year, month, 1);
        const endDate = new Date(year, month + 1, 1);

        const [monthlyRevenue, monthlyCost] = await Promise.all([
            getTotalAmountInRange('QuyetC1_lich_su_ban_hang', 'ngay_thanh_toan', 'tong_tien', startDate, endDate),
            getTotalAmountInRange('QuyetC1_lich_su_nhap_hang', 'ngay_nhap', 'thanh_tien', startDate, endDate)
        ]);

        labels.push(`T${month + 1}/${year}`);
        profitData.push(monthlyRevenue - monthlyCost);
    }

    // Hủy biểu đồ cũ nếu tồn tại để vẽ lại
    if (profitChartInstance) {
        profitChartInstance.destroy();
    }

    // Vẽ biểu đồ mới
    const ctx = profitChartCanvas.getContext('2d');
    profitChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Lợi Nhuận (VND)',
                data: profitData,
                backgroundColor: 'rgba(46, 204, 113, 0.7)',
                borderColor: 'rgba(46, 204, 113, 1)',
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return value.toLocaleString('vi-VN') + 'đ';
                        }
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += currencyFormatter.format(context.parsed.y);
                            }
                            return label;
                        }
                    }
                }
            }
        }
    });
}

/**
 * Đặt tháng báo cáo mặc định là tháng hiện tại.
 */
function setInitialReportMonth() {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    inputChonThangBaoCao.value = `${year}-${month}`;
}

/**
 * Đặt ngày báo cáo mặc định là ngày hôm nay.
 */
function setInitialReportDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    inputChonNgayBaoCao.value = `${year}-${month}-${day}`;
}

/**
 * Hàm khởi tạo cho module báo cáo.
 */
export function initBaoCao() {
    setInitialReportMonth();
    setInitialReportDate();

    // Gắn sự kiện cho các nút xem báo cáo
    btnXemBaoCaoThang.addEventListener('click', hienThiBaoCaoTongQuan);
    btnXemBaoCaoNgay.addEventListener('click', hienThiBaoCaoNgay);

    // Tải dữ liệu lần đầu khi mở tab Báo cáo
    hienThiBaoCaoTongQuan();
    hienThiBaoCaoNgay();
    hienThiBieuDoLoiNhuan();
}
