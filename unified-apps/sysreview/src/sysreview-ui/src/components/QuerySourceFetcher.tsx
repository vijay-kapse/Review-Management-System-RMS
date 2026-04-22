import { useContext, useState } from "react";
import { Button, Card } from "react-bootstrap";
import {
  datasourceKeyType,
  resultData,
  resultDocumentType,
  resultType,
} from "../api/types";
import ResultsTableModal from "./ResultsTableModal";
import QueryContext from "../contexts/QueryContext";
import ManualUploadModal from "./ManualUploadModal";
import {
  convertToDocType,
  csvToJson,
  processSearchResponse,
} from "../api/utility";
import ProjectContext from "../contexts/ProjectContext";
import { RiDownload2Fill } from "react-icons/ri";
import { MdCancel } from "react-icons/md";

interface QuerySourceFetcherProps {
  qId: string;
  datasource: datasourceKeyType;
  res: resultData;
  freeze: boolean;
  submitResults: (
    count: number,
    data: resultType[],
    datasource: datasourceKeyType
  ) => void;
  fetchResults: (datasource: datasourceKeyType) => void;
}

const QuerySourceFetcher = ({
  qId,
  datasource,
  res,
  freeze,
  submitResults,
  fetchResults,
}: QuerySourceFetcherProps) => {
  const { categories } = useContext(ProjectContext);
  const { removeSource } = useContext(QueryContext);
  const [showResults, setShowResults] = useState(false);
  const [showManualUploadModal, setShowManualUploadModal] = useState(false);

  const handleUpload = (csvContent: string, mapping: Object) => {
    const json = csvToJson(csvContent);
    const data = convertToDocType(json as Object[], mapping);
    if (!data.length) {
      alert("Invalid file!");
      return false;
    }
    const results = processSearchResponse(
      data as resultDocumentType[],
      "MANUAL",
      categories
    );
    submitResults(results.length, results, "MANUAL");
    return true;
  };

  return (
    <>
      <Card className="source-card">
        <Card.Header className="d-flex justify-content-between align-items-center">
          {datasource}
          {!freeze && (
            <MdCancel
              className="cp"
              onClick={() => removeSource(qId, datasource)}
            />
          )}
        </Card.Header>
        <Card.Body>
          {res.documents ? (
            <>
              <h5>Total Results: {res.apiResultsCount}</h5>
              <Button
                className="c-btn-primary-o"
                onClick={() => setShowResults(true)}
              >
                Fetched: {res.documents.length}
              </Button>
            </>
          ) : datasource === "MANUAL" ? (
            <Button
              className="c-btn-primary-o"
              onClick={() => setShowManualUploadModal(true)}
              disabled={freeze}
            >
              UPLOAD
            </Button>
          ) : (
            <Button
              className="c-btn-text fetch-button"
              onClick={() => fetchResults(datasource)}
            >
              <RiDownload2Fill size={"1.5rem"} />
              <br />
              Fetch Papers
            </Button>
          )}
        </Card.Body>
      </Card>
      {!!res.documents && (
        <ResultsTableModal
          show={showResults}
          res={res.documents}
          handleClose={() => setShowResults(false)}
        />
      )}
      <ManualUploadModal
        show={showManualUploadModal}
        handleClose={() => setShowManualUploadModal(false)}
        handleFileContent={handleUpload}
      />
    </>
  );
};

export default QuerySourceFetcher;
