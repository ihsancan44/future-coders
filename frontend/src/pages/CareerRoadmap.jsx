import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Button, Tag } from "antd";
import { ArrowLeft, Check, Clock3, Flag, Hammer, Trophy } from "lucide-react";
import { api, apiError } from "../api/client";
import { ErrorState, Loading } from "../components/Status";
import { useAuth } from "../context/AuthContext";
import { useApi } from "../hooks/useApi";
import { careerIcon } from "../utils/careers";
import { message } from "../utils/feedback";
import { usePageMeta } from "../hooks/usePageMeta";

/** Seçilen alanın görsel yol haritası: aşamalar, konular ve her aşamanın projesi. */
export default function CareerRoadmap() {
  usePageMeta({ title: "Kariyer yol haritası", noindex: true });
  const { key } = useParams();
  const { user, setUser, isAdmin } = useAuth();
  const { data, error, loading, reload } = useApi(`/career/${key}`);
  const overview = useApi(isAdmin ? null : "/career");
  const [saving, setSaving] = useState(false);

  if (loading) return <Loading />;
  if (error) return <ErrorState message={error.message} onRetry={error.status === 404 ? undefined : reload} />;

  const career = data.career;
  const Icon = careerIcon(career.key);
  const current = user?.careerField === career.key;
  const canChoose = !current && overview.data?.eligible;

  const choose = async () => {
    setSaving(true);
    try {
      const res = await api.put("/career", { field: career.key });
      setUser(res.data.user);
      message.success(`${career.title} artık senin alanın.`);
    } catch (err) {
      message.error(apiError(err).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="roadmap" style={{ "--career": career.color }}>
      <section className="roadmap__hero">
        <div className="roadmap__hero-inner">
          <Link to="/career" className="roadmap__back"><ArrowLeft size={16} /> Tüm alanlar</Link>
          <span className="roadmap__icon"><Icon size={40} /></span>
          <h1>{career.title} Yol Haritası</h1>
          <p>{career.tagline}</p>
          <div className="roadmap__hero-actions">
            {current && <Tag color="green"><Check size={12} /> Senin alanın</Tag>}
            {canChoose && <Button type="primary" size="large" loading={saving} onClick={choose}>Bu alanı seç</Button>}
          </div>
          <ol className="roadmap__steps" aria-label="Aşamalar">
            {career.stages.map((s, i) => (
              <li key={s.title}>
                <a href={`#asama-${i + 1}`}><span>{i + 1}</span>{s.title}</a>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="section roadmap__body">
        <ol className="timeline">
          <li className="timeline__start">
            <span className="timeline__dot"><Flag size={18} /></span>
            <div><strong>Başlangıç</strong><p className="muted">Codevia'da bitirdiğin kurslar bu yolun ilk adımı.</p></div>
          </li>
          {career.stages.map((s, i) => (
            <li key={s.title} id={`asama-${i + 1}`} className="timeline__item">
              <span className="timeline__dot">{i + 1}</span>
              <article className="stage">
                <header>
                  <h2>{s.title}</h2>
                  <span className="stage__duration"><Clock3 size={14} /> {s.duration}</span>
                </header>
                <ul className="stage__topics">
                  {s.topics.map((t) => <li key={t}>{t}</li>)}
                </ul>
                <p className="stage__project"><Hammer size={16} /> <span><strong>Proje:</strong> {s.project}</span></p>
              </article>
            </li>
          ))}
          <li className="timeline__end">
            <span className="timeline__dot"><Trophy size={18} /></span>
            <div><strong>Hedef: {career.title} alanında ilk işin ya da stajın</strong><p className="muted">Projelerini portfolyonda topla, yarışma ve topluluklara katıl.</p></div>
          </li>
        </ol>
      </section>
    </div>
  );
}
