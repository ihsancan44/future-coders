import {User } from 'lucide-react';
import Logo from "../../img/FutureCoders Logo.png";
import { Link } from "react-router-dom";

const Navbar = () => {
  return (
    <div className="navbar">
      <div className="header-logo">
        <Link to={"/"}>
          <img src={Logo} alt="logo" />
        </Link>
      </div>
      <div className="header-right">
        <div className="menu">
          <Link to={"/"}>
            Home
          </Link>
          <Link to={"/courses"}>
            Courses
          </Link>
          <Link to={"/roadmap"}>
            Roadmap
          </Link>
        </div>
        <div className="header-quote">
          <Link className="login" to="/login-page">
            <User style={{ width: "clamp(14px,2vw,16px)" }} />
            Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Navbar;
