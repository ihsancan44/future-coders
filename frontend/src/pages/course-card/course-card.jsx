import { Link } from "react-router-dom";

const CourseCard = ({
  hours,
  minute,
  description,
  tag1,
  tag2,
  image,
  className,
  index,
}) => {
  return (
    <Link to={`/course-inside/${index}`}>
      <div className={`${className}-course-card`}>
        <img src={image} alt="" />
        <div className="card-title">
          <div className="card-tags">
            <ul>
              <li style={{ color: "#d30e40" }}>{tag1}</li>
              <li>{tag2}</li>
            </ul>
          </div>
          <div className="card-info">
            <span>{description}</span>
          </div>
        </div>
        <div className="card-subtitle">
          <div className="card-subtitle-container">
            <div className="course-time">
              <span>
                {hours} Hours {minute} Minutes
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default CourseCard;
