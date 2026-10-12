import Footer from "../../layouts/footer/footer";
import Post from "./post";

const Roadmap = () => {
  return (
    <div className="roadmap-page-container">
      <div className="roadmap-banner">
        <div className="title">
          <h1 style={{ letterSpacing: "4px" }}>Road Map</h1>
          <h4>Home / Road Map</h4>
        </div>
      </div>

      <div className="roadmap-all">
        <div className="roadmap-all-posts">
          <Post
            image={
              "https://reactheme.com/products/wordpress/echooling/wp-content/uploads/2022/01/pexels-rodnae-productions-7092610-1-1-1-1024x684.jpg"
            }
            tag1={"React Themes"}
            tag2={"Education"}
            time={"January 18, 2022"}
            postTitle={"Kids future Schools & Corona Prevent to Growth"}
            postSubtitle={
              "Pellentesque in ipsum id orci porta dapibus. Nulla porttitor accumsan tincidunt. Curabitur arcu erat, accumsan id imperdiet et, porttitor at sem. Vestibulum ac diam sit amet quam vehicula elementum..."
            }
          />
          <Post
            image={
              "https://reactheme.com/products/wordpress/echooling/wp-content/uploads/2022/01/pexels-rodnae-productions-7092610-1-1-1-1024x684.jpg"
            }
            tag1={"React Themes"}
            tag2={"Education"}
            time={"January 18, 2022"}
            postTitle={"Kids future Schools & Corona Prevent to Growth"}
            postSubtitle={
              "Pellentesque in ipsum id orci porta dapibus. Nulla porttitor accumsan tincidunt. Curabitur arcu erat, accumsan id imperdiet et, porttitor at sem. Vestibulum ac diam sit amet quam vehicula elementum..."
            }
          />
          <Post
            image={
              "https://reactheme.com/products/wordpress/echooling/wp-content/uploads/2022/01/pexels-rodnae-productions-7092610-1-1-1-1024x684.jpg"
            }
            tag1={"React Themes"}
            tag2={"Education"}
            time={"January 18, 2022"}
            postTitle={"Kids future Schools & Corona Prevent to Growth"}
            postSubtitle={
              "Pellentesque in ipsum id orci porta dapibus. Nulla porttitor accumsan tincidunt. Curabitur arcu erat, accumsan id imperdiet et, porttitor at sem. Vestibulum ac diam sit amet quam vehicula elementum..."
            }
          />
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Roadmap;
