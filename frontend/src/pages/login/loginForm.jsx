import { useState } from "react";
import { Input, Button } from "antd";
import Footer from "../../layouts/footer/footer";
import { Link } from "react-router-dom";
import axios from "axios";

const LoginForm = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post("/path/to/api/login", {
        username,
        password,
      });
      const { token } = response.data; // Assuming the response contains a token
      localStorage.setItem("jwt", token); // Store the token in localStorage
      console.log("Login successful:", response.data);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const fetchProtectedData = async () => {
    try {
      const token = localStorage.getItem("jwt");
      if (!token) {
        console.error("No JWT token found");
        return;
      }
      const response = await axios.get("/path/to/protected/api", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      console.log("Protected data fetched:", response.data);
    } catch (error) {
      console.error("Failed to fetch protected data:", error);
    }
  };

  return (
    <div className="login-page-container">
      <div className="login-banner">
        <div className="title">
          <h1 style={{ letterSpacing: "4px" }}>Login</h1>
          <h4>Home / Login</h4>
        </div>
      </div>
      <div className="login-form">
        <div className="wrap-centered-form-div">
          <form onSubmit={handleSubmit}>
            <p style={{ marginBottom: "32px", fontSize: "20px" }}>
              Hi, Welcome Back!
            </p>
            <Input
              type="text"
              placeholder="Username or Email Address"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <div className="keep-signed">
              <div className="check">
                <input type="checkbox" />
                Keep me signed in
              </div>
              <Link to={"/forgot-password"}>Forgot?</Link>
            </div>
            <div
              className="submit-form"
              style={{
                marginTop: "40px",
                display: "flex",
                flexDirection: "row",
                justifyContent: "end",
              }}
            >
              <Link to={"/courses"}>
                <Button
                  type="primary"
                  htmlType="submit"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  Sign In
                </Button>
              </Link>
            </div>
            <p style={{ marginTop: "20px" }}>
              Don't have an account?{" "}
              <Link to="/sign-page">Registration Now</Link>
            </p>
          </form>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default LoginForm;
