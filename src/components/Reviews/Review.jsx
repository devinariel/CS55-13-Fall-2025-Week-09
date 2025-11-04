import renderStars from "@/src/components/Stars.jsx";

export function Review({ rating, text, timestamp }) {
  return (
    <li className="review__item">
      <ul className="clinician__rating">{renderStars(rating)}</ul>
      <p className="text-[#68604D] mt-2">{text}</p>
      <time className="text-[#8A8E75]">
        {new Intl.DateTimeFormat("en-GB", {
          dateStyle: "medium",
        }).format(timestamp)}
      </time>
    </li>
  );
}

export function ReviewSkeleton() {
  return (
    <li className="review__item">
  <div className="clinician__rating">
        <div
          style={{
            height: "2rem",
            backgroundColor: "rgb(156 163 175)",
            width: "10rem",
          }}
        ></div>
      </div>
      <div
        style={{
          height: "19px",
          backgroundColor: "rgb(156 163 175)",
          width: "12rem",
        }}
      ></div>
      <p>{"   "}</p>
    </li>
  );
}
