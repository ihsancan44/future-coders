import { createContext, useCallback, useContext, useMemo, useState } from "react";
import PropTypes from "prop-types";

const ReelsContext = createContext(null);

/** Soldaki "Reels" bölümünün açık/kapalı durumu. Kurs sayfası belirli bir kursun konusunu açtırabilir. */
export function ReelsProvider({ children }) {
  const [state, setState] = useState({ open: false, courseId: null, lessonId: null, n: 0 });
  const openReels = useCallback((target = {}) => setState((s) => ({ open: true, courseId: target.courseId ?? null, lessonId: target.lessonId ?? null, n: s.n + 1 })), []);
  const closeReels = useCallback(() => setState((s) => ({ ...s, open: false })), []);
  const value = useMemo(() => ({ ...state, openReels, closeReels }), [state, openReels, closeReels]);
  return <ReelsContext.Provider value={value}>{children}</ReelsContext.Provider>;
}
ReelsProvider.propTypes = { children: PropTypes.node };

// eslint-disable-next-line react-refresh/only-export-components
export function useReels() {
  return useContext(ReelsContext);
}
