import Footer from "../../layouts/footer/footer";
import CourseCard from "../course-card/course-card";
import Selection from "./select";
import CourseVeriable from "./courseVeriable";

const Courses = () => {
  console.log(CourseVeriable);

  return (
    <div className="courses-page-container">
      <div className="courses-banner">
        <div className="title">
          <h1 style={{ letterSpacing: "4px" }}>courses</h1>
          <h4>Home / courses</h4>
        </div>
      </div>

      <div className="course-all">
        <div className="course-all-cards">
          {CourseVeriable.map((data, i) => {
            return (
              <CourseCard
                key={i}
                index={data.index}
                className={data.className}
                image={data.image}
                description={data.description}
                tag1={data.tag1}
                tag2={data.tag2}
                hours={data.hours}
                minute={data.minute}
              />
            );
          })}
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Courses;
