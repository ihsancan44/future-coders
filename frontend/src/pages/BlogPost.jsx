import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Cover from "../components/Cover";
import { ErrorState, Loading } from "../components/Status";
import { useApi } from "../hooks/useApi";
import { usePageMeta } from "../hooks/usePageMeta";
import { assetUrl } from "../api/client";
import { formatDate, paragraphs } from "../utils/format";

function articleJsonLd(post) {
  const origin = window.location.origin;
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.summary,
    url: `${origin}/roadmap/${post.id}`,
    inLanguage: "tr-TR",
    datePublished: post.createdAt,
    dateModified: post.updatedAt,
    articleSection: post.tag,
    author: { "@type": post.author ? "Person" : "Organization", name: post.author || "Codevia" },
    publisher: { "@type": "EducationalOrganization", name: "Codevia", logo: { "@type": "ImageObject", url: `${origin}/apple-touch-icon.png` } },
    image: new URL(post.coverImage ? assetUrl(post.coverImage) : "/og-image.png", origin).href,
  };
}

export default function BlogPost() {
  const { id } = useParams();
  const { data, error, loading } = useApi(`/blog/${id}`);
  const meta = data?.post;
  usePageMeta(
    meta
      ? {
          title: meta.title,
          description: meta.summary,
          image: meta.coverImage ? assetUrl(meta.coverImage) : null,
          type: "article",
          jsonLd: articleJsonLd(meta),
        }
      : { title: "Yol Haritası", noindex: Boolean(error) },
  );
  if (loading) return <Loading />;
  if (error) return <ErrorState message={error.message} />;
  const post = data.post;
  return (
    <article className="section section--narrow article">
      <Link to="/roadmap" className="link-arrow"><ArrowLeft size={16} /> Yol haritasına dön</Link>
      <span className="article__tag">{post.tag}</span>
      <h1>{post.title}</h1>
      <p className="muted">{post.author} · {formatDate(post.createdAt)}</p>
      <Cover image={post.coverImage} title={post.title} label={post.tag} className="article__cover" />
      <div className="prose">
        <p className="lead">{post.summary}</p>
        {paragraphs(post.content).map((p, i) => <p key={i}>{p}</p>)}
      </div>
    </article>
  );
}
