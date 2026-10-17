import { useEffect, useRef } from "react";
import PropTypes from "prop-types";
import { Button } from "antd";
import { ChevronDown, ChevronUp, Code2, MessageCircleQuestion, PlayCircle } from "lucide-react";
import { assetUrl } from "../../api/client";
import { embedUrl, isVideoFile } from "../../utils/format";
import { languageByKey } from "../../utils/languages";

function Media({ item }) {
  if (isVideoFile(item.videoUrl)) {
    const src = assetUrl(item.videoUrl);
    return <video key={src} src={src} controls playsInline controlsList="nodownload" preload="metadata" title={item.title} />;
  }
  const src = embedUrl(item.videoUrl);
  if (!src) return <div className="reel__empty"><PlayCircle size={40} /><p>Bu video açılamıyor.</p></div>;
  return (
    <iframe
      key={src}
      src={src}
      title={item.title}
      allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      referrerPolicy="strict-origin-when-cross-origin"
      allowFullScreen
    />
  );
}
Media.propTypes = { item: PropTypes.object.isRequired };

const typing = (el) => el && (el.closest(".cm-editor") || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName) || el.isContentEditable);

/**
 * Ortadaki dikey kısa video (reels) oynatıcısı. Yukarı/aşağı düğmeleri, ok tuşları ve fare tekerleğiyle videolar arasında gezilir.
 * Son kart konuyu bitirip sonraki konuya geçmeyi önerir.
 */
export default function ReelPlayer({ items, index, onIndex, onCompiler, onAsk, endCard }) {
  const count = items.length + 1; // + bitiş kartı
  const wheelLock = useRef(0);
  const go = (d) => onIndex(Math.max(0, Math.min(count - 1, index + d)));
  const goRef = useRef(go);
  goRef.current = go;

  useEffect(() => {
    const onKey = (e) => {
      if (typing(document.activeElement) || e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key === "ArrowDown") goRef.current(1);
      else if (e.key === "ArrowUp") goRef.current(-1);
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const onWheel = (e) => {
    if (Math.abs(e.deltaY) < 30 || Date.now() - wheelLock.current < 700) return;
    wheelLock.current = Date.now();
    go(e.deltaY > 0 ? 1 : -1);
  };

  const item = items[index];
  const lang = item?.language && languageByKey(item.language);

  return (
    <div className="reel">
      <div className="reel__head">
        <span className="reel__count">{item ? `${index + 1} / ${items.length}` : "Konu sonu"}</span>
        <div className="reel__dots" aria-hidden="true">
          {Array.from({ length: count }, (_, i) => (
            <i key={i} className={i === index ? "is-on" : i < index ? "is-seen" : ""} />
          ))}
        </div>
      </div>
      <div className="reel__row">
        <div className="reel__frame" onWheel={onWheel} aria-roledescription="kısa video" aria-label={item ? item.title : "Konu sonu"}>
          {item ? (
            <>
              <Media item={item} />
              <div className="reel__caption">
                <strong>{item.title}</strong>
                {item.kind === "lesson" && <span>Ders videosu</span>}
              </div>
            </>
          ) : (
            endCard
          )}
        </div>
        <div className="reel__side">
          <Button shape="circle" size="large" icon={<ChevronUp />} disabled={index === 0} onClick={() => go(-1)} aria-label="Önceki video" />
          {item && (
            <>
              <button type="button" className="reel__action" onClick={() => onCompiler(item)} aria-label={`${lang ? lang.label : ""} derleyicisini aç`}>
                <span><Code2 /></span>
                {lang ? lang.label : "Derleyici"}
              </button>
              <button type="button" className="reel__action" onClick={() => onAsk(item)}>
                <span><MessageCircleQuestion /></span>
                Sor
              </button>
            </>
          )}
          <Button shape="circle" size="large" icon={<ChevronDown />} disabled={index >= count - 1} onClick={() => go(1)} aria-label="Sonraki video" />
        </div>
      </div>
    </div>
  );
}

ReelPlayer.propTypes = {
  items: PropTypes.arrayOf(
    PropTypes.shape({ key: PropTypes.string, title: PropTypes.string, videoUrl: PropTypes.string, language: PropTypes.string, starterCode: PropTypes.string, kind: PropTypes.string }),
  ).isRequired,
  index: PropTypes.number.isRequired,
  onIndex: PropTypes.func.isRequired,
  onCompiler: PropTypes.func.isRequired,
  onAsk: PropTypes.func.isRequired,
  endCard: PropTypes.node,
};
