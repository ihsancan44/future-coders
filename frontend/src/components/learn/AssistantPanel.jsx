import { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import { Button, Input } from "antd";
import { Bot, RotateCcw, Send, X } from "lucide-react";
import { api, apiError } from "../../api/client";
import { useApi } from "../../hooks/useApi";
import RichText from "../RichText";

const CHIPS = ["Daha basit anlat", "Bir örnek daha ver", "Bana bir soru sor"];
const MAX_TURNS = 20;

/** Sağ panel: Codevia Asistan. Sorular o anki konunun özetiyle birlikte sunucuya gider. */
export default function AssistantPanel({ lesson, seed, onClose }) {
  const status = useApi("/assistant/status");
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const listRef = useRef(null);
  const inputRef = useRef(null);

  // Bir videonun "Sor" düğmesine basılınca soru kutusu o videoyla doldurulur.
  useEffect(() => {
    if (!seed) return;
    setText(seed.text);
    inputRef.current?.focus();
  }, [seed]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  const send = async (content) => {
    const question = content.trim();
    if (!question || sending) return;
    // Sunucu en fazla 20 mesaj kabul eder: uzun sohbette en eski mesajlar gönderilmez.
    let history = [...messages, { role: "user", content: question }].slice(-(MAX_TURNS - 1));
    if (history[0].role !== "user") history = history.slice(1);
    setMessages((m) => [...m, { role: "user", content: question }]);
    setText("");
    setError(null);
    setSending(true);
    try {
      const { data } = await api.post("/assistant/chat", { lessonId: lesson.id, messages: history });
      setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
    } catch (err) {
      const e = apiError(err);
      setError(e.message);
      // Cevap alınamayan soru tekrar sorulabilsin diye geri yazılır.
      setMessages((m) => m.slice(0, -1));
      setText(question);
    } finally {
      setSending(false);
    }
  };

  const enabled = status.data?.enabled;

  return (
    <div className="assistant">
      <div className="assistant__head">
        <span className="assistant__bot" aria-hidden="true"><Bot size={20} /></span>
        <div>
          <strong>Codevia Asistan</strong>
          <small>Takıldığın yeri sor</small>
        </div>
        {messages.length > 0 && (
          <Button type="text" icon={<RotateCcw size={16} />} onClick={() => setMessages([])} aria-label="Yeni sohbet" title="Yeni sohbet" />
        )}
        <Button type="text" icon={<X size={18} />} onClick={onClose} aria-label="Asistanı kapat" />
      </div>
      <p className="assistant__ctx">
        Şu an: <b>{lesson.title}</b> konusu
      </p>
      <div className="assistant__msgs" ref={listRef} aria-live="polite">
        {status.loading ? null : !enabled ? (
          <p className="assistant__off">
            Asistan henüz ayarlanmadı. Yöneticinin sunucuya bir Anthropic API anahtarı eklemesi gerekiyor. O zamana kadar sorularını konu yorumlarına yazabilirsin.
          </p>
        ) : messages.length === 0 ? (
          <p className="assistant__hello">Merhaba! Bu konuda anlamadığın bir şey varsa yaz, birlikte bakalım. Cevabı hemen vermek yerine düşünmene yardım ederim. 🙂</p>
        ) : (
          messages.map((m, i) => (
            <div key={i} className={`assistant__msg assistant__msg--${m.role}`}>
              {m.role === "assistant" ? <RichText text={m.content} /> : m.content}
            </div>
          ))
        )}
        {sending && (
          <div className="assistant__msg assistant__msg--assistant assistant__typing" aria-label="Asistan yazıyor">
            <i /><i /><i />
          </div>
        )}
      </div>
      {error && <p className="assistant__error" role="alert">{error}</p>}
      {enabled && (
        <>
          <div className="assistant__chips">
            {CHIPS.map((c) => (
              <button key={c} type="button" onClick={() => send(c)} disabled={sending || messages.length === 0}>
                {c}
              </button>
            ))}
          </div>
          <form
            className="assistant__input"
            onSubmit={(e) => {
              e.preventDefault();
              send(text);
            }}
          >
            <label htmlFor="assistant-text" className="sr-only">Sorun</label>
            <Input.TextArea
              id="assistant-text"
              ref={inputRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(text);
                }
              }}
              placeholder="Sorunu yaz…"
              autoSize={{ minRows: 1, maxRows: 4 }}
              maxLength={2000}
            />
            <Button type="primary" danger htmlType="submit" icon={<Send size={16} />} loading={sending} disabled={!text.trim()} aria-label="Gönder" />
          </form>
        </>
      )}
    </div>
  );
}

AssistantPanel.propTypes = {
  lesson: PropTypes.object.isRequired,
  seed: PropTypes.shape({ text: PropTypes.string }),
  onClose: PropTypes.func.isRequired,
};
