import { useParams } from "react-router-dom";
import Footer from "../../layouts/footer/footer";
import { Tag, Segmented } from "antd";
import Section from "../course-inside/section";
import { MessageCircleMore } from "lucide-react";
import CourseVeriable from "../courses/courseVeriable";
import Steps from "./steps";

const CourseInside = () => {
  const { id } = useParams();
  return (
    <>
      <div className="course-inside">
        <div className="course-inside-container">
          <div className="course-monitor">
            <h2>{CourseVeriable[id].courseName} / 2024 </h2>
            <div className="video-container">
              <iframe
                width="560"
                height="315"
                src="https://www.youtube.com/embed/CgkZ7MvWUAA?si=pg7wW_O1ZdrTq28A"
                title="YouTube video player"
                frameborder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerpolicy="strict-origin-when-cross-origin"
                allowfullscreen
              ></iframe>
            </div>
            <div className="course-informations">
              <div className="course-info">
                <Segmented
                  defaultValue={""}
                  disabled
                  options={[
                    `${CourseVeriable[id].courseName}`,
                    `${CourseVeriable[id].rank}`,
                    `${CourseVeriable[id].hours} Hours ${CourseVeriable[id].minute} Minutes`,
                  ]}
                />
                <div className="comment">
                  <MessageCircleMore />
                  <h4>{CourseVeriable[id].comment} Comments</h4>
                </div>
              </div>
              <div className="course-tags">
                <div className="course-tag">
                  <Tag color="red">
                    <h4>{CourseVeriable[id].tag1}</h4>
                  </Tag>
                  <Tag color="red">
                    <h4>{CourseVeriable[id].tag2}</h4>
                  </Tag>
                </div>
              </div>
            </div>
            <div className="course-inside-sections">
              <Section />
            </div>
          </div>
          <div className="course-content">
            <Steps />
          </div>
        </div>
        <Footer />
      </div>
    </>
  );
};

export default CourseInside;
