import { useState } from "react";
import PropTypes from "prop-types";
import { Link, useLocation } from "react-router-dom";
import { Alert, Button, Result } from "antd";
import { api, apiError } from "../api/client";
import ExamRunner from "../components/ExamRunner";
import { ErrorState, Loading } from "../components/Status";
import { useApi } from "../hooks/useApi";
import { useAuth } from "../context/AuthContext";
import { LEVEL_DESC, LEVEL_LABEL } from "../utils/format";

export function LevelResult({ attempt, level }) {
  return (
    <Result
      status="success"
      title={`${LEVEL_LABEL[level]} sınıfına yerleştin`}
      subTitle={
        attempt
          ? `Seviye sınavında ${attempt.totalCount} sorudan ${attempt.correctCount} doğru yaptın (%${attempt.score}). ${LEVEL_DESC[level]} kursları ve herkese açık kurslar seni bekliyor.`
          : `${LEVEL_DESC[level]} kursları ve herkese açık kurslar seni bekliyor.`
      }
      extra={[
        <Link key="courses" to="/courses?mine=true" className="btn btn--primary">Sınıfımın kurslarına git</Link>,
        <Link key="home" to="/" className="btn btn--ghost">Ana sayfaya git</Link>,
      ]}
    />
  );
}

LevelResult.propTypes = { attempt: PropTypes.object, level: PropTypes.string };

export default function Placement() {
  const { user, setUser, isAdmin } = useAuth();
  const location = useLocation();
  const { data, error, loading, reload } = useApi(isAdmin ? null : "/exams/placement");
  const [session, setSession] = useState(null);
  const [result, setResult] = useState(null);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState(null);

  if (isAdmin) return <ErrorState message="Admin hesapları seviye sınavına girmez." />;
  if (result) return <section className="section section--narrow"><LevelResult attempt={result.attempt} level={result.user.level} /></section>;
  if (session) {
    return (
      <section className="section section--narrow">
        <ExamRunner
          exam={session.exam}
          attempt={session.attempt}
          onFinished={(res) => {
            setUser(res.user);
            setResult(res);
          }}
        />
      </section>
    );
  }
  if (loading) return <Loading />;
  if (error) return <ErrorState message={error.message} onRetry={reload} />;
  if (data.status === "DONE") return <section className="section section--narrow"><LevelResult attempt={data.attempt} level={data.level || user.level} /></section>;

  const start = async () => {
    setStarting(true);
    setStartError(null);
    try {
      const res = await api.post("/exams/placement/start");
      setSession(res.data);
    } catch (err) {
      setStartError(apiError(err).message);
      setStarting(false);
    }
  };

  const exam = data.exam;
  return (
    <section className="section section--narrow">
      <div className="exam-intro">
        {location.state?.welcome && <Alert type="success" showIcon message={`Hoş geldin ${user.firstName}! Hesabın oluşturuldu.`} />}
        <h1>{exam.title}</h1>
        <p>{exam.description}</p>
        <ul className="exam-intro__facts">
          <li><strong>{exam.questionCount}</strong> soru</li>
          <li><strong>{exam.durationMinutes ? `${exam.durationMinutes} dk` : "Süresiz"}</strong> süre</li>
          <li><strong>1</strong> deneme hakkı</li>
        </ul>
        <p className="muted">Sınav sonucuna göre Alpha (başlangıç) veya Beta (ileri) sınıfına yerleşeceksin. Sınavı yarıda bırakırsan kaldığın yerden devam edebilirsin, ama süre işlemeye devam eder.</p>
        {startError && <Alert type="error" showIcon message={startError} />}
        <Button type="primary" size="large" loading={starting} onClick={start}>Sınava başla</Button>
      </div>
    </section>
  );
}
