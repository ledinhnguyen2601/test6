import { auth, db } from "./firebase.js";
import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  query,
  where,
  updateDoc,
  addDoc,
  deleteDoc,
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

let userData = null;
let roomChartInstance = null;
let revenueChartInstance = null;

onAuthStateChanged(auth, async (user) => {
  if (!user) return (window.location.href = "login.html");
  const d = await getDoc(doc(db, "users", user.uid));
  userData = d.data();
  document.getElementById("admin-name").innerText =
    userData.name || "Chủ Trọ Admin";
  loadPendingTenants(); // Tự động load khách chờ
  loadUtilities();
  loadReports();
  loadRooms();
});

document
  .querySelector(".logout-btn")
  .addEventListener("click", () => signOut(auth));

// --- HÀM DUYỆT KHÁCH CHỜ ---
async function loadPendingTenants() {
  const snap = await getDocs(
    query(
      collection(db, "users"),
      where("building", "==", userData.building),
      where("role", "==", "tenant"),
      where("status", "==", "pending"),
    ),
  );
  const tbody = document.getElementById("pending-tenants-tbody");
  if (!tbody) return;
  tbody.innerHTML = snap.empty
    ? `<tr><td colspan="4" style="text-align: center;">Hiện không có khách nào chờ duyệt.</td></tr>`
    : "";
  snap.forEach((d) => {
    const item = d.data();
    tbody.innerHTML += `<tr>
        <td><strong>${item.name || "Khách"}</strong></td>
        <td>${item.room || "Chưa rõ"}</td>
        <td>${item.email}</td>
        <td>
            <button class="btn btn-primary btn-duyet-khach" data-id="${d.id}" style="padding:4px 8px; width:auto; margin-right: 5px;">Duyệt</button>
            <button class="btn btn-outline btn-tu-choi" data-id="${d.id}" style="padding:4px 8px; width:auto; color:red; border-color:red;">Từ chối</button>
        </td>
    </tr>`;
  });
  document.querySelectorAll(".btn-duyet-khach").forEach((btn) =>
    btn.addEventListener("click", async (e) => {
      btn.innerText = "Đang duyệt...";
      await updateDoc(doc(db, "users", e.target.getAttribute("data-id")), {
        status: "active",
      });
      loadPendingTenants();
    }),
  );
  document.querySelectorAll(".btn-tu-choi").forEach((btn) =>
    btn.addEventListener("click", async (e) => {
      if (confirm("Xóa hồ sơ đăng ký của khách này?")) {
        await deleteDoc(doc(db, "users", e.target.getAttribute("data-id")));
        loadPendingTenants();
      }
    }),
  );
}

// --- CÁC HÀM CŨ GIỮ NGUYÊN (TRÁNH LỖI) ---
async function loadUtilities() {
  const snap = await getDocs(
    query(
      collection(db, "utilities"),
      where("building", "==", userData.building),
    ),
  );
  const tbody = document.getElementById("utilities-tbody");
  tbody.innerHTML = snap.empty
    ? `<tr><td colspan="7" style="text-align: center;">Chưa có khách nộp dữ liệu.</td></tr>`
    : "";
  snap.forEach((docSnap) => {
    const item = docSnap.data();
    const isChot = item.status === "Đã chốt";
    const imgBtn = item.imageUrl
      ? `<button class="btn btn-outline btn-view-img" data-img="${item.imageUrl}" style="padding: 6px; width: auto;"><i class="fas fa-image"></i></button>`
      : `Không ảnh`;
    tbody.innerHTML += `<tr><td><strong>${item.room}</strong></td><td>${item.date}</td><td><strong>${item.dienMoi}</strong></td><td><strong>${item.nuocMoi}</strong></td><td>${imgBtn}</td><td>${isChot ? '<span class="badge" style="background:#d1fae5;color:#10b981;">Đã chốt</span>' : '<span class="badge" style="background:#fef3c7;color:#d97706;">Chờ duyệt</span>'}</td><td>${isChot ? '<button class=\"btn btn-outline\" disabled>Đã duyệt</button>' : `<button class=\"btn btn-primary btn-duyet\" data-id=\"${docSnap.id}\">Duyệt</button>`}</td></tr>`;
  });
  document.querySelectorAll(".btn-view-img").forEach((btn) =>
    btn.addEventListener("click", (e) => {
      const win = window.open("", "_blank", "width=600,height=800");
      win.document.write(
        `<div style="text-align:center;"><img src="${e.target.closest("button").getAttribute("data-img")}" style="max-width:100%;"></div>`,
      );
    }),
  );
  document.querySelectorAll(".btn-duyet").forEach((btn) =>
    btn.addEventListener("click", async (e) => {
      await updateDoc(doc(db, "utilities", e.target.getAttribute("data-id")), {
        status: "Đã chốt",
      });
      loadUtilities();
    }),
  );
}

document.getElementById("btnAddRoom").addEventListener("click", async () => {
  const rId = document.getElementById("new-room-id").value,
    rPrice = document.getElementById("new-room-price").value,
    rTenant = document.getElementById("new-room-tenant").value;
  if (!rId || !rPrice) return alert("Nhập mã phòng và giá thuê!");
  await addDoc(collection(db, "rooms"), {
    building: userData.building,
    room: rId,
    price: rPrice,
    tenant: rTenant,
    status: rTenant ? "Đang thuê" : "Phòng trống",
  });
  document.getElementById("new-room-id").value = "";
  document.getElementById("new-room-price").value = "";
  document.getElementById("new-room-tenant").value = "";
  loadRooms();
});

async function loadRooms() {
  const snap = await getDocs(
    query(collection(db, "rooms"), where("building", "==", userData.building)),
  );
  const tbody = document.getElementById("rooms-tbody");
  tbody.innerHTML = snap.empty
    ? `<tr><td colspan="5" style="text-align: center;">Chưa có phòng nào.</td></tr>`
    : "";
  let totalRev = 0,
    rentedCount = 0,
    emptyCount = 0;
  snap.forEach((d) => {
    const item = d.data();
    if (item.status === "Đang thuê") {
      totalRev += Number(item.price);
      rentedCount++;
    } else {
      emptyCount++;
    }
    tbody.innerHTML += `<tr><td><strong>${item.room}</strong></td><td>${Number(item.price).toLocaleString("vi-VN")} đ</td><td>${item.tenant || "-"}</td><td>${item.status}</td><td><button class="btn btn-outline btn-del-room" data-id="${d.id}" style="color:red; padding:4px 8px; width:auto;">Xóa</button></td></tr>`;
  });
  document.getElementById("stat-revenue").innerText =
    totalRev.toLocaleString("vi-VN") + " đ";
  document.getElementById("stat-rented").innerText = rentedCount + " Phòng";
  if (roomChartInstance) roomChartInstance.destroy();
  roomChartInstance = new Chart(document.getElementById("roomStatusChart"), {
    type: "doughnut",
    data: {
      labels: ["Đang thuê", "Phòng trống"],
      datasets: [
        {
          data: [rentedCount, emptyCount],
          backgroundColor: ["#10b981", "#cbd5e1"],
        },
      ],
    },
  });
  if (revenueChartInstance) revenueChartInstance.destroy();
  revenueChartInstance = new Chart(document.getElementById("revenueChart"), {
    type: "bar",
    data: {
      labels: ["Doanh thu (VNĐ)"],
      datasets: [
        { label: "VNĐ", data: [totalRev], backgroundColor: "#2563eb" },
      ],
    },
  });
  document.querySelectorAll(".btn-del-room").forEach((btn) =>
    btn.addEventListener("click", async (e) => {
      if (confirm("Xóa phòng này?")) {
        await deleteDoc(doc(db, "rooms", e.target.getAttribute("data-id")));
        loadRooms();
      }
    }),
  );
}

async function loadReports() {
  const snap = await getDocs(
    query(
      collection(db, "reports"),
      where("building", "==", userData.building),
    ),
  );
  const tbody = document.getElementById("reports-tbody");
  tbody.innerHTML = snap.empty
    ? `<tr><td colspan="5" style="text-align: center;">Chưa có báo cáo.</td></tr>`
    : "";
  let issueCount = 0;
  snap.forEach((d) => {
    const item = d.data();
    if (item.status !== "Hoàn thành") issueCount++;
    tbody.innerHTML += `<tr><td><strong>${item.room}</strong></td><td>${item.date}</td><td>${item.type}</td><td>${item.description}</td><td><select class="status-select" data-id="${d.id}"><option ${item.status === "Tiếp nhận" ? "selected" : ""}>Tiếp nhận</option><option ${item.status === "Đang sửa" ? "selected" : ""}>Đang sửa</option><option ${item.status === "Hoàn thành" ? "selected" : ""}>Hoàn thành</option></select></td></tr>`;
  });
  document.getElementById("stat-issues").innerText = issueCount + " Báo cáo";
  document.querySelectorAll(".status-select").forEach((sel) =>
    sel.addEventListener("change", async (e) => {
      await updateDoc(doc(db, "reports", e.target.getAttribute("data-id")), {
        status: e.target.value,
      });
      loadReports();
    }),
  );
}

document
  .getElementById("btnSaveProfile")
  .addEventListener("click", async (e) => {
    const pName = document.getElementById("prof-name").value,
      pAddress = document.getElementById("prof-address").value,
      pPhone = document.getElementById("prof-phone").value,
      pDesc = document.getElementById("prof-desc").value,
      fileInput = document.getElementById("prof-img");
    if (!pName || !pAddress || !pPhone)
      return alert("Vui lòng nhập Tên, Địa chỉ, SĐT!");
    const btn = e.target;
    btn.innerText = "Đang tải dữ liệu...";
    const updateData = {
      name: pName,
      address: pAddress,
      phone: pPhone,
      description: pDesc,
      type: "motel",
      status: "active",
    };
    if (fileInput.files.length > 0) {
      const reader = new FileReader();
      reader.readAsDataURL(fileInput.files[0]);
      reader.onload = async function (event) {
        updateData.imageUrl = event.target.result;
        await setDoc(
          doc(db, "building_profiles", userData.building),
          updateData,
          { merge: true },
        );
        alert("Đã công khai lên Trang Chủ!");
        btn.innerHTML =
          '<i class="fas fa-save"></i> Lưu & Công khai lên Trang chủ';
      };
    } else {
      await setDoc(
        doc(db, "building_profiles", userData.building),
        updateData,
        { merge: true },
      );
      alert("Đã công khai lên Trang Chủ!");
      btn.innerHTML =
        '<i class="fas fa-save"></i> Lưu & Công khai lên Trang chủ';
    }
  });
