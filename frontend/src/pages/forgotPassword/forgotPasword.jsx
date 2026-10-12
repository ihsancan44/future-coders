import { useState } from "react";
import { Input, Button } from "antd";
import Footer from "../../layouts/footer/footer";
import { Link } from "react-router-dom";
import { LockKeyhole } from "lucide-react";
import axios from "axios";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("jwt"); // JWT'yi localStorage'dan al
      if (!token) {
        console.error("No JWT token found");
        return;
      }

      const response = await axios.post(
        "/path/to/api/forgot-password",
        {
          email,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`, // JWT'yi Authorization header'ında gönder
          },
        }
      );
      console.log("Password reset request successful:", response.data);
      // Başarılı şifre sıfırlama işlemi için gerekli işlemler (örn. bildirim gösterme)
    } catch (error) {
      console.error("Password reset request failed:", error);
      // Hata durumunda yapılacak işlemler (örn. hata mesajı gösterme)
    }
  };

  return (
    <div className="login-page-container">
      <div className="login-banner">
        <div className="title">
          <h1 style={{ letterSpacing: "4px" }}>Forgot Password</h1>
          <h4>Home / Forgot Password</h4>
        </div>
      </div>
      <div className="login-form">
        <div className="wrap-centered-form-div">
          <LockKeyhole size={128} />
          <form
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
            }}
            onSubmit={handleSubmit}
          >
            <p style={{ marginBottom: "32px", fontSize: "20px" }}>
              Let's reset your password!
            </p>
            <Input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Button
              type="primary"
              htmlType="submit"
              style={{ marginTop: "20px" }}
            >
              Reset Password
            </Button>
          </form>
          <div className="submit-form">
            <p>
              Don't have an account?{" "}
              <Link to="/sign-page">Registration Now</Link>
            </p>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default ForgotPassword;
