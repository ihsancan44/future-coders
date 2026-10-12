import { Search, Clock4 } from "lucide-react";

const RecentPost = ({ image, title, time }) => {
  return (
    <div className="roadmap-recent-post">
      <img src={image} alt="" />
      <div className="recent-post-info">
        <div className="recent-post-title">
          <p>{title}</p>
        </div>
        <div className="recent-post-time">
          <Clock4 style={{ width: "12px" }} />
          <p>{time}</p>
        </div>
      </div>
    </div>
  );
};

export default RecentPost;
