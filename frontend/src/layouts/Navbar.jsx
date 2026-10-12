import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Dropdown } from "antd";
import { Compass, LayoutDashboard, LogOut, Menu, User, X } from "lucide-react";
import logo from "../assets/logo.png";
import { useAuth } from "../context/AuthContext";
import { LEVEL_LABEL } from "../utils/format";

export default function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  const items = [
    { key: "profile", label: <Link to="/profile">Profilim</Link>, icon: <User size={14} /> },
    ...(!isAdmin ? [{ key: "career", label: <Link to="/career">Yazılım alanım</Link>, icon: <Compass size={14} /> }] : []),
    ...(isAdmin ? [{ key: "admin", label: <Link to="/admin">Admin paneli</Link>, icon: <LayoutDashboard size={14} /> }] : []),
    { type: "divider" },
    {
      key: "logout",
      label: "Çıkış yap",
      icon: <LogOut size={14} />,
      onClick: () => {
        logout();
        navigate("/");
      },
    },
  ];

  return (
    <header className="navbar">
      <div className="navbar__inner">
        <Link to="/" className="navbar__brand" onClick={close}>
          <img src={logo} alt="" />
          <span>FutureCoders</span>
        </Link>
        <button className="navbar__toggle" aria-label={open ? "Menüyü kapat" : "Menüyü aç"} aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          {open ? <X /> : <Menu />}
        </button>
        <nav className={`navbar__links ${open ? "is-open" : ""}`} aria-label="Ana menü">
          <NavLink to="/" end onClick={close}>Ana Sayfa</NavLink>
          <NavLink to="/courses" onClick={close}>Kurslar</NavLink>
          <NavLink to="/roadmap" onClick={close}>Yol Haritası</NavLink>
          {user?.careerField && <NavLink to={`/career/${user.careerField}`} onClick={close}>Kariyer Yolum</NavLink>}
          {user && !isAdmin && !user.level && (
            <NavLink to="/placement" onClick={close} className="navbar__cta">Seviye Sınavı</NavLink>
          )}
          <div className="navbar__account">
            {user ? (
              <Dropdown menu={{ items, onClick: close }} trigger={["click"]} placement="bottomRight">
                <button className="navbar__user">
                  <span className="avatar">{user.firstName[0]}</span>
                  <span>{user.firstName}</span>
                  {user.level && <span className="navbar__level">{LEVEL_LABEL[user.level]}</span>}
                </button>
              </Dropdown>
            ) : (
              <>
                <NavLink to="/login" onClick={close}>Giriş</NavLink>
                <Link to="/register" className="btn btn--primary btn--sm" onClick={close}>Kayıt Ol</Link>
              </>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
