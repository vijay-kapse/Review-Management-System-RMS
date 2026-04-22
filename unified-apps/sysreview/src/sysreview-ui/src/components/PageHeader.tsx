import React, { FC } from "react";
import { Container } from "react-bootstrap";

interface PageHeaderProps {
  title: string;
  sideComponent?: React.ReactNode;
}

const PageHeader: FC<PageHeaderProps> = ({ title, sideComponent }) => {
  return (
    <Container className="page-head">
      <div className="d-flex justify-content-between align-items-center my-2">
        <h3>{title}</h3>
        {sideComponent}
      </div>
      <hr />
    </Container>
  );
};

export default PageHeader;
