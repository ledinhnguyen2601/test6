import { auth, db } from "./firebase.js";
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import {
  doc,
  setDoc,
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const regForm = document.getElementById("partner-register-form");

if (regForm) {
  regForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("p-name").value;
    const email = document.getElementById("p-email").value;
    const pass = document.getElementById("p-pass").value;
    const buildingName = document.getElementById("p-building-name").value;
    const type = document.getElementById("p-type").value;
    const btn = regForm.querySelector("button");

    btn.innerText = "Đang khởi tạo hệ thống...";

    try {
      // 1. Tạo tài khoản Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        pass,
      );
      const user = userCredential.user;

      // 2. Tạo ID ngẫu nhiên cho Tòa nhà (VD: bldg_167890123)
      const buildingId = "bldg_" + Date.now();

      // 3. Bơm Tòa nhà mới vào Bảng building_profiles (Để khách thuê có cái mà chọn)
      await setDoc(doc(db, "building_profiles", buildingId), {
        name: buildingName,
        type: type,
        address: "Chưa cập nhật", // Họ sẽ cập nhật sau trong trang Admin
        phone: "Chưa cập nhật",
        status: "pending", // <--- THÊM DÒNG NÀY ĐỂ KHÓA HIỂN THỊ CHO ĐẾN KHI SẾP DUYỆT
      });

      // 4. Lưu thông tin Chủ trọ vào Bảng users (Chờ Super Admin duyệt)
      const role = type === "motel" ? "admin_motel" : "admin_apartment";
      await setDoc(doc(db, "users", user.uid), {
        name: name,
        email: email,
        role: role,
        building: buildingId,
        status: "pending", // Trạng thái chờ sếp duyệt
      });

      alert(
        "Khởi tạo thành công! Vui lòng liên hệ Chủ nền tảng (Super Admin) để được kích hoạt tài khoản.",
      );
      window.location.href = "login.html"; // Đá về trang đăng nhập
    } catch (error) {
      alert("Lỗi: Email đã tồn tại hoặc mật khẩu quá ngắn!");
      btn.innerText = "Tạo Hệ Thống Mới";
      console.error(error);
    }
  });
}
