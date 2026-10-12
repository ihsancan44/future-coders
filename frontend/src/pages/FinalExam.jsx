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
    return (
      <section className="section section--narrow">
        <Result
          status={a.passed ? "success" : "warning"}
          title={a.passed ? "Tebrikler, final sınavını geçtin!" : "Bu sefer olmadı"}
          subTitle={`${a.totalCount} sorudan ${a.correctCount} doğru, puanın %${a.score}. Geçme notu %${session.exam.passingScore}.`}
          extra={[
            <Link key="course" to={`/courses/${courseId}`} className="btn btn--primary">Kursa dön</Link>,
            <Link key="courses" to="/courses" className="btn btn--ghost">Diğer kurslar</Link>,
          ]}
        />
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
