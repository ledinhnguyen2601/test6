import { auth, db } from "./firebase.js";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  // 1. KÉO DANH SÁCH TÒA NHÀ CHO KHÁCH CHỌN
  const regBuildingSelect = document.getElementById("reg-building");
  if (regBuildingSelect) {
    getDocs(collection(db, "building_profiles"))
      .then((snap) => {
        if (!snap.empty) {
          regBuildingSelect.innerHTML =
            '<option value="">-- Chọn Khu trọ / Chung cư của bạn --</option>';
          snap.forEach((docSnap) => {
            const buildingData = docSnap.data();
            regBuildingSelect.innerHTML += `<option value="${docSnap.id}">${buildingData.name}</option>`;
          });
        } else {
          regBuildingSelect.innerHTML =
            '<option value="">-- Hiện chưa có khu vực nào hoạt động --</option>';
        }
      })
      .catch((err) => console.log("Lỗi:", err));
  }

  // 2. KHÁCH THUÊ ĐĂNG KÝ TÀI KHOẢN
  const regForm = document.getElementById("register-form");
  if (regForm) {
    regForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("reg-email").value;
      const pass = document.getElementById("reg-pass").value;
      const building = document.getElementById("reg-building").value;

      if (!building) return alert("Vui lòng chọn Khu vực!");

      try {
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          email,
          pass,
        );
        // Mặc định là Khách thuê (tenant) và chờ Chủ trọ duyệt
        await setDoc(doc(db, "users", userCredential.user.uid), {
          email: email,
          name: document.getElementById("reg-name").value,
          phone: document.getElementById("reg-phone").value,
          building: building,
          room: document.getElementById("reg-room").value,
          role: "tenant",
          status: "pending",
        });
        alert("Đăng ký thành công! Vui lòng chờ BQL/Chủ trọ phê duyệt.");
        window.location.reload();
      } catch (error) {
        alert("Lỗi đăng ký!");
      }
    });
  }

  // 3. XỬ LÝ ĐĂNG NHẬP CHUNG (TỰ ĐỘNG CHIA ĐƯỜNG)
  const loginForm = document.getElementById("login-form");
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("login-email").value;
      const pass = document.getElementById("login-pass").value;

      try {
        const userCredential = await signInWithEmailAndPassword(
          auth,
          email,
          pass,
        );
        const userDoc = await getDoc(doc(db, "users", userCredential.user.uid));

        if (userDoc.exists()) {
          const data = userDoc.data();
          if (data.status === "pending") {
            alert("Tài khoản chưa được phê duyệt!");
            auth.signOut();
            return;
          }

          // Điều hướng tự động
          if (data.role === "super_admin")
            window.location.href = "super-admin.html";
          else if (data.role === "admin_motel")
            window.location.href = "admin-motel.html";
          else if (data.role === "admin_apartment")
            window.location.href = "admin-apartment.html";
          else {
            const bDoc = await getDoc(
              doc(db, "building_profiles", data.building),
            );
            if (bDoc.exists() && bDoc.data().type === "apartment")
              window.location.href = "tenant-apartment.html";
            else window.location.href = "tenant-motel.html";
          }
        }
      } catch (error) {
        alert("Sai Email hoặc Mật khẩu!");
      }
    });
  }
});
