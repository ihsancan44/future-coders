import CourseCard from "../course-card/course-card";
import { ChevronsRight } from "lucide-react";
import { Link } from "react-router-dom";

const NewCourses = () => {
  return (
    <div className="new-courses-center">
      <div className="new-courses-title">
        <h2>New Courses</h2>
        <img
          src="https://reactheme.com/products/wordpress/echooling/wp-content/uploads/2022/01/line.png"
          alt=""
        />
      </div>
      <div className="new-course-cards">
        <CourseCard
          image={
            "https://reactheme.com/products/wordpress/echooling/wp-content/uploads/2022/01/image-1.jpg"
          }
          className={"new"}
          info={"Strategy law and Organization foundation"}
          tag1={"Artificial"}
          tag2={"5 Lessons"}
          hours={5}
          minute={32}
        />
        <CourseCard
          image={
            "https://reactheme.com/products/wordpress/echooling/wp-content/uploads/2022/01/course-1.jpg"
          }
          className={"new"}
          info={"Strategy law and Organization foundation"}
          tag1={"Artificial"}
          tag2={"5 Lessons"}
          hours={5}
          minute={32}
        />
        <CourseCard
          image={
            "https://reactheme.com/products/wordpress/echooling/wp-content/uploads/2022/01/image-2.png"
          }
          className={"new"}
          info={"Strategy law and Organization foundation"}
          tag1={"Artificial"}
          tag2={"5 Lessons"}
          hours={5}
          minute={32}
        />
      </div>
      <Link to={"/courses"}>
        <button>
          View All Course <ChevronsRight />
        </button>
      </Link>
    </div>
  );
};
export default NewCourses;
