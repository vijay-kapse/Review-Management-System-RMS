import React, { FC } from "react";

interface SectionTitleProps {
  title: string;
}

const SectionTitle: FC<SectionTitleProps> = ({ title }) => {
  return (
    <div className="section-title">
      <h3>{title}</h3>
    </div>
  );
};

export default SectionTitle;
