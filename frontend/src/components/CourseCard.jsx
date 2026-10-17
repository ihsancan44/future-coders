import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { Progress, Tag } from "antd";
import { CheckCircle2, Clock3, Lock, MessageCircle, PlayCircle } from "lucide-react";
import Cover from "./Cover";
import { LEVEL_COLOR, LEVEL_LABEL, formatDuration } from "../utils/format";

export default function CourseCard({ course }) {
  const locked = !course.access?.canAccess;
  return (
    <Link to={`/courses/${course.id}`} className="course-card">
      <div className="course-card__media">
        <Cover image={course.coverImage} title={course.title} label={course.category} />
        {locked && (
          <span className="course-card__lock" title={course.access?.message}>
            <Lock size={14} /> Kilitli
          </span>
        )}
      </div>
      <div className="course-card__body">
        <div className="course-card__tags">
          <span className="course-card__category">{course.category}</span>
          <Tag color={LEVEL_COLOR[course.level]}>{LEVEL_LABEL[course.level]}</Tag>
        </div>
        <h3>{course.title}</h3>
        <p>{course.summary}</p>
        {course.finalPassed ? (
          <span className="course-card__done"><CheckCircle2 size={15} /> Tamamlandı, testi geçtin</span>
        ) : (
          course.progress?.completed > 0 && (
            <div className="course-card__progress">
              <Progress percent={course.progress.percent} size="small" strokeColor="var(--brand-solid)" aria-label="Kurs ilerlemesi" />
              <span className="muted small">%{course.progress.percent} tamamlandı</span>
            </div>
          )
        )}
      </div>
      <div className="course-card__meta">
        <span><PlayCircle size={15} /> {course.lessonCount} ders</span>
        <span><Clock3 size={15} /> {formatDuration(course.totalMinutes)}</span>
        <span><MessageCircle size={15} /> {course.commentCount}</span>
      </div>
    </Link>
  );
}

CourseCard.propTypes = {
  course: PropTypes.shape({
    id: PropTypes.number.isRequired,
    title: PropTypes.string.isRequired,
    summary: PropTypes.string,
    category: PropTypes.string,
    coverImage: PropTypes.string,
    level: PropTypes.string,
    lessonCount: PropTypes.number,
    totalMinutes: PropTypes.number,
    commentCount: PropTypes.number,
    access: PropTypes.shape({ canAccess: PropTypes.bool, message: PropTypes.string }),
    progress: PropTypes.shape({ completed: PropTypes.number, total: PropTypes.number, percent: PropTypes.number }),
    finalPassed: PropTypes.bool,
  }).isRequired,
};
