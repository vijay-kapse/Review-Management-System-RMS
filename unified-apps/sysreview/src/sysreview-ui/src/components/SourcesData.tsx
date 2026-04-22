import { FC } from "react";
import { Col, Row } from "react-bootstrap";
import {
  TbSquareLetterI,
  TbSquareLetterM,
  TbSquareLetterP,
  TbSquareLetterS,
  TbSquareLetterW,
} from "react-icons/tb";

interface SourcesDataProps {
  data: {
    [key: string]: number;
  };
}

const datasourceIconMap = {
  PUBMED: <TbSquareLetterP />,
  WOS: <TbSquareLetterW />,
  IEEE: <TbSquareLetterI />,
  MANUAL: <TbSquareLetterM />,
  SCOPUS: <TbSquareLetterS />,
};

const SourcesData: FC<SourcesDataProps> = ({ data }) => {
  return (
    <div className="source-stats">
      {Object.entries(data).map(([db, count]) => (
        <Row className="" key={db}>
          <Col className="source" xs={8}>
            {datasourceIconMap[db]} {db}:
          </Col>
          <Col className="count" xs={4}>
            {count}
          </Col>
        </Row>
      ))}
    </div>
  );
};

export default SourcesData;
