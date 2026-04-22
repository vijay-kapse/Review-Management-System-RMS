import React, { FC } from "react";

interface PageSubHeaderProps {
  subTitle: React.ReactNode;
  sideComponent?: React.ReactNode;
}

const PageSubHeader: FC<PageSubHeaderProps> = ({ subTitle, sideComponent }) => {
  return (
    <div className="page-sub-head">
      <div className="d-flex justify-content-between align-items-center my-2 px-3 py-3">
        <h5>{subTitle}</h5>
        {sideComponent}
      </div>
    </div>
  );
};

export default PageSubHeader;
