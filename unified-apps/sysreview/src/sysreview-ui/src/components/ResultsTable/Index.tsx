import { FC, useMemo, useState } from "react";
import DataTable, { TableColumn } from "react-data-table-component";
import { resultType } from "../../api/types";
import { FiExternalLink } from "react-icons/fi";
import { Button, Form, InputGroup } from "react-bootstrap";
import { MdCancel } from "react-icons/md";
import ResultDetails from "./ResultDetails";

const FilterComponent = ({ filterText, onFilter, onClear }) => (
  <div>
    <InputGroup>
      <Form.Control
        id="search"
        type="text"
        placeholder="Search By Title"
        aria-label="Search Input"
        value={filterText}
        onChange={onFilter}
      />
      <Button className="c-btn-primary" onClick={onClear}>
        <MdCancel />
      </Button>
    </InputGroup>
  </div>
);

interface ResultTableProps {
  results: resultType[];
}

const ResultTable: FC<ResultTableProps> = ({ results }) => {
  const columns: TableColumn<resultType>[] = [
    {
      name: "Title",
      selector: (row) => row.document.title,
      cell: ({ document }) => (
        <div className="py-2">
          {document.title}{" "}
          {!!document.url && (
            <a
              className="paper-link"
              href={document.url}
              target="_blank"
              rel="noreferrer"
            >
              <FiExternalLink />
            </a>
          )}
        </div>
      ),
    },
    {
      name: "Article Date",
      selector: (row) => row.document.articleDate,
      width: "15%",
    },
    {
      name: "Source",
      selector: (row) => row.datasource,
      width: "10%",
    },
  ];

  const [filterText, setFilterText] = useState("");
  const [resetPaginationToggle, setResetPaginationToggle] = useState(false);
  const data = results.filter(
    ({ document }) =>
      document.title &&
      document.title.toLowerCase().includes(filterText.toLowerCase())
  );

  const subHeaderComponentMemo = useMemo(() => {
    const handleClear = () => {
      if (filterText) {
        setResetPaginationToggle(!resetPaginationToggle);
        setFilterText("");
      }
    };

    return (
      <FilterComponent
        onFilter={(e) => setFilterText(e.target.value)}
        onClear={handleClear}
        filterText={filterText}
      />
    );
  }, [filterText, resetPaginationToggle]);

  return (
    <DataTable
      columns={columns}
      data={data}
      paginationRowsPerPageOptions={[10, 25, 50, 100, 200]}
      pagination
      subHeader
      expandableRows
      expandableRowsComponent={ResultDetails}
      paginationResetDefaultPage={resetPaginationToggle}
      subHeaderComponent={subHeaderComponentMemo}
      fixedHeader
      className="c-table"
    />
  );
};

export default ResultTable;
