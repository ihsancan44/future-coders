import PropTypes from "prop-types";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ErrorState, Loading } from "./Status";

/** Kayıtlı oturum var ama sunucuya ulaşılamadı: giriş sayfasına atmak yerine tekrar denetilir. */
const Offline = () => (
  <ErrorState message="Sunucuya ulaşılamadı. İnternet bağlantını kontrol edip tekrar dene." onRetry={() => window.location.reload()} />
);

export function RequireAuth({ children }) {
  const { user, ready, offline } = useAuth();
  const location = useLocation();
  if (!ready) return <Loading />;
  if (!user && offline) return <Offline />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  return children;
}
RequireAuth.propTypes = { children: PropTypes.node };

export function RequireAdmin({ children }) {
  const { user, ready, offline, isAdmin } = useAuth();
  const location = useLocation();
  if (!ready) return <Loading />;
  if (!user && offline) return <Offline />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return children;
}
RequireAdmin.propTypes = { children: PropTypes.node };

/** Giriş yapmış kullanıcıyı giriş/kayıt sayfalarından uzak tutar. */
export function GuestOnly({ children }) {
  const { user, ready } = useAuth();
  if (!ready) return <Loading />;
  if (user) return <Navigate to={user.role === "ADMIN" ? "/admin" : user.level ? "/courses" : "/placement"} replace />;
  return children;
}
GuestOnly.propTypes = { children: PropTypes.node };
