import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Cover from "../components/Cover";
import { ErrorState, Loading } from "../components/Status";
import { useApi } from "../hooks/useApi";
import { formatDate, paragraphs } from "../utils/format";

export default function BlogPost() {
  const { id } = useParams();
  const { data, error, loading } = useApi(`/blog/${id}`);
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
