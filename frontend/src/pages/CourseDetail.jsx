import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Alert, Button, Empty, Input, Popconfirm, Progress, Select, Tabs, Tag } from "antd";
import { message } from "../utils/feedback";
import { Bot, CheckCircle2, Circle, Clock3, Lock, MessageCircle, Trash2 } from "lucide-react";
import { api, apiError } from "../api/client";
import Cover from "../components/Cover";
import InfoPanel from "../components/learn/InfoPanel";
import ReelPlayer from "../components/learn/ReelPlayer";
import AssistantPanel from "../components/learn/AssistantPanel";
import logo from "../assets/logo.svg";
import { ErrorState, Loading } from "../components/Status";
import { useApi } from "../hooks/useApi";
import { useAuth } from "../context/AuthContext";
import { LEVEL_COLOR, LEVEL_LABEL, formatDate, formatDuration, paragraphs } from "../utils/format";

const CodeRunner = lazy(() => import("../components/code/CodeRunner"));

function LockedNotice({ access }) {
  const actions = {
    LOGIN_REQUIRED: (
      <>
        <Link to="/login" className="btn btn--primary btn--sm">Giriş yap</Link>
        <Link to="/register" className="btn btn--ghost btn--sm">Kayıt ol</Link>
      </>
    ),
    PLACEMENT_REQUIRED: <Link to="/placement" className="btn btn--primary btn--sm">Seviye sınavına başla</Link>,
  };
  return (
    <div className="locked">
      <Lock />
      <p>{access.message}</p>
      <div className="locked__actions">{actions[access.reason]}</div>
    </div>
  );
}
LockedNotice.propTypes = { access: PropTypes.object.isRequired };

function Comments({ courseId, canComment, onCountChange }) {
  const { user, isAdmin } = useAuth();
  const { data, loading, error, reload, setData } = useApi(`/courses/${courseId}/comments`);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const send = async () => {
    setSending(true);
    try {
      const res = await api.post(`/courses/${courseId}/comments`, { content: text });
      setData((d) => ({ comments: [res.data.comment, ...(d?.comments || [])] }));
      onCountChange(1);
      setText("");
    } catch (err) {
      message.error(apiError(err).message);
    } finally {
      setSending(false);
    }
  };

  const remove = async (id) => {
    try {
      await api.delete(`/courses/${courseId}/comments/${id}`);
      setData((d) => ({ comments: d.comments.filter((c) => c.id !== id) }));
      onCountChange(-1);
    } catch (err) {
      message.error(apiError(err).message);
    }
  };

  if (loading) return <Loading />;
  if (error) return <ErrorState message={error.message} onRetry={reload} />;
  return (
    <div className="comments">
      {canComment ? (
        <div className="comments__form">
          <label htmlFor="comment-text" className="sr-only">Yorumunuz</label>
          <Input.TextArea
            id="comment-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Bu kurs hakkında ne düşünüyorsun?"
            autoSize={{ minRows: 2, maxRows: 6 }}
            maxLength={1000}
            showCount
          />
          <Button type="primary" onClick={send} loading={sending} disabled={text.trim().length < 2}>Yorum yap</Button>
        </div>
      ) : (
        <p className="muted">Yorum yapmak için bu kursa erişiminiz olmalı.</p>
      )}
      {data?.comments?.length ? (
        <ul className="comments__list">
          {data.comments.map((c) => (
            <li key={c.id}>
              <div className="comments__head">
                <span className="avatar avatar--sm">{c.author.name[0]}</span>
                <strong>{c.author.name}</strong>
                {c.author.role === "ADMIN" && <Tag color="gold">Eğitmen</Tag>}
                <span className="muted">{formatDate(c.createdAt)}</span>
                {(c.author.id === user?.id || isAdmin) && (
                  <Popconfirm title="Yorum silinsin mi?" okText="Sil" cancelText="Vazgeç" onConfirm={() => remove(c.id)}>
                    <button className="icon-btn" aria-label="Yorumu sil"><Trash2 size={15} /></button>
                  </Popconfirm>
                )}
              </div>
              <p>{c.content}</p>
            </li>
          ))}
        </ul>
      ) : (
        <Empty description="Henüz yorum yok. İlk yorumu sen yap." />
      )}
    </div>
  );
}
Comments.propTypes = { courseId: PropTypes.number.isRequired, canComment: PropTypes.bool, onCountChange: PropTypes.func.isRequired };

function FinalExamBox({ course }) {
  const navigate = useNavigate();
  const exam = course.finalExam;
  if (!exam) return null;
  const finished = course.progress?.finished;
  const best = exam.attempts.reduce((m, a) => Math.max(m, a.score), -1);
  return (
    <div className="final-box">
      <h3>Kurs sonu testi</h3>
      <p className="muted">
        {exam.questionCount} soru{exam.durationMinutes ? `, ${exam.durationMinutes} dakika` : ""}. Geçme notu %{exam.passingScore}.
      </p>
      {exam.passed ? (
        <>
          <Alert type="success" showIcon message={`Tebrikler, bu kursu geçtin. Puanın: %${best}`} />
          <Link to="/career" className="btn btn--primary btn--sm">Alanını seç, yol haritanı gör</Link>
        </>
      ) : (
        <>
          {best >= 0 && <Alert type="warning" showIcon message={`Son denemelerde en yüksek puanın %${best}. Kurs baştan başladı.`} />}
          <Button type="primary" block disabled={!finished} onClick={() => navigate(`/courses/${course.id}/final`)}>
            {exam.attempts.length ? "Teste tekrar gir" : "Kurs sonu testine başla"}
          </Button>
          <p className="muted small">
            {finished ? "" : "Test, kursun tüm adımlarını tamamladığında açılır. "}
            Testte kalırsan kurs ilerlemen sıfırlanır ve kursa baştan başlarsın.
          </p>
        </>
      )}
    </div>
  );
}
FinalExamBox.propTypes = { course: PropTypes.object.isRequired };

/** Konunun videoları: önce dersin kendi videosu, sonra eklenen kısa videolar. */
function reelItems(lesson) {
  if (!lesson) return [];
  const own = lesson.videoUrl
    ? [{ key: `lesson-${lesson.id}`, kind: "lesson", title: lesson.title, videoUrl: lesson.videoUrl, language: lesson.language, starterCode: lesson.codeExample }]
    : [];
  return [...own, ...(lesson.reels || []).map((r) => ({ ...r, key: `reel-${r.id}`, kind: "reel", language: r.language || lesson.language }))];
}

function LockedView({ course }) {
  return (
    <div className="course-page">
      <div className="course-page__main">
        <CourseTitle course={course} />
        <div className="player">
          <Cover image={course.coverImage} title={course.title} label={course.category} className="player__cover" />
          <LockedNotice access={course.access} />
        </div>
        <div className="prose">
          {paragraphs(course.description).map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      </div>
      <aside className="course-page__side">
        <h3>Kurs adımları</h3>
        <LessonList lessons={course.lessons} canAccess={false} />
      </aside>
    </div>
  );
}
LockedView.propTypes = { course: PropTypes.object.isRequired };

function CourseTitle({ course }) {
  return (
    <div className="course-page__title">
      <h1>{course.title}</h1>
      <div className="course-page__tags">
        <Tag color={LEVEL_COLOR[course.level]}>{LEVEL_LABEL[course.level]}</Tag>
        <Tag>{course.category}</Tag>
        <span className="muted"><Clock3 size={14} /> {formatDuration(course.totalMinutes)}</span>
        <span className="muted"><MessageCircle size={14} /> {course.commentCount} yorum</span>
      </div>
    </div>
  );
}
CourseTitle.propTypes = { course: PropTypes.object.isRequired };

function LessonList({ lessons, currentId, canAccess, onSelect }) {
  return (
    <ol className="lesson-list">
      {lessons.map((l, i) => (
        <li key={l.id}>
          <button
            className={`lesson-list__item ${l.id === currentId && canAccess ? "is-active" : ""}`}
            onClick={() => canAccess && onSelect(l.id)}
            disabled={!canAccess}
          >
            {canAccess ? (l.completed ? <CheckCircle2 className="ok" size={18} /> : <Circle size={18} />) : <Lock size={16} />}
            <span className="lesson-list__title">{i + 1}. {l.title}</span>
            <span className="muted small">{formatDuration(l.durationMinutes)}</span>
          </button>
        </li>
      ))}
    </ol>
  );
}
LessonList.propTypes = { lessons: PropTypes.array.isRequired, currentId: PropTypes.number, canAccess: PropTypes.bool, onSelect: PropTypes.func };

export default function CourseDetail() {
  const id = Number(useParams().id);
  const { data, error, loading, reload, setData } = useApi(`/courses/${id}`);

  if (loading) return <Loading />;
  if (error) return <ErrorState message={error.message} onRetry={error.status === 404 ? undefined : reload} />;
  if (!data.course.access.canAccess) return <LockedView course={data.course} />;
  return <LearnView course={data.course} setData={setData} />;
}

/**
 * Öğrenme ekranı: ortada konunun kısa videoları (reels). Soldaki yuvarlak Codevia logosu "kısa bilgi + pratik"
 * panelini, sağdaki asistan düğmesi Codevia Asistan'ı açar. Videonun yanındaki düğme o dilin derleyicisini açar.
 */
function LearnView({ course, setData }) {
  const id = course.id;
  const [params, setParams] = useSearchParams();
  const [saving, setSaving] = useState(false);
  const [leftOpen, setLeftOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [compiler, setCompiler] = useState(null);
  const [seed, setSeed] = useState(null);
  const [reelIndex, setReelIndex] = useState(0);

  const lessons = course.lessons;
  const currentId = Number(params.get("lesson")) || lessons.find((l) => !l.completed)?.id || lessons[0]?.id;
  const index = Math.max(0, lessons.findIndex((l) => l.id === currentId));
  const lesson = lessons[index];
  const items = useMemo(() => reelItems(lesson), [lesson]);

  useEffect(() => {
    setReelIndex(0);
  }, [lesson?.id]);

  const selectLesson = (lessonId) => setParams({ lesson: String(lessonId) }, { replace: false });

  const toggleComplete = async () => {
    setSaving(true);
    try {
      const url = `/courses/${id}/lessons/${lesson.id}/complete`;
      const res = lesson.completed ? await api.delete(url) : await api.post(url);
      setData((d) => ({
        course: {
          ...d.course,
          progress: res.data.progress,
          lessons: d.course.lessons.map((l) => (l.id === lesson.id ? { ...l, completed: !lesson.completed } : l)),
        },
      }));
      if (!lesson.completed && lessons[index + 1]) selectLesson(lessons[index + 1].id);
    } catch (err) {
      message.error(apiError(err).message);
    } finally {
      setSaving(false);
    }
  };

  const openCompiler = (code, language) => {
    setCompiler({ code, language: language || lesson.language || "python", n: Date.now() });
    // Ekran derleyiciyle iki paneli yan yana sığdıramıyorsa paneller kapanır (istenirse üstte tekrar açılır).
    if (!window.matchMedia?.("(min-width: 1821px)").matches) {
      setLeftOpen(false);
      setChatOpen(false);
    }
  };
  const ask = (item) => {
    setChatOpen(true);
    setSeed({ text: `"${item.title}" videosunda anlamadığım yer: `, n: Date.now() });
  };

  const percent = course.progress?.percent ?? 0;
  const next = lessons[index + 1];

  const endCard = (
    <div className="reel__end">
      <CheckCircle2 size={42} />
      <h3>{lesson.title} konusunun sonuna geldin</h3>
      <p>Kısa bilgileri ve pratiği soldaki Codevia logosundan açabilirsin.</p>
      {course.progress && (
        <Button type="primary" loading={saving} onClick={toggleComplete} disabled={lesson.completed && !next}>
          {lesson.completed ? (next ? "Sonraki konuya geç" : "Konu tamamlandı ✓") : next ? "Tamamladım, sonraki konu" : "Tamamladım"}
        </Button>
      )}
      <Button onClick={() => setLeftOpen(true)}>Pratik yap</Button>
    </div>
  );

  const stageClass = ["learn__stage", leftOpen && "has-left", chatOpen && "has-chat", compiler && "has-compiler"].filter(Boolean).join(" ");

  return (
    <div className="learn">
      <div className="learn__top">
        <CourseTitle course={course} />
        <div className="learn__nav">
          <label htmlFor="learn-topic" className="sr-only">Konu seç</label>
          <Select
            id="learn-topic"
            className="learn__topic"
            value={lesson?.id}
            onChange={selectLesson}
            options={lessons.map((l, i) => ({ value: l.id, label: `${l.completed ? "✓ " : ""}Konu ${i + 1}: ${l.title}` }))}
          />
          {course.progress && <Progress className="learn__progress" percent={percent} size="small" strokeColor="var(--brand-solid)" aria-label="Kurs ilerlemesi" />}
        </div>
      </div>

      {lesson ? (
        <div className={stageClass}>
          {leftOpen && (
            <aside className="learn__panel learn__panel--left" aria-label="Kısa bilgi ve pratik">
              <InfoPanel lesson={lesson} index={index} total={lessons.length} onClose={() => setLeftOpen(false)} onTryCode={openCompiler} />
            </aside>
          )}
          <div className="learn__center">
            <button
              type="button"
              className={`learn__orb learn__orb--left ${leftOpen ? "is-on" : ""}`}
              onClick={() => setLeftOpen((v) => !v)}
              aria-pressed={leftOpen}
              aria-label="Kısa bilgi ve pratik panelini aç"
            >
              <img src={logo} alt="" />
              <span>Bilgi &amp; Pratik</span>
            </button>
            {items.length ? (
              <ReelPlayer
                items={items}
                index={reelIndex}
                onIndex={setReelIndex}
                onCompiler={(item) => openCompiler(item.starterCode, item.language)}
                onAsk={ask}
                endCard={endCard}
              />
            ) : (
              <div className="reel">
                <div className="reel__frame">
                  <div className="reel__empty">
                    <Cover image={course.coverImage} title={lesson.title} label="Bu konunun videosu henüz yok" className="reel__cover" />
                  </div>
                </div>
              </div>
            )}
            <button
              type="button"
              className={`learn__orb learn__orb--right ${chatOpen ? "is-on" : ""}`}
              onClick={() => setChatOpen((v) => !v)}
              aria-pressed={chatOpen}
              aria-label="Codevia Asistan'ı aç"
            >
              <span className="learn__orb-bot"><Bot size={26} /></span>
              <span>Asistan</span>
            </button>
          </div>
          {compiler && (
            <aside className="learn__compiler" aria-label="Derleyici">
              <Suspense fallback={<Loading />}>
                <CodeRunner
                  key={compiler.n}
                  compact
                  initialLanguage={compiler.language}
                  initialCode={compiler.code || undefined}
                  onClose={() => setCompiler(null)}
                />
              </Suspense>
            </aside>
          )}
          {chatOpen && (
            <aside className="learn__panel learn__panel--right" aria-label="Codevia Asistan">
              <AssistantPanel lesson={lesson} seed={seed} onClose={() => setChatOpen(false)} />
            </aside>
          )}
        </div>
      ) : (
        <Empty description="Bu kursta henüz konu yok." />
      )}

      {lesson && (
        <div className="course-page learn__below">
          <div className="course-page__main">
            <div className="lesson-bar">
              <div>
                <span className="muted small">Adım {index + 1} / {lessons.length}</span>
                <h2>{lesson.title}</h2>
              </div>
              <div className="lesson-bar__actions">
                <Button disabled={index <= 0} onClick={() => selectLesson(lessons[index - 1].id)}>Önceki</Button>
                {course.progress && (
                  <Button type={lesson.completed ? "default" : "primary"} loading={saving} onClick={toggleComplete}>
                    {lesson.completed ? "Tamamlandı ✓" : "Tamamladım"}
                  </Button>
                )}
                <Button disabled={!next} onClick={() => selectLesson(next.id)}>Sonraki</Button>
              </div>
            </div>
            <Tabs
              items={[
                {
                  key: "lesson",
                  label: "Konu anlatımı",
                  children: <div className="prose">{paragraphs(lesson.content).map((p, i) => <p key={i}>{p}</p>)}</div>,
                },
                { key: "about", label: "Kurs açıklaması", children: <div className="prose">{paragraphs(course.description).map((p, i) => <p key={i}>{p}</p>)}</div> },
                {
                  key: "comments",
                  label: `Yorumlar (${course.commentCount})`,
                  children: (
                    <Comments
                      courseId={id}
                      canComment
                      onCountChange={(n) => setData((d) => ({ course: { ...d.course, commentCount: d.course.commentCount + n } }))}
                    />
                  ),
                },
              ]}
            />
          </div>
          <aside className="course-page__side">
            {course.progress && (
              <div className="progress-box">
                <span>İlerlemen: kursun %{percent} kadarını tamamladın</span>
                <Progress percent={percent} strokeColor="var(--brand-solid)" aria-label="Kurs ilerlemesi" />
                <span className="muted small">{course.progress.completed} / {course.progress.total} adım tamamlandı</span>
              </div>
            )}
            <h3>Kurs adımları</h3>
            <LessonList lessons={lessons} currentId={lesson.id} canAccess onSelect={selectLesson} />
            <FinalExamBox course={course} />
          </aside>
        </div>
      )}
    </div>
  );
}
LearnView.propTypes = { course: PropTypes.object.isRequired, setData: PropTypes.func.isRequired };
