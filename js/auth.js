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
  // 1. KÉO DANH SÁCH TÒA NHÀ
  const regBuildingSelect = document.getElementById("reg-building");
  if (regBuildingSelect) {
    getDocs(collection(db, "building_profiles"))
      .then((snap) => {
        if (!snap.empty) {
          regBuildingSelect.innerHTML =
            '<option value="">-- Chọn Khu trọ / Chung cư của bạn --</option>';
          snap.forEach((docSnap) => {
            regBuildingSelect.innerHTML += `<option value="${docSnap.id}">${docSnap.data().name}</option>`;
          });
        } else {
          regBuildingSelect.innerHTML =
            '<option value="">-- Hiện chưa có khu vực nào hoạt động --</option>';
        }
      })
      .catch((err) => console.log("Lỗi:", err));
  }

  // 2. KHÁCH ĐĂNG KÝ (Đã khớp ID registerForm và reg-password)
  const regForm = document.getElementById("registerForm");
  if (regForm) {
    regForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("reg-email").value;
      const pass = document.getElementById("reg-password").value;
      const building = document.getElementById("reg-building").value;

      // Nếu là email của sếp thì cho qua cửa không cần chọn tòa nhà
      if (!building && email !== "nguyen0877780858@gmail.com")
        return alert("Vui lòng chọn Khu vực!");

      const btn = document.getElementById("btnRegSubmit");
      btn.innerText = "Đang xử lý...";

      try {
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          email,
          pass,
        );
        await setDoc(doc(db, "users", userCredential.user.uid), {
          email: email,
          name: document.getElementById("reg-name").value || "Khách",
          phone: "",
          building: building || "none",
          room: document.getElementById("reg-room").value || "",
          role: "tenant",
          status: "pending",
        });
        alert("Đăng ký thành công! Hãy chuyển sang Tab Đăng nhập.");
        window.location.reload();
      } catch (error) {
        alert(
          "Lỗi đăng ký! Có thể Email đã tồn tại hoặc mật khẩu dưới 6 ký tự.",
        );
        btn.innerText = "Gửi Đăng Ký (Cần duyệt)";
      }
    });
  }

  // 3. ĐĂNG NHẬP (Đã khớp ID loginForm và login-password)
  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("login-email").value;
      const pass = document.getElementById("login-password").value;

      const btn = document.getElementById("btnLoginSubmit");
      btn.innerText = "Đang xác thực...";

      try {
        const userCredential = await signInWithEmailAndPassword(
          auth,
          email,
          pass,
        );
        const user = userCredential.user;

        // LỖI HỆ THỐNG MỘT BÊN, ÉP CHUẨN TÀI KHOẢN CHO SẾP (Phòng trường hợp DB lỗi)
        if (email === "nguyen0877780858@gmail.com") {
          await setDoc(
            doc(db, "users", user.uid),
            {
              email: "nguyen0877780858@gmail.com",
              name: "Sếp Nguyên",
              role: "super_admin",
              status: "active",
            },
            { merge: true },
          );
          window.location.href = "super-admin.html";
          return;
        }

        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          if (data.status === "pending") {
            alert("Tài khoản chưa được phê duyệt!");
            auth.signOut();
            btn.innerText = "Đăng nhập";
            return;
          }

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
        btn.innerText = "Đăng nhập";
      }
    });
  }
});
