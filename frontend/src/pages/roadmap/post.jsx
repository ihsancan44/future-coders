import { CalendarCheck, BookMarked, ArrowRight } from "lucide-react";

const Post = ({ image, tag1, time, tag2, postTitle, postSubtitle }) => {
  return (
    <div className="post-container">
      <img id="post-upper-image" src={image} alt="" />
      <div className="post-info">
        <div className="post-tags">
          <div className="tag">
            <img
              src="https://secure.gravatar.com/avatar/a6ece554da6d5395d6720406403e3951?s=32&d=mm&r=g"
              alt=""
            />
            <span>{tag1}</span>
          </div>
          <div className="tag">
            <CalendarCheck style={{ width: "12px" }} />
            <span>{time}</span>
          </div>
          <div className="tag">
            <BookMarked style={{ width: "12px" }} />
            <span>{tag2}</span>
          </div>
        </div>
        <div className="post-title">
          <h3>{postTitle}</h3>
          <span> {postSubtitle}</span>
          <button>
            Read More <ArrowRight style={{ width: "16px" }} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Post;
