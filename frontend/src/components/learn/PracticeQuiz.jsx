import { useState } from "react";
import PropTypes from "prop-types";
import { Button } from "antd";
import { CheckCircle2, RotateCcw, XCircle } from "lucide-react";

const LETTERS = "ABCDE";

/** Konu sonundaki kısa pratik: sorular tek tek gelir, cevap hemen kontrol edilir. */
export default function PracticeQuiz({ questions }) {
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState(null);
  const [correct, setCorrect] = useState(0);
  const done = index >= questions.length;
  const q = questions[index];

  const choose = (i) => {
    if (picked !== null) return;
    setPicked(i);
    if (i === q.answerIndex) setCorrect((c) => c + 1);
  };
  const next = () => {
    setPicked(null);
    setIndex((i) => i + 1);
  };
  const restart = () => {
    setIndex(0);
    setPicked(null);
    setCorrect(0);
  };

  if (!questions.length) return null;
  return (
    <section className="practice" aria-label="Pratik">
      <h3>
        ✍️ Pratik
        <span className="muted small">{done ? "Bitti" : `${index + 1} / ${questions.length}`}</span>
      </h3>
      {done ? (
        <div className="practice__done">
          <p>
            <strong>{questions.length} sorudan {correct} doğru.</strong>{" "}
            {correct === questions.length ? "Harika, bu konu tamam!" : "Videolara bir daha göz atıp tekrar deneyebilirsin."}
          </p>
          <Button icon={<RotateCcw size={14} />} onClick={restart}>Tekrar çöz</Button>
        </div>
      ) : (
        <>
          <p className="practice__text">{q.text}</p>
          {q.code && <pre className="practice__code"><code>{q.code}</code></pre>}
          <div className="practice__options" role="radiogroup" aria-label="Seçenekler">
            {q.options.map((opt, i) => {
              const state = picked === null ? "" : i === q.answerIndex ? "is-right" : i === picked ? "is-wrong" : "";
              return (
                <button
                  key={i}
                  type="button"
                  role="radio"
                  aria-checked={picked === i}
                  className={`practice__option ${state}`}
                  onClick={() => choose(i)}
                  disabled={picked !== null && state === ""}
                >
                  <b>{LETTERS[i]}</b>
                  <span>{opt}</span>
                  {state === "is-right" && <CheckCircle2 size={16} aria-label="Doğru cevap" />}
                  {state === "is-wrong" && <XCircle size={16} aria-label="Yanlış cevap" />}
                </button>
              );
            })}
          </div>
          {picked !== null && (
            <div className={`practice__feedback ${picked === q.answerIndex ? "ok" : "err"}`} role="status">
              <span>
                {picked === q.answerIndex ? "Doğru!" : `Doğru cevap ${LETTERS[q.answerIndex]}.`} {q.explanation}
              </span>
              <Button type="primary" size="small" onClick={next}>
                {index + 1 < questions.length ? "Sonraki soru" : "Sonucu gör"}
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  );
}

PracticeQuiz.propTypes = {
  questions: PropTypes.arrayOf(
    PropTypes.shape({ text: PropTypes.string, code: PropTypes.string, options: PropTypes.arrayOf(PropTypes.string), answerIndex: PropTypes.number, explanation: PropTypes.string }),
  ).isRequired,
};
