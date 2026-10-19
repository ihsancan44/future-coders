import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { Button } from "antd";
import { Bot, CheckCircle2 } from "lucide-react";
import Cover from "../Cover";
import InfoPanel from "../learn/InfoPanel";
import ReelPlayer from "../learn/ReelPlayer";
import AssistantPanel from "../learn/AssistantPanel";
import { Loading } from "../Status";
import logo from "../../assets/logo.svg";
import { codeQuestion } from "../../utils/assistant";

const CodeRunner = lazy(() => import("../code/CodeRunner"));

/** Konunun videoları: önce dersin kendi videosu, sonra eklenen kısa videolar. */
// eslint-disable-next-line react-refresh/only-export-components
export function reelItems(lesson) {
  if (!lesson) return [];
  const own = lesson.videoUrl
    ? [{ key: `lesson-${lesson.id}`, kind: "lesson", title: lesson.title, videoUrl: lesson.videoUrl, language: lesson.language, starterCode: lesson.codeExample }]
    : [];
  return [...own, ...(lesson.reels || []).map((r) => ({ ...r, key: `reel-${r.id}`, kind: "reel", language: r.language || lesson.language }))];
}

/**
 * Reels sahnesi: ortada konunun kısa videoları. Soldaki yuvarlak Codevia logosu "kısa bilgi + pratik"
 * panelini, sağdaki asistan düğmesi Codevia Asistan'ı açar. Videonun yanındaki düğme o dilin derleyicisini açar.
 */
export default function ReelsStage({ course, lesson, index, onNext }) {
  const [leftOpen, setLeftOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [compiler, setCompiler] = useState(null);
  const [seed, setSeed] = useState(null);
  // Asistan bir kez açıldıktan sonra kapatılınca sadece gizlenir, sohbet silinmez.
  const [chatUsed, setChatUsed] = useState(false);
  useEffect(() => {
    if (chatOpen) setChatUsed(true);
  }, [chatOpen]);
  const [reelIndex, setReelIndex] = useState(0);
  const items = useMemo(() => reelItems(lesson), [lesson]);
  const total = course.lessons.length;

  useEffect(() => {
    setReelIndex(0);
  }, [lesson?.id]);

  const openCompiler = (code, language) => {
    setCompiler({ code, language: language || lesson.language || "python", n: Date.now() });
    // Ekran derleyiciyle iki paneli yan yana sığdıramıyorsa paneller kapanır (istenirse üstte tekrar açılır).
    if (!window.matchMedia?.("(min-width: 1821px)").matches) {
      setLeftOpen(false);
      setChatOpen(false);
    }
  };
  const ask = (item) => {
    setChatOpen(true);
    setSeed({ text: `"${item.title}" videosunda anlamadığım yer: `, n: Date.now() });
  };
  const askCode = (info) => {
    setChatOpen(true);
    setSeed({ text: codeQuestion(info), n: Date.now() });
  };

  const endCard = (
    <div className="reel__end">
      <CheckCircle2 size={42} />
      <h3>{lesson.title} konusunun sonuna geldin</h3>
      <p>Kısa bilgileri ve pratiği soldaki Codevia logosundan açabilirsin.</p>
      {onNext && <Button type="primary" onClick={onNext}>Sonraki konuya geç</Button>}
      <Button onClick={() => setLeftOpen(true)}>Pratik yap</Button>
    </div>
  );

  const stageClass = ["learn__stage", leftOpen && "has-left", chatOpen && "has-chat", compiler && "has-compiler"].filter(Boolean).join(" ");

  return (
    <div className={stageClass}>
      {leftOpen && (
        <aside className="learn__panel learn__panel--left" aria-label="Kısa bilgi ve pratik">
          <InfoPanel lesson={lesson} index={index} total={total} onClose={() => setLeftOpen(false)} onTryCode={openCompiler} />
        </aside>
      )}
      <div className="learn__center">
        <button
          type="button"
          className={`learn__orb learn__orb--left ${leftOpen ? "is-on" : ""}`}
          onClick={() => setLeftOpen((v) => !v)}
          aria-pressed={leftOpen}
          aria-label="Kısa bilgi ve pratik panelini aç"
        >
          <img src={logo} alt="" />
          <span>Bilgi &amp; Pratik</span>
        </button>
        {items.length ? (
          <ReelPlayer
            items={items}
            index={reelIndex}
            onIndex={setReelIndex}
            onCompiler={(item) => openCompiler(item.starterCode, item.language)}
            onAsk={ask}
            endCard={endCard}
          />
        ) : (
          <div className="reel">
            <div className="reel__frame">
              <div className="reel__empty">
                <Cover image={course.coverImage} title={lesson.title} label="Bu konunun kısa videosu henüz yok" className="reel__cover" />
              </div>
            </div>
          </div>
        )}
        <button
          type="button"
          className={`learn__orb learn__orb--right ${chatOpen ? "is-on" : ""}`}
          onClick={() => setChatOpen((v) => !v)}
          aria-pressed={chatOpen}
          aria-label="Codevia Asistan'ı aç"
        >
          <span className="learn__orb-bot"><Bot size={26} /></span>
          <span>Asistan</span>
        </button>
      </div>
      {compiler && (
        <aside className="learn__compiler" aria-label="Derleyici">
          <Suspense fallback={<Loading />}>
            <CodeRunner
              key={compiler.n}
              compact
              initialLanguage={compiler.language}
              initialCode={compiler.code || undefined}
              onAsk={askCode}
              onClose={() => setCompiler(null)}
            />
          </Suspense>
        </aside>
      )}
      {chatUsed && (
        <aside className="learn__panel learn__panel--right" aria-label="Codevia Asistan" hidden={!chatOpen}>
          <AssistantPanel lesson={lesson} seed={seed} onClose={() => setChatOpen(false)} />
        </aside>
      )}
    </div>
  );
}
ReelsStage.propTypes = {
  course: PropTypes.object.isRequired,
  lesson: PropTypes.object.isRequired,
  index: PropTypes.number.isRequired,
  onNext: PropTypes.func,
};
