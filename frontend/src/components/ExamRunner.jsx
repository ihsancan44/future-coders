import { useCallback, useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import { Button, Radio } from "antd";
import { message, confirm } from "../utils/feedback";
import { Clock3 } from "lucide-react";
import { api, apiError } from "../api/client";

function useCountdown(deadline) {
  const [left, setLeft] = useState(() => (deadline ? deadline - Date.now() : null));
  useEffect(() => {
    if (!deadline) return undefined;
    const t = setInterval(() => setLeft(deadline - Date.now()), 1000);
    return () => clearInterval(t);
  }, [deadline]);
  return left;
}

const mmss = (ms) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

/** Sınavı soru soru gösterir, süre biterse otomatik gönderir, sonucu onFinished ile bildirir. */
export default function ExamRunner({ exam, attempt, onFinished }) {
  const storageKey = `fc_attempt_${attempt.id}`;
  const [answers, setAnswers] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem(storageKey)) || {};
    } catch {
      return {};
    }
  });
  const [current, setCurrent] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const submitted = useRef(false);

  const deadline = exam.durationMinutes ? new Date(attempt.startedAt).getTime() + exam.durationMinutes * 60_000 : null;
  const left = useCountdown(deadline);

  useEffect(() => {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(answers));
    } catch {
      /* yok say */
    }
  }, [answers, storageKey]);

  const submit = useCallback(async () => {
    if (submitted.current) return;
    submitted.current = true;
    setSubmitting(true);
    try {
      const payload = exam.questions.map((q) => ({ questionId: q.id, optionId: answers[q.id] ?? null }));
      const res = await api.post(`/exams/attempts/${attempt.id}/submit`, { answers: payload });
      try {
        sessionStorage.removeItem(storageKey);
      } catch {
        /* yok say */
      }
      onFinished(res.data);
    } catch (err) {
      submitted.current = false;
      setSubmitting(false);
      message.error(apiError(err).message);
    }
  }, [answers, attempt.id, exam.questions, onFinished, storageKey]);

  useEffect(() => {
    if (left !== null && left <= 0) submit();
  }, [left, submit]);

  const q = exam.questions[current];
  const answeredCount = exam.questions.filter((x) => answers[x.id]).length;
  const unanswered = exam.questions.length - answeredCount;

  const confirmSubmit = () => {
    confirm({
      title: "Sınavı bitir",
      content: unanswered ? `${unanswered} soru boş. Boş sorular yanlış sayılır. Yine de bitirmek istiyor musun?` : "Cevapların gönderilecek ve sınav bitecek.",
      okText: "Sınavı bitir",
      cancelText: "Devam et",
      onOk: submit,
    });
  };

  return (
    <div className="exam">
      <div className="exam__top">
        <div>
          <h1>{exam.title}</h1>
          <span className="muted">{answeredCount} / {exam.questions.length} soru cevaplandı</span>
        </div>
        {left !== null && (
          <span className={`exam__timer ${left < 60_000 ? "is-urgent" : ""}`} aria-live="polite">
            <Clock3 size={16} /> {mmss(left)}
          </span>
        )}
      </div>

      <nav className="exam__palette" aria-label="Sorular">
        {exam.questions.map((x, i) => (
          <button
            key={x.id}
            className={`${i === current ? "is-current" : ""} ${answers[x.id] ? "is-answered" : ""}`}
            onClick={() => setCurrent(i)}
            aria-label={`Soru ${i + 1}${answers[x.id] ? ", cevaplandı" : ""}`}
          >
            {i + 1}
          </button>
        ))}
      </nav>

      <section className="exam__question">
        <span className="muted small">Soru {current + 1}</span>
        <h2>{q.text}</h2>
        <Radio.Group
          className="exam__options"
          value={answers[q.id]}
          onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
        >
          {q.options.map((o, i) => (
            <Radio key={o.id} value={o.id}>
              <span className="exam__letter">{String.fromCharCode(65 + i)}</span> {o.text}
            </Radio>
          ))}
        </Radio.Group>
        {answers[q.id] && (
          <button className="link-btn" onClick={() => setAnswers(({ [q.id]: _removed, ...rest }) => rest)}>Cevabı temizle</button>
        )}
      </section>

      <div className="exam__nav">
        <Button disabled={current === 0} onClick={() => setCurrent((c) => c - 1)}>Önceki</Button>
        {current < exam.questions.length - 1 ? (
          <Button type="primary" onClick={() => setCurrent((c) => c + 1)}>Sonraki</Button>
        ) : (
          <Button type="primary" danger loading={submitting} onClick={confirmSubmit}>Sınavı bitir</Button>
        )}
      </div>
      {current < exam.questions.length - 1 && (
        <div className="center">
          <Button type="link" onClick={confirmSubmit} loading={submitting}>Sınavı şimdi bitir</Button>
        </div>
      )}
    </div>
  );
}

ExamRunner.propTypes = {
  exam: PropTypes.shape({
    title: PropTypes.string,
    durationMinutes: PropTypes.number,
    questions: PropTypes.arrayOf(PropTypes.object).isRequired,
  }).isRequired,
  attempt: PropTypes.shape({ id: PropTypes.number.isRequired, startedAt: PropTypes.string.isRequired }).isRequired,
  onFinished: PropTypes.func.isRequired,
};
