import CourseCard from "../course-card/course-card";
import { ChevronsRight } from "lucide-react";
import { Link } from "react-router-dom";

const PopularCourses = () => {
  return (
    <div className="popular-courses-center">
      <div className="popular-courses-title">
        <h2>Most Popular Courses</h2>
        <img
          src="https://reactheme.com/products/wordpress/echooling/wp-content/uploads/2022/01/line.png"
          alt=""
        />
      </div>
      <div className="popular-course-cards">
        <CourseCard
          className={"popular"}
          image={
            "https://reactheme.com/products/wordpress/echooling/wp-content/uploads/2022/01/image-1.jpg"
          }
          info={"Strategy law and Organization foundation"}
          tag1={"Artificial"}
          tag2={"5 Lessons"}
          hours={5}
          minute={32}
        />
        <CourseCard
          className={"popular"}
          image={
            "https://reactheme.com/products/wordpress/echooling/wp-content/uploads/2022/01/course-1.jpg"
          }
          info={"Strategy law and Organization foundation"}
          tag1={"Artificial"}
          tag2={"5 Lessons"}
          hours={5}
          minute={32}
        />
        <CourseCard
          className={"popular"}
          image={
            "https://reactheme.com/products/wordpress/echooling/wp-content/uploads/2022/01/image-2.png"
          }
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
export default PopularCourses;
