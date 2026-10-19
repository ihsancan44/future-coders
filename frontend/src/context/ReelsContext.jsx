import { createContext, useCallback, useContext, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { useLocation, useNavigate } from "react-router-dom";

const ReelsContext = createContext(null);

/**
 * Soldaki "Reels" bölümünün açık/kapalı durumu. Açılınca geçmişe bir adım eklenir: tarayıcının (ya da telefonun)
 * geri tuşu önce Reels'i kapatır, sayfadan çıkmaz. Kurs sayfası belirli bir kursun konusunu açtırabilir.
 */
export function ReelsProvider({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [target, setTarget] = useState({ courseId: null, lessonId: null, n: 0 });
  const open = location.state?.reels === true;

  const openReels = useCallback(
    (t = {}) => {
      setTarget((s) => ({ courseId: t.courseId ?? null, lessonId: t.lessonId ?? null, n: s.n + 1 }));
      if (!open) navigate(location.pathname + location.search, { state: { reels: true } });
    },
    [navigate, location.pathname, location.search, open],
  );
  const closeReels = useCallback(() => {
    if (!open) return;
    // Reels'i açan adım geçmişteyse geri gidilir; sayfa yeniden yüklendiyse aynı adres durumsuz yazılır.
    if (window.history.state?.idx > 0) navigate(-1);
    else navigate(location.pathname + location.search, { replace: true });
  }, [navigate, location.pathname, location.search, open]);

  const value = useMemo(() => ({ ...target, open, openReels, closeReels }), [target, open, openReels, closeReels]);
  return <ReelsContext.Provider value={value}>{children}</ReelsContext.Provider>;
}
ReelsProvider.propTypes = { children: PropTypes.node };

// eslint-disable-next-line react-refresh/only-export-components
export function useReels() {
  return useContext(ReelsContext);
}
