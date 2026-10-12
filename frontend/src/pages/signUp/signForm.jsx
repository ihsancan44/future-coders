import { useState } from "react";
import { Input, Button, Select } from "antd";
import Footer from "../../layouts/footer/footer";
import axios from "axios";

const { Option } = Select;

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    gender: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleGenderChange = (value) => {
    setFormData({
      ...formData,
      gender: value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("jwt");
      if (!token) {
        console.error("No JWT token found");
        return;
      }
      await axios.post("/api/register", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      alert("Registration successful");
    } catch (error) {
      console.error("Failed to register:", error);
      alert("Registration failed");
    }
  };

  return (
    <div className="sign-page-container">
      <div className="sign-banner">
        <div className="title">
          <h1 style={{ letterSpacing: "4px" }}>Student Registration</h1>
          <h4>Home / Student Registration</h4>
        </div>
      </div>
      <div className="sign-form">
        <div className="wrap-centered-form-div">
          <form onSubmit={handleSubmit}>
            <label>First Name</label>
            <Input
              type="text"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
            />
            <label>Last Name</label>
            <Input
              type="text"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
            />
            <label>Username</label>
            <Input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
            />
            <label>E-Mail</label>
            <Input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
            />
            <label>Password</label>
            <Input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
            />
            <label>Password Confirmation</label>
            <Input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
            />
            <label>Gender</label>
            <Select
              name="gender"
              value={formData.gender}
              onChange={handleGenderChange}
              style={{
                marginLeft: "10px",
                width: "100px",
              }}
            >
              <Option value="female">Female</Option>
              <Option value="male">Male</Option>
              <Option value="other">Other</Option>
            </Select>
            <div className="submit-form">
              <Button type="primary" htmlType="submit">
                Register
              </Button>
            </div>
          </form>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default RegisterPage;
