import { Suspense, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Layout, Menu } from "antd";
import { BarChart3, BookOpen, ClipboardList, FileText, Home, LogOut, MessageSquare, Users, Video } from "lucide-react";
import logo from "../assets/logo.svg";
import { useAuth } from "../context/AuthContext";
import { Loading } from "../components/Status";
import { usePageMeta } from "../hooks/usePageMeta";

const items = [
  { key: "/admin", icon: <BarChart3 size={16} />, label: "İstatistikler" },
  { key: "/admin/courses", icon: <BookOpen size={16} />, label: "Kurslar" },
  { key: "/admin/videos", icon: <Video size={16} />, label: "Videolar" },
  { key: "/admin/blog", icon: <FileText size={16} />, label: "Yol haritası blog" },
  { key: "/admin/exams", icon: <ClipboardList size={16} />, label: "Sınavlar" },
  { key: "/admin/users", icon: <Users size={16} />, label: "Üyeler" },
  { key: "/admin/comments", icon: <MessageSquare size={16} />, label: "Yorumlar" },
  { type: "divider" },
  { key: "/", icon: <Home size={16} />, label: "Siteye dön" },
  { key: "logout", icon: <LogOut size={16} />, label: "Çıkış yap" },
];

export default function AdminLayout() {
  usePageMeta({ title: "Yönetim paneli", noindex: true });
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const selected = items.filter((i) => i.key && i.key !== "/" && pathname.startsWith(i.key)).sort((a, b) => b.key.length - a.key.length)[0]?.key;

  return (
    <Layout className="admin">
      <Layout.Sider breakpoint="lg" collapsedWidth={0} collapsed={collapsed} onCollapse={setCollapsed} width={230} theme="light" className="admin__sider">
        <Link to="/admin" className="admin__brand">
          <img src={logo} alt="" />
          <span>Code<span className="brand-via">via</span><small>Yönetim</small></span>
        </Link>
        <Menu
          mode="inline"
          selectedKeys={selected ? [selected] : []}
          items={items}
          onClick={({ key }) => {
            if (key === "logout") {
              logout();
              navigate("/");
            } else navigate(key);
            if (window.innerWidth < 992) setCollapsed(true);
          }}
        />
      </Layout.Sider>
      <Layout>
        <Layout.Header className="admin__header">
          <span>Merhaba, {user.firstName}</span>
        </Layout.Header>
        <Layout.Content className="admin__content">
          <Suspense fallback={<Loading />}>
            <Outlet />
          </Suspense>
        </Layout.Content>
      </Layout>
    </Layout>
  );
}
