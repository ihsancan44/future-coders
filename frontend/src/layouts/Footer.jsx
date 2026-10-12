import { Link } from "react-router-dom";
import logo from "../assets/logo.png";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer__inner">
        <div className="footer__brand">
          <img src={logo} alt="" />
          <div>
            <strong>FutureCoders</strong>
            <p>Üniversiteye geçmeden yazılım öğren, rakiplerinin önüne geç.</p>
          </div>
        </div>
        <nav className="footer__links" aria-label="Alt menü">
          <Link to="/courses">Kurslar</Link>
          <Link to="/roadmap">Yol Haritası</Link>
          <Link to="/register">Kayıt Ol</Link>
          <Link to="/login">Giriş</Link>
        </nav>
      </div>
      <div className="footer__bottom">© {new Date().getFullYear()} FutureCoders</div>
    </footer>
  );
}
