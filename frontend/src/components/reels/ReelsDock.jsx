import { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { Link, matchPath, useLocation } from "react-router-dom";
import { Button, Empty, Select } from "antd";
import { Clapperboard, X } from "lucide-react";
import ReelsStage from "./ReelsStage";
import { ErrorState, Loading } from "../Status";
import { useApi } from "../../hooks/useApi";
import { useAuth } from "../../context/AuthContext";
import { useReels } from "../../context/ReelsContext";

/** Açık Reels bölümünün içeriği: kurs ve konu seçimi, altında reels sahnesi. */
function ReelsBody({ initialCourseId, initialLessonId }) {
  const courses = useApi("/courses", { mine: "true" });
  const open = useMemo(() => (courses.data?.courses || []).filter((c) => c.access?.canAccess && c.lessonCount > 0), [courses.data]);
  const [courseId, setCourseId] = useState(initialCourseId);
  const [lessonId, setLessonId] = useState(initialLessonId);
  const activeId = open.some((c) => c.id === courseId) ? courseId : open[0]?.id;
  const detail = useApi(activeId ? `/courses/${activeId}` : null);
  const course = detail.data?.course;
  const lessons = course?.lessons || [];
  const picked = lessons.findIndex((l) => l.id === lessonId);
  const index = picked >= 0 ? picked : Math.max(0, lessons.findIndex((l) => !l.completed));
  const lesson = lessons[index];
  const next = lessons[index + 1];

  if (courses.loading) return <Loading />;
  if (courses.error) return <ErrorState message={courses.error.message} onRetry={courses.reload} />;
  if (!open.length) {
    return (
      <Empty description="Kısa videolarını izleyebileceğin bir kurs yok. Önce seviye sınavına girmen gerekebilir.">
        <Link to="/courses" className="btn btn--primary btn--sm">Kurslara göz at</Link>
      </Empty>
    );
  }
  return (
    <>
      <div className="reels-dock__pickers">
        <label htmlFor="reels-course" className="sr-only">Kurs seç</label>
        <Select
          id="reels-course"
          className="reels-dock__course"
          value={activeId}
          onChange={(v) => {
            setCourseId(v);
            setLessonId(null);
          }}
          options={open.map((c) => ({ value: c.id, label: c.title }))}
        />
        <label htmlFor="reels-topic" className="sr-only">Konu seç</label>
        <Select
          id="reels-topic"
          className="reels-dock__topic"
          value={lesson?.id}
          disabled={!lesson}
          onChange={setLessonId}
          options={lessons.map((l, i) => ({ value: l.id, label: `Konu ${i + 1}: ${l.title}` }))}
        />
      </div>
      {detail.loading ? (
        <Loading />
      ) : detail.error ? (
        <ErrorState message={detail.error.message} onRetry={detail.reload} />
      ) : lesson ? (
        <ReelsStage key={course.id} course={course} lesson={lesson} index={index} onNext={next ? () => setLessonId(next.id) : undefined} />
      ) : (
        <Empty description="Bu kursta henüz konu yok." />
      )}
    </>
  );
}

ReelsBody.propTypes = { initialCourseId: PropTypes.number, initialLessonId: PropTypes.number };

/**
 * Sayfanın solundaki "Reels" sekmesi. Basınca kısa videolar soldan açılan ayrı bir bölümde gösterilir;
 * kapatınca sayfa olduğu gibi kalır. Kurs sayfasındayken o kursun o anki konusuyla açılır.
 */
export default function ReelsDock() {
  const { user } = useAuth();
  const { open, courseId, lessonId, n, openReels, closeReels } = useReels();
  const { pathname, search } = useLocation();

  const fromPage = () => {
    const m = matchPath("/courses/:id", pathname);
    if (!m) return {};
    return { courseId: Number(m.params.id), lessonId: Number(new URLSearchParams(search).get("lesson")) || null };
  };

  useEffect(() => {
    closeReels();
  }, [pathname, closeReels]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === "Escape" && !document.querySelector(".ant-select-open") && closeReels();
    window.addEventListener("keydown", onKey);
    document.body.classList.add("reels-lock");
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.classList.remove("reels-lock");
    };
  }, [open, closeReels]);

  return (
    <>
      {!open && (
        <button type="button" className="reels-tab" onClick={() => openReels(fromPage())} aria-label="Reels bölümünü aç">
          <Clapperboard size={20} />
          <span>Reels</span>
        </button>
      )}
      {open && (
        <div className="reels-dock" role="dialog" aria-modal="true" aria-label="Reels">
          <div className="reels-dock__bar">
            <h2><Clapperboard size={22} /> Reels</h2>
            <Button type="text" icon={<X size={20} />} onClick={closeReels} aria-label="Reels bölümünü kapat">Kapat</Button>
          </div>
          <div className="learn reels-dock__body">
            {user ? (
              <ReelsBody key={n} initialCourseId={courseId} initialLessonId={lessonId} />
            ) : (
              <Empty description="Kısa videoları izlemek için giriş yapmalısın.">
                <Link to="/login" className="btn btn--primary btn--sm">Giriş yap</Link>
              </Empty>
            )}
          </div>
        </div>
      )}
    </>
  );
}
