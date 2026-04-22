import { FC } from "react";
import { Col, Container, Row } from "react-bootstrap";

interface SectionHeaderProps {
  className?: string;
  title: string;
}

const SectionHeader: FC<SectionHeaderProps> = ({ className, title }) => {
  return (
    <Container className={`section-header  ${className}`}>
      <Row>
        <Col>
          <h2>{title}</h2>
        </Col>
      </Row>
    </Container>
  );
};

export default SectionHeader;
