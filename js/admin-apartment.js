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
let vehChartInstance = null;
let billChartInstance = null;

onAuthStateChanged(auth, async (user) => {
  if (!user) return (window.location.href = "login.html");
  const d = await getDoc(doc(db, "users", user.uid));
  userData = d.data();
  document.getElementById("admin-name").innerText =
    userData.name || "BQL Admin";
  document.getElementById("building-display").innerText =
    "Hệ thống: " + userData.building;
  loadReports();
  loadResidents();
  loadVehicles();
  loadBills();
});

document
  .querySelector(".logout-btn")
  .addEventListener("click", () => signOut(auth));

document
  .getElementById("btnAddResident")
  .addEventListener("click", async () => {
    const room = document.getElementById("new-res-room").value,
      name = document.getElementById("new-res-name").value,
      phone = document.getElementById("new-res-phone").value;
    if (!room || !name) return alert("Nhập Căn hộ và Tên chủ hộ!");
    await addDoc(collection(db, "residents"), {
      building: userData.building,
      room,
      name,
      phone,
    });
    document.getElementById("new-res-room").value = "";
    document.getElementById("new-res-name").value = "";
    document.getElementById("new-res-phone").value = "";
    loadResidents();
  });

async function loadResidents() {
  const snap = await getDocs(
    query(
      collection(db, "residents"),
      where("building", "==", userData.building),
    ),
  );
  const tbody = document.getElementById("residents-tbody");
  tbody.innerHTML = snap.empty
    ? `<tr><td colspan="4" style="text-align: center;">Chưa có dữ liệu.</td></tr>`
    : "";
  document.getElementById("stat-res").innerText = snap.size + " Người";
  snap.forEach((d) => {
    const item = d.data();
    tbody.innerHTML += `<tr><td><strong style="color:#0f766e;">${item.room}</strong></td><td>${item.name}</td><td>${item.phone || "-"}</td><td><button class="btn btn-outline btn-del-res" data-id="${d.id}" style="color:#ef4444; border-color:#ef4444; padding:4px 8px; width:auto;">Xóa</button></td></tr>`;
  });
  document.querySelectorAll(".btn-del-res").forEach((btn) =>
    btn.addEventListener("click", async (e) => {
      if (confirm("Xóa cư dân này?")) {
        await deleteDoc(doc(db, "residents", e.target.getAttribute("data-id")));
        loadResidents();
      }
    }),
  );
}

document.getElementById("btnAddVehicle").addEventListener("click", async () => {
  const room = document.getElementById("new-veh-room").value,
    plate = document.getElementById("new-veh-plate").value,
    type = document.getElementById("new-veh-type").value;
  if (!room || !plate) return alert("Nhập Căn hộ và Biển số!");
  await addDoc(collection(db, "vehicles"), {
    building: userData.building,
    room,
    plate,
    type,
  });
  document.getElementById("new-veh-room").value = "";
  document.getElementById("new-veh-plate").value = "";
  document.getElementById("new-veh-type").value = "";
  loadVehicles();
});

async function loadVehicles() {
  const snap = await getDocs(
    query(
      collection(db, "vehicles"),
      where("building", "==", userData.building),
    ),
  );
  const tbody = document.getElementById("vehicles-tbody");
  tbody.innerHTML = snap.empty
    ? `<tr><td colspan="4" style="text-align: center;">Chưa có phương tiện.</td></tr>`
    : "";
  document.getElementById("stat-veh").innerText = snap.size + " Xe";
  let oto = 0,
    xemay = 0,
    xedap = 0;
  snap.forEach((d) => {
    const item = d.data();
    let t = (item.type || "").toLowerCase();
    if (t.includes("ô tô") || t.includes("oto") || t.includes("car")) oto++;
    else if (t.includes("đạp") || t.includes("bike")) xedap++;
    else xemay++;
    tbody.innerHTML += `<tr><td><strong>${item.room}</strong></td><td><strong style="color:var(--primary-color);">${item.plate}</strong></td><td>${item.type || "-"}</td><td><button class="btn btn-outline btn-del-veh" data-id="${d.id}" style="color:#ef4444; border-color:#ef4444; padding:4px 8px; width:auto;">Xóa</button></td></tr>`;
  });
  if (vehChartInstance) vehChartInstance.destroy();
  vehChartInstance = new Chart(document.getElementById("vehChart"), {
    type: "pie",
    data: {
      labels: ["Ô tô", "Xe máy", "Xe đạp/Khác"],
      datasets: [
        {
          data: [oto, xemay, xedap],
          backgroundColor: ["#2563eb", "#10b981", "#f59e0b"],
        },
      ],
    },
  });
  document.querySelectorAll(".btn-del-veh").forEach((btn) =>
    btn.addEventListener("click", async (e) => {
      if (confirm("Hủy đăng ký xe này?")) {
        await deleteDoc(doc(db, "vehicles", e.target.getAttribute("data-id")));
        loadVehicles();
      }
    }),
  );
}

document.getElementById("btnCreateBill").addEventListener("click", async () => {
  const room = document.getElementById("bill-room").value,
    fee = document.getElementById("bill-fee").value,
    parking = document.getElementById("bill-parking").value;
  if (!room || !fee) return alert("Nhập Căn hộ và Phí!");
  await addDoc(collection(db, "apartment_bills"), {
    building: userData.building,
    room: room,
    fee: Number(fee),
    parking: Number(parking) || 0,
    total: Number(fee) + (Number(parking) || 0),
    date: new Date().toLocaleDateString("vi-VN"),
    status: "Chưa thanh toán",
  });
  loadBills();
});

document.getElementById("btnAutoBill").addEventListener("click", async () => {
  const fee = prompt(
    "Nhập Phí quản lý chung cho TẤT CẢ các căn hộ (VNĐ):",
    "300000",
  );
  if (!fee) return;
  const parking = prompt("Nhập Phí gửi xe mặc định (nếu có):", "0");
  const resSnap = await getDocs(
    query(
      collection(db, "residents"),
      where("building", "==", userData.building),
    ),
  );
  if (resSnap.empty) return alert("Chưa có danh sách cư dân để phát hóa đơn!");
  for (const docSnap of resSnap.docs) {
    const resident = docSnap.data();
    await addDoc(collection(db, "apartment_bills"), {
      building: userData.building,
      room: resident.room,
      fee: Number(fee),
      parking: Number(parking) || 0,
      total: Number(fee) + (Number(parking) || 0),
      date: new Date().toLocaleDateString("vi-VN"),
      status: "Chưa thanh toán",
    });
  }
  alert(`Đã phát tự động thành công Hóa đơn!`);
  loadBills();
});

async function loadBills() {
  const snap = await getDocs(
    query(
      collection(db, "apartment_bills"),
      where("building", "==", userData.building),
    ),
  );
  const tbody = document.getElementById("bills-tbody");
  tbody.innerHTML = snap.empty
    ? `<tr><td colspan="5" style="text-align: center;">Chưa phát hóa đơn nào.</td></tr>`
    : "";
  let unpaid = 0,
    paid = 0;
  snap.forEach((d) => {
    const item = d.data();
    if (item.status === "Chưa thanh toán") unpaid++;
    else paid++;
    tbody.innerHTML += `<tr><td><strong>${item.room}</strong></td><td>${item.date}</td><td><strong style="color: #ef4444;">${item.total.toLocaleString("vi-VN")} đ</strong></td><td><span class="badge" style="background:#fef3c7; color:#d97706;">${item.status}</span></td><td><button class="btn btn-outline btn-del-bill" data-id="${d.id}" style="color:#ef4444; border-color:#ef4444; padding:4px 8px; width:auto;">Xóa Bill</button></td></tr>`;
  });
  document.getElementById("stat-bill").innerText = unpaid + " Hóa đơn";
  if (billChartInstance) billChartInstance.destroy();
  billChartInstance = new Chart(document.getElementById("billChart"), {
    type: "doughnut",
    data: {
      labels: ["Đã thu", "Chưa thanh toán"],
      datasets: [
        { data: [paid, unpaid], backgroundColor: ["#10b981", "#ef4444"] },
      ],
    },
  });
  document.querySelectorAll(".btn-del-bill").forEach((btn) =>
    btn.addEventListener("click", async (e) => {
      if (confirm("Hủy hóa đơn này?")) {
        await deleteDoc(
          doc(db, "apartment_bills", e.target.getAttribute("data-id")),
        );
        loadBills();
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
  snap.forEach((docSnap) => {
    const item = docSnap.data();
    tbody.innerHTML += `<tr><td><strong>${item.room}</strong></td><td>${item.date}</td><td><strong>${item.type}</strong></td><td>${item.description}</td><td><select class="status-select" data-id="${docSnap.id}"><option ${item.status === "Tiếp nhận" ? "selected" : ""}>Tiếp nhận</option><option ${item.status === "Đang sửa" ? "selected" : ""}>Đang sửa</option><option ${item.status === "Hoàn thành" ? "selected" : ""}>Hoàn thành</option></select></td></tr>`;
  });
  document.querySelectorAll(".status-select").forEach((sel) =>
    sel.addEventListener("change", async (e) => {
      await updateDoc(doc(db, "reports", e.target.getAttribute("data-id")), {
        status: e.target.value,
      });
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
      return alert("Vui lòng nhập Tên, Địa chỉ và SĐT!");
    const btn = e.target;
    btn.innerText = "Đang tải dữ liệu...";

    if (fileInput.files.length > 0) {
      const reader = new FileReader();
      reader.readAsDataURL(fileInput.files[0]);
      reader.onload = async function (event) {
        await setDoc(
          doc(db, "building_profiles", userData.building),
          {
            name: pName,
            address: pAddress,
            phone: pPhone,
            description: pDesc,
            imageUrl: event.target.result,
            type: "apartment",
            status: "active", // Mở khóa
          },
          { merge: true },
        );
        alert("Đã công khai lên Trang Chủ!");
        btn.innerHTML =
          '<i class="fas fa-save"></i> Lưu & Công khai lên Trang chủ';
      };
    } else {
      await setDoc(
        doc(db, "building_profiles", userData.building),
        {
          name: pName,
          address: pAddress,
          phone: pPhone,
          description: pDesc,
          type: "apartment",
          status: "active", // Mở khóa
        },
        { merge: true },
      );
      alert("Đã công khai lên Trang Chủ!");
      btn.innerHTML =
        '<i class="fas fa-save"></i> Lưu & Công khai lên Trang chủ';
    }
  });
