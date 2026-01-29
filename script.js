/***********************
 * QUẢN LÝ NHÂN VIÊN
 ***********************/
const EMP_KEY = "employees";

function getEmployees() {
    return JSON.parse(localStorage.getItem(EMP_KEY)) || [];
}

function saveEmployees(list) {
    localStorage.setItem(EMP_KEY, JSON.stringify(list));
}

function loadEmployees() {
    const select = document.getElementById("employeeSelect");
    if (!select) return;

    const list = getEmployees();
    select.innerHTML = '<option value="">-- Chọn nhân viên --</option>';

    list.forEach(name => {
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        select.appendChild(option);
    });

    if (list.length > 0) {
        select.value = list[0];
    } else {
        select.value = "";
    }
}

function addEmployee() {
    const name = prompt("Nhập tên nhân viên mới:");
    if (!name || !name.trim()) {
        showToast("Vui lòng nhập tên hợp lệ!", "warning");
        return;
    }

    const trimmedName = name.trim();
    let list = getEmployees();

    if (list.includes(trimmedName)) {
        showToast(`Nhân viên "${trimmedName}" đã tồn tại!`, "warning");
        return;
    }

    list.push(trimmedName);
    saveEmployees(list);
    loadEmployees();
    showToast(`Đã thêm nhân viên "${trimmedName}" thành công! `, "success");
    createTable();
}

function removeEmployee() {
    const select = document.getElementById("employeeSelect");
    const name = select.value?.trim();

    if (!name) {
        showToast("Vui lòng chọn nhân viên để xóa!", "warning");
        return;
    }

    if (!confirm(`Bạn có chắc muốn xóa nhân viên "${name}"?`)) return;

    let list = getEmployees().filter(n => n !== name);
    saveEmployees(list);
    loadEmployees();

    showToast(`Đã xóa nhân viên "${name}"!`, "info");
    createTable();
}

function onEmployeeChange() {
    createTable();
}

/***********************
 * THÁNG / NĂM
 ***********************/
function initMonthYear() {
    const monthSelect = document.getElementById("month");
    const yearSelect = document.getElementById("year");

    if (!monthSelect || !yearSelect) return;

    monthSelect.innerHTML = "";
    for (let m = 1; m <= 12; m++) {
        monthSelect.innerHTML += `<option value="${m}">Tháng ${m}</option>`;
    }

    const currentYear = new Date().getFullYear();
    yearSelect.innerHTML = "";
    for (let y = currentYear - 5; y <= currentYear + 5; y++) {
        yearSelect.innerHTML += `<option value="${y}">${y}</option>`;
    }

    monthSelect.value = new Date().getMonth() + 1;
    yearSelect.value = currentYear;
}

function daysInMonth(month, year) {
    return new Date(year, month, 0).getDate();
}

/***********************
 * KEY LƯU TRỮ
 ***********************/
function getStorageKey() {
    const emp = document.getElementById("employeeSelect")?.value?.trim() || "default";
    const month = document.getElementById("month")?.value || "";
    const year = document.getElementById("year")?.value || "";
    return `chamcong_${emp}_${month}_${year}`;
}

/***********************
 * TẠO BẢNG + LOAD DATA
 ***********************/
function createTable() {
    const month = parseInt(document.getElementById("month")?.value) || 1;
    const year = parseInt(document.getElementById("year")?.value) || new Date().getFullYear();
    const days = daysInMonth(month, year);
    const tbody = document.getElementById("tableBody");

    if (!tbody) return;

    tbody.innerHTML = "";

    const savedData = JSON.parse(localStorage.getItem(getStorageKey())) || {};

    for (let d = 1; d <= days; d++) {
        const rowData = savedData[d] || { in: "", out: "" };
        tbody.innerHTML += `
            <tr>
                <td>${d}/${month.toString().padStart(2, '0')}</td>
                <td><input type="text" placeholder="HH:mm" value="${rowData.in}" onblur="autoFormatTime(this)" onchange="debouncedCalculateRow(this)"></td>
                <td><input type="text" placeholder="HH:mm" value="${rowData.out}" onblur="autoFormatTime(this)" onchange="debouncedCalculateRow(this)"></td>
                <td class="hours">0.00</td>
            </tr>`;
    }

    calculateTotal();
}

/***********************
 * FORMAT & TÍNH GIỜ (CẢI THIỆN HIỆU SUẤT)
 ***********************/
function autoFormatTime(input) {
    let v = input.value.replace(/[^0-9]/g, "");
    if (!v) {
        input.value = "";
        debouncedCalculateRow(input);
        return;
    }

    let h = 0, m = 0;
    if (v.length <= 2) h = parseInt(v, 10);
    else if (v.length === 3) { h = parseInt(v[0], 10); m = parseInt(v.slice(1), 10); }
    else { h = parseInt(v.slice(0,2), 10); m = parseInt(v.slice(2,4), 10); }

    h = Math.min(23, Math.max(0, h));
    m = Math.min(59, Math.max(0, m));

    input.value = `${h.toString().padStart(2,"0")}:${m.toString().padStart(2,"0")}`;
    debouncedCalculateRow(input);
}

// Debounce để tránh tính toán liên tục khi gõ nhanh
let debounceTimer;
function debouncedCalculateRow(el) {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => calculateRow(el), 150); // 150ms delay
}

function calculateRow(el) {
    const row = el.closest("tr");
    if (!row) return;

    const inTime = row.children[1].querySelector("input").value.trim();
    const outTime = row.children[2].querySelector("input").value.trim();
    const hoursCell = row.querySelector(".hours");

    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

    if (!inTime || !outTime || !timeRegex.test(inTime) || !timeRegex.test(outTime)) {
        hoursCell.textContent = "0.00";
        saveData();
        return;
    }

    const [ih, im] = inTime.split(":").map(Number);
    const [oh, om] = outTime.split(":").map(Number);

    let start = ih * 60 + im;
    let end = oh * 60 + om;
    if (end < start) end += 1440;

    hoursCell.textContent = ((end - start) / 60).toFixed(2);
    saveData();
}

/***********************
 * TỔNG GIỜ & LƯƠNG (TỐI ƯU HIỆU SUẤT)
 ***********************/
function calculateTotal() {
    requestAnimationFrame(() => {
        let total = 0;
        const hoursCells = document.querySelectorAll(".hours");
        hoursCells.forEach(cell => {
            total += parseFloat(cell.textContent) || 0;
        });

        const totalHoursEl = document.getElementById("totalHours");
        if (totalHoursEl) totalHoursEl.textContent = total.toFixed(2);

        const rate = parseInt(document.getElementById("salary")?.value) || 0;
        const salary = Math.round(total * rate);
        const totalSalaryEl = document.getElementById("totalSalary");
        if (totalSalaryEl) totalSalaryEl.textContent = salary.toLocaleString("vi-VN");
    });
}

/***********************
 * LƯU DỮ LIỆU
 ***********************/
function saveData() {
    const data = {};
    document.querySelectorAll("#tableBody tr").forEach((row, i) => {
        const inT = row.children[1].querySelector("input").value.trim();
        const outT = row.children[2].querySelector("input").value.trim();
        if (inT || outT) {
            data[i + 1] = { in: inT, out: outT };
        }
    });
    localStorage.setItem(getStorageKey(), JSON.stringify(data));
    calculateTotal(); // Gọi tính tổng sau khi lưu
}

/***********************
 * THÔNG BÁO CHÀO MỪNG
 ***********************/
function showWelcomeToast() {
    if (sessionStorage.getItem("welcomeShown") === "true") return;

    showToast(
        "hnam xin chào <br>" +
        "Chọn nhân viên → nhập giờ → theo dõi lương tự động nhé! ",
        "success"
    );

    sessionStorage.setItem("welcomeShown", "true");
}

/***********************
 * KHỞI ĐỘNG
 ***********************/
function initApp() {
    initMonthYear();

    if (getEmployees().length === 0) {
        saveEmployees(["Nhân viên mẫu"]);
        showToast("Đã tạo nhân viên mẫu đầu tiên cho bạn!", "info");
    }

    loadEmployees();
    createTable();

    document.getElementById("salary")?.addEventListener("change", () => {
        saveData();
        calculateTotal();
    });

    setTimeout(showWelcomeToast, 600);
}

window.addEventListener("DOMContentLoaded", initApp);