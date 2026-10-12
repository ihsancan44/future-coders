import { useState } from "react";
import { Link } from "react-router-dom";
import { Segmented } from "antd";
import { ArrowRight, BookMarked, CalendarCheck } from "lucide-react";
import PageBanner from "../components/PageBanner";
import Cover from "../components/Cover";
import { ErrorState, Loading } from "../components/Status";
import { useApi } from "../hooks/useApi";
import { formatDate } from "../utils/format";

export default function Roadmap() {
  const [tag, setTag] = useState("");
  const { data, error, loading, reload } = useApi("/blog", tag ? { tag } : undefined);
  const [tags, setTags] = useState([]);
  if (data?.tags && !tag && tags.length !== data.tags.length) setTags(data.tags);

  return (
    <>
      <PageBanner title="Yol Haritası" />
      <section className="section section--narrow">
        {tags.length > 1 && (
          <Segmented options={[{ label: "Tümü", value: "" }, ...tags.map((t) => ({ label: t, value: t }))]} value={tag} onChange={setTag} />
        )}
        {loading ? (
          <Loading />
        ) : error ? (
          <ErrorState message={error.message} onRetry={reload} />
        ) : data.posts.length ? (
          <div className="post-list">
            {data.posts.map((p) => (
              <article key={p.id} className="post-card">
                <Cover image={p.coverImage} title={p.title} label={p.tag} className="post-card__cover" />
                <div className="post-card__body">
                  <div className="post-card__meta">
                    <span><CalendarCheck size={14} /> {formatDate(p.createdAt)}</span>
                    <span><BookMarked size={14} /> {p.tag}</span>
                    <span>{p.author}</span>
                  </div>
                  <h2><Link to={`/roadmap/${p.id}`}>{p.title}</Link></h2>
                  <p>{p.summary}</p>
                  <Link to={`/roadmap/${p.id}`} className="btn btn--ghost btn--sm">Devamını oku <ArrowRight size={14} /></Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="muted center">Henüz yayında yazı yok.</p>
        )}
      </section>
    </>
  );
}
