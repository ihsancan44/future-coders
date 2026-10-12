import "../../App.css";
import Footer from "../../layouts/footer/footer";
import BigImage from "../../img/105874696-1556279627825gettyimages-947895256.jpeg";
import PopularCourses from "./popularCourses";
import WhoAreWe from "./who-are-we";
import { Link } from "react-router-dom";
import NewCourses from "./newCourses";

function mainPage() {
  return (
    <>
      <div className="main-page">
        <div className="bg-image-div">
          <img src={BigImage} alt="bg-image" />
          <div id="overlay" className="overlay">
            <div className="info-title">
              <div className="red-text">
                <h4>Yazılımın Eğlenceli Hali</h4>
              </div>
              <h1>Üniversiteye Geçmeden </h1>
              <h1>Rakiplerinin Önüne Geç</h1>
              <Link to={"/courses"}>
                <button>Kurslar</button>
              </Link>
            </div>
          </div>
        </div>
        <div className="new-courses" id="new-courses">
          <NewCourses />
        </div>
        <div className="popular-courses" id="popular-courses">
          <PopularCourses />
        </div>
        <div className="who-are-we">
          <div className="who-are-we-centered">
            <h1>Hakkımızda </h1>
            <img
              src={
                "https://reactheme.com/products/wordpress/echooling/wp-content/uploads/2022/01/line.png"
              }
              alt=""
            />
            <div className="who-are-we-quesitons">
              <WhoAreWe />
            </div>
          </div>
        </div>
        <Footer />
      </div>
    </>
  );
}

export default mainPage;
