import PropTypes from "prop-types";
import { Button } from "antd";
import { Code2, X, Zap } from "lucide-react";
import { paragraphs } from "../../utils/format";
import PracticeQuiz from "./PracticeQuiz";

/** Sol panel: konunun kısa ve net özeti, örnek kod, "akılda kalsın" notu ve pratik soruları. */
export default function InfoPanel({ lesson, index, total, onClose, onTryCode }) {
  const points = lesson.keyPoints?.length ? lesson.keyPoints : paragraphs(lesson.content);
  return (
    <div className="info-panel">
      <div className="info-panel__head">
        <div>
          <span className="muted small">Konu {index + 1} / {total}</span>
          <h2>{lesson.title}</h2>
        </div>
        <Button type="text" icon={<X size={18} />} onClick={onClose} aria-label="Bilgi panelini kapat" />
      </div>
      <span className="info-panel__tag"><Zap size={13} /> Kısa ve net</span>
      {points.length ? (
        <ol className="info-panel__points">
          {points.map((p, i) => (
            <li key={i}>{p}</li>
          ))}
        </ol>
      ) : (
        <p className="muted">Bu konu için henüz özet eklenmedi.</p>
      )}
      {lesson.codeExample && (
        <div className="info-panel__code">
          <pre><code>{lesson.codeExample}</code></pre>
          {lesson.language && (
            <Button size="small" icon={<Code2 size={14} />} onClick={() => onTryCode(lesson.codeExample, lesson.language)}>
              Derleyicide dene
            </Button>
          )}
        </div>
      )}
      {lesson.tip && (
        <p className="info-panel__tip">
          <b>Akılda kalsın:</b> {lesson.tip}
        </p>
      )}
      {lesson.practice?.length ? <PracticeQuiz key={lesson.id} questions={lesson.practice} /> : null}
    </div>
  );
}

InfoPanel.propTypes = {
  lesson: PropTypes.object.isRequired,
  index: PropTypes.number.isRequired,
  total: PropTypes.number.isRequired,
  onClose: PropTypes.func.isRequired,
  onTryCode: PropTypes.func.isRequired,
};
