import { useState } from "react";
import PropTypes from "prop-types";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Alert, Button, Empty, Input, Popconfirm, Progress, Tabs, Tag } from "antd";
import { message } from "../utils/feedback";
import { CheckCircle2, Circle, Clock3, Lock, MessageCircle, Trash2 } from "lucide-react";
import { api, apiError } from "../api/client";
import Cover from "../components/Cover";
import { ErrorState, Loading } from "../components/Status";
import { useApi } from "../hooks/useApi";
import { useAuth } from "../context/AuthContext";
import { LEVEL_COLOR, LEVEL_LABEL, embedUrl, formatDate, formatDuration, paragraphs } from "../utils/format";

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
  const { data, loading, setData } = useApi(`/courses/${courseId}/comments`);
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
      <h3>Final sınavı</h3>
      <p className="muted">
        {exam.questionCount} soru{exam.durationMinutes ? `, ${exam.durationMinutes} dakika` : ""}. Geçme notu %{exam.passingScore}.
      </p>
      {exam.passed && <Alert type="success" showIcon message={`Tebrikler, bu kursu geçtin. En yüksek puanın: %${best}`} />}
      {!exam.passed && best >= 0 && <Alert type="warning" showIcon message={`En yüksek puanın %${best}. Tekrar deneyebilirsin.`} />}
      <Button type="primary" block disabled={!finished} onClick={() => navigate(`/courses/${course.id}/final`)}>
        {exam.attempts.length ? "Sınava tekrar gir" : "Final sınavına başla"}
      </Button>
      {!finished && <p className="muted small">Sınav, kursun tüm adımlarını tamamladığında açılır.</p>}
    </div>
  );
}
FinalExamBox.propTypes = { course: PropTypes.object.isRequired };

export default function CourseDetail() {
  const id = Number(useParams().id);
  const [params, setParams] = useSearchParams();
  const { data, error, loading, reload, setData } = useApi(`/courses/${id}`);
  const [saving, setSaving] = useState(false);

  if (loading) return <Loading />;
  if (error) return <ErrorState message={error.message} onRetry={error.status === 404 ? undefined : reload} />;

  const course = data.course;
  const { canAccess } = course.access;
  const lessons = course.lessons;
  const currentId = Number(params.get("lesson")) || lessons.find((l) => !l.completed)?.id || lessons[0]?.id;
  const index = lessons.findIndex((l) => l.id === currentId);
  const lesson = lessons[index];
  const video = canAccess ? embedUrl(lesson?.videoUrl) : null;

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

  const percent = course.progress ? Math.round((course.progress.completed / Math.max(course.progress.total, 1)) * 100) : 0;

  return (
    <div className="course-page">
      <div className="course-page__main">
        <div className="course-page__title">
          <h1>{course.title}</h1>
          <div className="course-page__tags">
            <Tag color={LEVEL_COLOR[course.level]}>{LEVEL_LABEL[course.level]}</Tag>
            <Tag>{course.category}</Tag>
            <span className="muted"><Clock3 size={14} /> {formatDuration(course.totalMinutes)}</span>
            <span className="muted"><MessageCircle size={14} /> {course.commentCount} yorum</span>
          </div>
        </div>

        <div className="player">
          {!canAccess ? (
            <>
              <Cover image={course.coverImage} title={course.title} label={course.category} className="player__cover" />
              <LockedNotice access={course.access} />
            </>
          ) : video ? (
            <iframe
              src={video}
              title={lesson.title}
              allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          ) : (
            <Cover image={course.coverImage} title={course.title} label="Bu adımın videosu yok" className="player__cover" />
          )}
        </div>

        {canAccess && lesson && (
          <div className="lesson-bar">
            <div>
              <span className="muted small">Adım {index + 1} / {lessons.length}</span>
              <h2>{lesson.title}</h2>
            </div>
            <div className="lesson-bar__actions">
              <Button disabled={index <= 0} onClick={() => selectLesson(lessons[index - 1].id)}>Önceki</Button>
              <Button type={lesson.completed ? "default" : "primary"} loading={saving} onClick={toggleComplete}>
                {lesson.completed ? "Tamamlandı ✓" : "Tamamladım"}
              </Button>
              <Button disabled={index >= lessons.length - 1} onClick={() => selectLesson(lessons[index + 1].id)}>Sonraki</Button>
            </div>
          </div>
        )}

        <Tabs
          items={[
            {
              key: "lesson",
              label: canAccess ? "Bu adım" : "Kurs hakkında",
              children: (
                <div className="prose">
                  {(canAccess && lesson?.content ? paragraphs(lesson.content) : paragraphs(course.description)).map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>
              ),
            },
            ...(canAccess
              ? [{ key: "about", label: "Kurs açıklaması", children: <div className="prose">{paragraphs(course.description).map((p, i) => <p key={i}>{p}</p>)}</div> }]
              : []),
            { key: "comments", label: `Yorumlar (${course.commentCount})`, children: <Comments courseId={id} canComment={canAccess} onCountChange={(n) => setData((d) => ({ course: { ...d.course, commentCount: d.course.commentCount + n } }))} /> },
          ]}
        />
      </div>

      <aside className="course-page__side">
        {course.progress && (
          <div className="progress-box">
            <span>İlerlemen</span>
            <Progress percent={percent} strokeColor="#053471" />
            <span className="muted small">{course.progress.completed} / {course.progress.total} adım tamamlandı</span>
          </div>
        )}
        <h3>Kurs adımları</h3>
        <ol className="lesson-list">
          {lessons.map((l, i) => (
            <li key={l.id}>
              <button
                className={`lesson-list__item ${l.id === currentId && canAccess ? "is-active" : ""}`}
                onClick={() => canAccess && selectLesson(l.id)}
                disabled={!canAccess}
              >
                {canAccess ? (l.completed ? <CheckCircle2 className="ok" size={18} /> : <Circle size={18} />) : <Lock size={16} />}
                <span className="lesson-list__title">{i + 1}. {l.title}</span>
                <span className="muted small">{formatDuration(l.durationMinutes)}</span>
              </button>
            </li>
          ))}
        </ol>
        {canAccess && <FinalExamBox course={course} />}
      </aside>
    </div>
  );
}
