import { Alert, Button, Col, Modal, Row, Table } from "react-bootstrap";
import { datasourceKeyType, querySetType } from "../api/types";
import { getQueriesStats, getResultStats } from "../api/utility";
import useTableController from "../hooks/useTableController";
import TableButtons from "./TableButtons";
import { IoCloseSharp } from "react-icons/io5";
import { BsFillInfoCircleFill } from "react-icons/bs";
import { useContext } from "react";
import AppContext from "../contexts/AppContext";
import { useRef } from "react";
import { useDownloadExcel } from "react-export-table-to-excel";

interface projectReportModalProps {
  show: boolean;
  queries: querySetType;
  handleClose: () => void;
}

const ProjectReportModal = ({
  show,
  handleClose,
  queries,
}: projectReportModalProps) => {
  const tableRef = useRef(null);

  const { onDownload } = useDownloadExcel({
    currentTableRef: tableRef.current,
    filename: "QueryReport - SysReview",
    sheet: "QueryReport - SysReview",
  });

  const { datasources } = useContext(AppContext);
  const datasourceKeys = Object.keys(datasources);

  const queryStats = getQueriesStats(
    queries,
    datasourceKeys as datasourceKeyType[]
  ); //TODO: User the same function for results stats too since same funbction is nested
  const { l, u, prev, next, updateInterval } = useTableController(
    Object.values(queries).length,
    10
  );

  const handleDownload = () => {
    // onDownload only makes excel of visible table hence need to update the interval temporarily
    updateInterval(Object.keys(queries).length);
    setTimeout(() => {
      onDownload();
      updateInterval(10);
    }, 1000);
  };
  return (
    <Modal
      show={show}
      onHide={handleClose}
      size="xl"
      centered
      className="c-modal"
    >
      <Modal.Header>
        <Modal.Title>Report</Modal.Title>
        <IoCloseSharp className="cp" size={"1.5rem"} onClick={handleClose} />
      </Modal.Header>
      <Modal.Body>
        {!!Object.keys(queries).length && (
          <TableButtons
            prev={prev}
            next={next}
            range={`${l} - ${u}`}
            total={Object.values(queries).length}
          />
        )}
        <Row>
          <Col>
            {!!Object.keys(queries).length ? (
              <Table striped className="c-table" ref={tableRef}>
                <thead>
                  <tr>
                    <th style={{ width: "5%" }}>#</th>
                    <th>Query Name</th>
                    {datasourceKeys.map((source) => (
                      <th className="source-col-head" key={source}>
                        {source}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.values(queries)
                    .slice(l, u)
                    .map((query, i) => {
                      const { sources } = getResultStats(query.searchResults);
                      if (query.queryId)
                        return (
                          <tr key={i}>
                            <td>{i + 1}</td>
                            <td>{query.query_name}</td>
                            {datasourceKeys.map((source) => (
                              <td className="source-col" key={source}>
                                {sources[source] || 0}
                              </td>
                            ))}
                          </tr>
                        );
                      return <tr key={i}></tr>;
                    })}
                  <tr className="total">
                    <td colSpan={2}>TOTAL</td>
                    {datasourceKeys.map((source) => (
                      <td className="source-col" key={source}>
                        {queryStats.sources[source] || 0}
                      </td>
                    ))}
                  </tr>
                  <tr className="total grand-total">
                    <td colSpan={2}>GRAND TOTAL</td>
                    <td colSpan={datasourceKeys.length}>{queryStats.total}</td>
                  </tr>
                </tbody>
              </Table>
            ) : (
              <Alert className="c-alert-info mt-2">
                <BsFillInfoCircleFill />
                No Queries yet to show report
              </Alert>
            )}
          </Col>
        </Row>
        {!!Object.keys(queries).length && (
          <Row>
            <Col className="text-center">
              <Button
                className="c-btn-primary-o mx-auto"
                onClick={handleDownload}
              >
                Download
              </Button>
            </Col>
          </Row>
        )}
      </Modal.Body>

      <Modal.Footer>
        <Button className="c-btn-negative" onClick={handleClose}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ProjectReportModal;
