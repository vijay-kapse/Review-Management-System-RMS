import { FC } from "react";

interface QueryTitleProps {
  icon: React.ReactNode;
  title: string;
  count: number;
}

const SubHeaderTitle: FC<QueryTitleProps> = ({ icon, title, count }) => {
  const countStyle = {
    backgroundColor: "var(--secondary-color)",
    padding: "2px 5px",
    borderRadius: "5px",
  };

  return (
    <div className="d-flex align-items-center gap-2">
      <span>{icon}</span>
      <h5 className="mb-0">{title}</h5>
      <span style={countStyle}>{count}</span>
    </div>
  );
};

export default SubHeaderTitle;
