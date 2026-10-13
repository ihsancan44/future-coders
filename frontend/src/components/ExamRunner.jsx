import { useCallback, useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import { Button, Radio } from "antd";
import { message, confirm } from "../utils/feedback";
import { Clock3 } from "lucide-react";
import { api, apiError } from "../api/client";

function useCountdown(deadline, offset) {
  const now = () => Date.now() + offset;
  const [left, setLeft] = useState(() => (deadline ? deadline - now() : null));
  useEffect(() => {
    if (!deadline) return undefined;
    const t = setInterval(() => {
      const value = deadline - (Date.now() + offset);
      setLeft(value);
      if (value <= 0) clearInterval(t); // süre bitince sayaç durur
    }, 1000);
    return () => clearInterval(t);
  }, [deadline, offset]);
  return left;
}

const mmss = (ms) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

const KEY_PREFIX = "fc_attempt_";

/** Başka (bitmiş ya da silinmiş) denemelerden kalan kayıtlı cevapları temizler. */
function forgetOtherAttempts(currentKey) {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(KEY_PREFIX) && k !== currentKey)
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    /* yok say */
  }
}

/**
 * Sınavı soru soru gösterir, süre biterse otomatik gönderir, sonucu onFinished ile bildirir.
 * Cevaplar hem tarayıcıda hem sunucuda saklanır: süre dolup gönderilmezse sunucu kaydedilen cevaplarla puanlar.
 */
export default function ExamRunner({ exam, attempt, draft, serverNow, onFinished }) {
  const storageKey = `${KEY_PREFIX}${attempt.id}`;
  // Tarayıcıdaki kayıt sunucuya henüz gitmemişse en yenisi odur; gittiyse sunucudaki taslak esas alınır
  // (öğrenci bu arada başka cihazda cevap değiştirmiş olabilir).
  const [answers, setAnswers] = useState(() => {
    let local = null;
    try {
      local = JSON.parse(localStorage.getItem(storageKey));
    } catch {
      /* yok say */
    }
    if (local?.answers && !local.synced) return local.answers;
    return { ...(draft || {}) };
  });
  const [current, setCurrent] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const submitted = useRef(false);
  const autoTried = useRef(false);
  const dialog = useRef(null);
  const latest = useRef(answers);

  // Geri sayım sunucu saatine göre: bilgisayarın saati ileri/geri olsa da süre doğru işler.
  const [offset] = useState(() => (serverNow ? new Date(serverNow).getTime() - Date.now() : 0));
  const deadline = exam.durationMinutes ? new Date(attempt.startedAt).getTime() + exam.durationMinutes * 60_000 : null;
  const left = useCountdown(deadline, offset);

  useEffect(() => forgetOtherAttempts(storageKey), [storageKey]);
  useEffect(() => () => dialog.current?.destroy(), []);

  useEffect(() => {
    const remember = (synced) => {
      try {
        localStorage.setItem(storageKey, JSON.stringify({ answers, synced }));
      } catch {
        /* yok say */
      }
    };
    latest.current = answers;
    remember(false);
    // Sunucuya kısa bir beklemeyle kaydedilir (her tıklamada istek atılmaz). Hata olursa sonraki değişiklikte yeniden denenir.
    if (submitted.current) return undefined;
    const t = setTimeout(() => {
      const payload = Object.entries(answers).map(([questionId, optionId]) => ({ questionId: Number(questionId), optionId }));
      api
        .put(`/exams/attempts/${attempt.id}/answers`, { answers: payload })
        .then(() => !submitted.current && latest.current === answers && remember(true))
        .catch(() => {});
    }, 800);
    return () => clearTimeout(t);
  }, [answers, storageKey, attempt.id]);

  const forget = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
    } catch {
      /* yok say */
    }
  }, [storageKey]);

  const submit = useCallback(async () => {
    if (submitted.current) return;
    submitted.current = true;
    setSubmitting(true);
    dialog.current?.destroy();
    try {
      const payload = exam.questions.map((q) => ({ questionId: q.id, optionId: answers[q.id] ?? null }));
      const res = await api.post(`/exams/attempts/${attempt.id}/submit`, { answers: payload });
      forget();
      if (res.data.expired) message.info("Süre dolduğu için süre içinde işaretlediğin cevaplar puanlandı.");
      onFinished(res.data);
    } catch (err) {
      const e = apiError(err);
      if (e.code === "ATTEMPT_FINISHED") {
        // Sonuç sunucuya ulaşmış ama cevabı gelmemiş (bağlantı koptu ya da başka sekmede gönderildi): sonucu göster.
        forget();
        try {
          const [a, me] = await Promise.all([api.get(`/exams/attempts/${attempt.id}`), api.get("/auth/me")]);
          const done = a.data.attempt;
          onFinished({ attempt: done, user: me.data.user, courseReset: a.data.exam.type === "FINAL" && !done.passed });
          return;
        } catch {
          /* aşağıdaki genel hataya düş */
        }
      }
      if (e.code === "EXAM_CHANGED") {
        // Sınav öğrenci sınavdayken değişti: kayıtlı cevaplar geçersiz, sayfa sınavın başlangıç ekranına döner.
        forget();
        message.warning(e.message);
        setTimeout(() => window.location.reload(), 1500);
        return;
      }
      submitted.current = false;
      setSubmitting(false);
      message.error(e.message);
    }
  }, [answers, attempt.id, exam.questions, forget, onFinished]);

  useEffect(() => {
    // Süre bitince bir kez otomatik gönderilir; başarısız olursa öğrenci "Sınavı bitir" ile tekrar dener
    // (her saniye yeniden denenip hata mesajı yağdırılmaz).
    if (left !== null && left <= 0 && !autoTried.current) {
      autoTried.current = true;
      submit();
    }
  }, [left, submit]);

  const q = exam.questions[current];
  const answeredCount = exam.questions.filter((x) => answers[x.id]).length;
  const unanswered = exam.questions.length - answeredCount;

  const confirmSubmit = () => {
    dialog.current = confirm({
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
          <span className={`exam__timer ${left < 60_000 ? "is-urgent" : ""}`} role="timer" aria-label={`Kalan süre ${mmss(left)}`}>
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
  draft: PropTypes.object,
  serverNow: PropTypes.string,
  onFinished: PropTypes.func.isRequired,
};
