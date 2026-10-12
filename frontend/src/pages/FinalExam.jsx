import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Result } from "antd";
import { api, apiError } from "../api/client";
import ExamRunner from "../components/ExamRunner";
import { ErrorState, Loading } from "../components/Status";

export default function FinalExam() {
  const courseId = Number(useParams().id);
  const [session, setSession] = useState(null);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  useEffect(() => {
    let alive = true;
    api
      .post(`/exams/courses/${courseId}/final/start`)
      .then((res) => alive && setSession(res.data))
      .catch((err) => alive && setError(apiError(err)));
    return () => {
      alive = false;
    };
  }, [courseId]);

  if (error) {
    return (
      <section className="section section--narrow">
        <ErrorState message={error.message} />
        <div className="center"><Link to={`/courses/${courseId}`}>Kursa dön</Link></div>
      </section>
    );
  }
  if (result) {
    const a = result.attempt;
    const score = `${a.totalCount} sorudan ${a.correctCount} doğru, puanın %${a.score}. Geçme notu %${session.exam.passingScore}.`;
    const field = result.user?.careerField;
    return (
      <section className="section section--narrow">
        {a.passed ? (
          <Result
            status="success"
            title="Tebrikler, kursu başarıyla bitirdin!"
            subTitle={`${score} Şimdi yazılımda ilerlemek istediğin alanı seç, sana özel yol haritanı gör.`}
            extra={[
              <Link key="career" to="/career" className="btn btn--primary">{field ? "Alanını gözden geçir" : "Alanını seç"}</Link>,
              ...(field ? [<Link key="map" to={`/career/${field}`} className="btn btn--ghost">Yol haritana git</Link>] : []),
              <Link key="courses" to="/courses" className="btn btn--ghost">Diğer kurslar</Link>,
            ]}
          />
        ) : (
          <Result
            status="warning"
            title="Bu sefer olmadı"
            subTitle={`${score} ${result.courseReset ? "Kurs ilerlemen sıfırlandı: adımları baştan tamamlayıp teste tekrar girebilirsin." : ""}`}
            extra={[
              <Link key="course" to={`/courses/${courseId}`} className="btn btn--primary">Kursa baştan başla</Link>,
            ]}
          />
        )}
      </section>
    );
  }
  if (!session) return <Loading tip="Sınav hazırlanıyor..." />;
  return (
    <section className="section section--narrow">
      <ExamRunner exam={session.exam} attempt={session.attempt} onFinished={setResult} />
    </section>
  );
}
