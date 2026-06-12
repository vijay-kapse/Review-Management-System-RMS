import { Alert, Button, Modal, Table } from "react-bootstrap";
import { datasourceKeyType, querySetType } from "../api/types";
import { getQueriesStats, getResultStats } from "../api/utility";
import useTableController from "../hooks/useTableController";
import TableButtons from "./TableButtons";
import { IoCloseSharp } from "react-icons/io5";
import { BsFillInfoCircleFill } from "react-icons/bs";
import { useContext, useMemo } from "react";
import AppContext from "../contexts/AppContext";
import { useRef } from "react";
import { useDownloadExcel } from "react-export-table-to-excel";
import { FiBarChart2, FiDatabase, FiDownload, FiList } from "react-icons/fi";

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
  const queryList = useMemo(
    () => Object.values(queries).filter((query) => query.queryId),
    [queries],
  );

  const queryStats = getQueriesStats(
    queries,
    datasourceKeys as datasourceKeyType[],
  ); //TODO: User the same function for results stats too since same funbction is nested
  const { l, u, prev, next, updateInterval } = useTableController(
    queryList.length,
    10,
  );

  const handleDownload = () => {
    // onDownload only makes excel of visible table hence need to update the interval temporarily
    updateInterval(queryList.length);
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
      className="c-modal workspace-modal workspace-report-modal"
    >
      <Modal.Header className="workspace-modal__header">
        <div>
          <div className="workspace-modal__eyebrow">
            <FiBarChart2 />
            Project report
          </div>
          <Modal.Title>Datasource summary</Modal.Title>
          <p>Saved query coverage across active datasources.</p>
        </div>
        <button
          type="button"
          className="workspace-modal__close"
          aria-label="Close report"
          onClick={handleClose}
        >
          <IoCloseSharp />
        </button>
      </Modal.Header>
      <Modal.Body className="workspace-modal__body">
        <div className="workspace-report-summary">
          <div>
            <FiList />
            <span>{queryList.length}</span>
            <small>Queries</small>
          </div>
          <div>
            <FiBarChart2 />
            <span>{queryStats.total}</span>
            <small>Total results</small>
          </div>
          <div>
            <FiDatabase />
            <span>{datasourceKeys.length}</span>
            <small>Datasources</small>
          </div>
        </div>

        {!!queryList.length && (
          <div className="workspace-table-controls">
            <TableButtons
              prev={prev}
              next={next}
              range={`${l + 1} - ${Math.min(u, queryList.length)}`}
              total={queryList.length}
            />
          </div>
        )}

        {!!queryList.length ? (
          <>
            <div className="workspace-report-table-shell">
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
                  {queryList.slice(l, u).map((query, i) => {
                    const { sources } = getResultStats(query.searchResults);
                    return (
                      <tr key={query.queryId}>
                        <td>{l + i + 1}</td>
                        <td>{query.query_name}</td>
                        {datasourceKeys.map((source) => (
                          <td className="source-col" key={source}>
                            {sources[source] || 0}
                          </td>
                        ))}
                      </tr>
                    );
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
            </div>
            <div className="workspace-report-actions">
              <Button
                className="workspace-secondary-action"
                onClick={handleDownload}
              >
                <FiDownload />
                Download
              </Button>
            </div>
          </>
        ) : (
          <Alert className="workspace-empty-state">
            <BsFillInfoCircleFill />
            No queries yet to show report
          </Alert>
        )}
      </Modal.Body>

      <Modal.Footer className="workspace-modal__footer">
        <Button className="workspace-secondary-action" onClick={handleClose}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ProjectReportModal;
