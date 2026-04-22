import { FC } from "react";
import { ExpanderComponentProps } from "react-data-table-component";
import { resultType } from "../../api/types";
import { Container } from "react-bootstrap";

const ResultDetails: FC<ExpanderComponentProps<resultType>> = ({ data }) => {
  const { document } = data;
  const SingleData = ({ key, value }) => (
    <div className="d-flex gap-2 align-items-center" key={key}>
      <h6>{key}</h6>
      {value}
    </div>
  );
  return (
    <>
      <Container className="result-details">
        {["affiliationCountry", "affiliationNames", "authorNames"].map(
          (key) => {
            if (data[key] && data[key][0])
              return SingleData({ key, value: data[key].join(" | ") });
            return <></>;
          }
        )}
        {SingleData({
          key: "Publication Name",
          value: document.publicationName,
        })}
        {SingleData({ key: "ISSN", value: document.issn })}
        {SingleData({ key: "Article Date", value: document.articleDate })}
      </Container>
    </>
  );
};

export default ResultDetails;
