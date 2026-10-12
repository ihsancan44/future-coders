import Logo from "../../img/FutureCoders Logo.png";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <div className="footer">
      <div className="footer-justify">
        <div className="footer-top">
          <div className="footer-top-logo">
            <h2>Future Coders</h2>
            <img src={Logo} alt="" />
            <h4>+90(537) 051 00 01</h4>
            <h4>ouzzhansurerr@gmail.com </h4>
          </div>

          <div className="footer-top-about">
            <h2>Diğer</h2>
            <Link to="/login-page">Giriş</Link>
            <Link to="/">Home</Link>
            <Link to="/roadmap">Roadmap</Link>
            <Link to="/courses">Courses</Link>
          </div>
        </div>
        <div className="footer-bottom">
          <div className="footer-bottom-copyRight">
            @2024 Future Coders , Design & Developed by Ouz
          </div>
        </div>
      </div>
    </div>
  );
};

export default Footer;
