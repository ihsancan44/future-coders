import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Alert, Tag } from "antd";
import { ArrowRight, Check } from "lucide-react";
import { api, apiError } from "../api/client";
import PageBanner from "../components/PageBanner";
import { ErrorState, Loading } from "../components/Status";
import { useAuth } from "../context/AuthContext";
import { useApi } from "../hooks/useApi";
import { careerIcon } from "../utils/careers";
import { message } from "../utils/feedback";

/** Final testini geçen öğrenci burada yazılım alanını seçer. */
export default function CareerPicker() {
  const { setUser, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { data, error, loading, reload } = useApi("/career");
  const [saving, setSaving] = useState(null);

  const choose = async (key) => {
    setSaving(key);
    try {
      const res = await api.put("/career", { field: key });
      setUser(res.data.user);
      navigate(`/career/${key}`);
    } catch (err) {
      message.error(apiError(err).message);
      setSaving(null);
    }
  };

  return (
    <>
      <PageBanner title="Alanını Seç" />
      <section className="section">
        {loading ? (
          <Loading />
        ) : error ? (
          <ErrorState message={error.message} onRetry={reload} />
        ) : (
          <>
            {data.eligible ? (
              <p className="lead center">
                Tebrikler! <strong>{data.passedCourses.map((c) => c.title).join(", ")}</strong> testini geçtin.
                Yazılımda ilerlemek istediğin alanı seç; sana adım adım bir yol haritası hazırladık.
              </p>
            ) : (
              !isAdmin && (
                <Alert
                  type="info"
                  showIcon
                  className="career-alert"
                  message="Alan seçimi, bir kursun final testini geçince açılır."
                  description="Şimdilik alanları inceleyebilirsin. Bir kursu bitirip testini geçtiğinde buradan seçimini yaparsın."
                  action={<Link to="/courses" className="btn btn--primary btn--sm">Kurslara git</Link>}
                />
              )
            )}
            <div className="career-grid">
              {data.fields.map((f) => {
                const Icon = careerIcon(f.key);
                const current = data.current === f.key;
                return (
                  <article key={f.key} className={`career-card ${current ? "is-current" : ""}`} style={{ "--career": f.color }}>
                    <span className="career-card__icon"><Icon size={28} /></span>
                    <h2>{f.title}</h2>
                    <p>{f.tagline}</p>
                    <span className="muted small">{f.stageCount} aşamalı yol haritası</span>
                    {current && <Tag color="green" className="career-card__tag"><Check size={12} /> Senin alanın</Tag>}
                    <div className="career-card__actions">
                      <Link to={`/career/${f.key}`} className="btn btn--ghost btn--sm">İncele <ArrowRight size={14} /></Link>
                      {data.eligible && !current && (
                        <button className="btn btn--primary btn--sm" disabled={!!saving} onClick={() => choose(f.key)}>
                          {saving === f.key ? "Kaydediliyor..." : "Bu alanı seç"}
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </section>
    </>
  );
}
