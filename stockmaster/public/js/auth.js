const API_URL = "http://localhost:3000/api";

// Handle Login
if (document.getElementById("loginForm")) {
  document.getElementById("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        window.location.href = "/dashboard.html";
      } else {
        showMessage(data.message, "error");
      }
    } catch (error) {
      showMessage("Login failed. Please try again.", "error");
    }
  });

  // Forgot Password
  document.getElementById("forgotPassword").addEventListener("click", (e) => {
    e.preventDefault();
    document.getElementById("otpModal").classList.add("active");
  });

  document.getElementById("closeModal").addEventListener("click", () => {
    document.getElementById("otpModal").classList.remove("active");
  });

  document.getElementById("sendOtp").addEventListener("click", async () => {
    const email = document.getElementById("otpEmail").value;
    if (!email) {
      alert("Please enter your email");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      alert(data.message + " (Check console for OTP in development)");
    } catch (error) {
      alert("Failed to send OTP");
    }
  });

  document.getElementById("otpForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("otpEmail").value;
    const otp = document.getElementById("otp").value;
    const newPassword = document.getElementById("newPassword").value;

    try {
      const response = await fetch(`${API_URL}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, newPassword }),
      });

      const data = await response.json();

      if (response.ok) {
        alert("Password reset successful! Please login.");
        window.location.href = "/login.html";
      } else {
        alert(data.message);
      }
    } catch (error) {
      alert("Failed to reset password");
    }
  });
}

// Handle Signup
if (document.getElementById("signupForm")) {
  document
    .getElementById("signupForm")
    .addEventListener("submit", async (e) => {
      e.preventDefault();

      const name = document.getElementById("name").value;
      const email = document.getElementById("email").value;
      const password = document.getElementById("password").value;
      const confirmPassword = document.getElementById("confirmPassword").value;

      if (password !== confirmPassword) {
        showMessage("Passwords do not match", "error");
        return;
      }

      try {
        const response = await fetch(`${API_URL}/auth/signup`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password }),
        });

        const data = await response.json();

        if (response.ok) {
          localStorage.setItem("token", data.token);
          localStorage.setItem("user", JSON.stringify(data.user));
          window.location.href = "/dashboard.html";
        } else {
          showMessage(data.message, "error");
        }
      } catch (error) {
        showMessage("Signup failed. Please try again.", "error");
      }
    });
}

function showMessage(message, type) {
  const messageEl = document.getElementById("message");
  messageEl.textContent = message;
  messageEl.className = `message ${type}`;
  messageEl.style.display = "block";
}
