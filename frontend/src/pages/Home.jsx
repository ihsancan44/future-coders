import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { Collapse } from "antd";
import { ArrowRight, ChevronsRight, ClipboardCheck, GraduationCap, Trophy } from "lucide-react";
import CourseCard from "../components/CourseCard";
import { Loading } from "../components/Status";
import { useApi } from "../hooks/useApi";
import { useAuth } from "../context/AuthContext";
import { usePageMeta } from "../hooks/usePageMeta";
import { PAGES } from "../seo/pages";

const steps = [
  { icon: GraduationCap, title: "Kayıt ol", text: "İsim, okul ve doğum tarihinle ücretsiz hesabını aç." },
  { icon: ClipboardCheck, title: "Seviye sınavına gir", text: "Kısa sınavın sonucuna göre Alpha ya da Beta sınıfına yerleş." },
  { icon: Trophy, title: "Kursları bitir", text: "Videoları izle, adımları tamamla, final sınavıyla kendini kanıtla." },
];

const faq = [
  { question: "Amacımız ne?", answer: "Lise öğrencilerinin üniversiteye başlamadan yazılımla tanışmasını, temel programlama becerilerini kazanmasını ve bu alanı gerçekten sevip sevmediğini erkenden görmesini sağlamak." },
  { question: "Alpha ve Beta sınıfları ne demek?", answer: "Kayıttan sonra girdiğin seviye sınavı seni bir sınıfa yerleştirir. Alpha başlangıç, Beta ileri sınıftır. Her sınıf kendi seviyesine uygun kursları ve herkese açık kursları görür." },
  { question: "Kurslar ücretli mi?", answer: "Hayır. Kayıt olan her öğrenci, sınıfına açık tüm kurslara ve final sınavlarına ücretsiz erişir." },
];

function CourseRow({ title, sort }) {
  const { data, loading } = useApi("/courses", { sort, limit: 3 });
  return (
    <section className="section">
      <div className="section__head">
        <h2>{title}</h2>
        <Link to="/courses" className="link-arrow">Tüm kurslar <ChevronsRight size={16} /></Link>
      </div>
      {loading ? (
        <Loading />
      ) : data?.courses?.length ? (
        <div className="card-grid">{data.courses.map((c) => <CourseCard key={c.id} course={c} />)}</div>
      ) : (
        <p className="muted">Henüz yayında kurs yok.</p>
      )}
    </section>
  );
}
CourseRow.propTypes = { title: PropTypes.string.isRequired, sort: PropTypes.string.isRequired };

// Sık sorulan sorular arama sonuçlarında da gösterilebilsin diye yapılandırılmış veri olarak verilir.
function homeJsonLd() {
  const origin = window.location.origin;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "EducationalOrganization",
        "@id": `${origin}/#organization`,
        name: "Codevia",
        url: `${origin}/`,
        logo: `${origin}/apple-touch-icon.png`,
        description: PAGES["/"].description,
      },
      {
        "@type": "WebSite",
        "@id": `${origin}/#website`,
        name: "Codevia",
        url: `${origin}/`,
        inLanguage: "tr-TR",
        publisher: { "@id": `${origin}/#organization` },
      },
      {
        "@type": "FAQPage",
        mainEntity: faq.map((f) => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } })),
      },
    ],
  };
}

export default function Home() {
  usePageMeta({ ...PAGES["/"], jsonLd: homeJsonLd() });
  const { user } = useAuth();
  const cta = !user ? { to: "/register", label: "Hemen kayıt ol" } : !user.level && user.role !== "ADMIN" ? { to: "/placement", label: "Seviye sınavına başla" } : { to: "/courses", label: "Kurslara git" };
  return (
    <>
      <section className="hero">
        <div className="hero__inner">
          <span className="hero__eyebrow">Yazılımın eğlenceli hali</span>
          <h1>Üniversiteye geçmeden rakiplerinin önüne geç</h1>
          <p>Seviyene göre hazırlanmış kurslarla HTML'den React'e, algoritmadan Python'a adım adım ilerle.</p>
          <div className="hero__actions">
            <Link to={cta.to} className="btn btn--primary">{cta.label} <ArrowRight size={16} /></Link>
            <Link to="/courses" className="btn btn--ghost">Kursları incele</Link>
          </div>
        </div>
      </section>

      <section className="section steps">
        {steps.map(({ icon: Icon, title, text }, i) => (
          <div key={title} className="step">
            <span className="step__num">{i + 1}</span>
            <Icon />
            <h2>{title}</h2>
            <p>{text}</p>
          </div>
        ))}
      </section>

      <CourseRow title="Yeni Kurslar" sort="new" />
      <div className="band">
        <CourseRow title="En Popüler Kurslar" sort="popular" />
      </div>

      <section className="section section--narrow">
        <h2>Hakkımızda</h2>
        <Collapse
          items={faq.map((f, i) => ({ key: String(i + 1), label: f.question, children: <p>{f.answer}</p>, forceRender: true }))}
          defaultActiveKey={["1"]}
        />
      </section>
    </>
  );
}
