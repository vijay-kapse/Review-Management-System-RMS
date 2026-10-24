import { FC, useMemo, useState } from "react";
import { categorySetType, paperDetailsType, resultType } from "../../api/types";
import DataTable, { TableColumn } from "react-data-table-component";
import { FiExternalLink } from "react-icons/fi";
import ResultDetails, { ResultDetailsExtras } from "../ResultsTable/ResultDetails";
import { queryTerm, rankByScore } from "../../utils/matchHighlight";
import { Badge, Dropdown } from "react-bootstrap";
import { MdOutlineManageSearch } from "react-icons/md";
import { CategorySymbol } from "../CategoryLabel";
import { getCategoryColor, getCategoryLabel, getPaperUrl } from "../../api/utility";
import SearchFilter from "./SearchFilter";
import CategoryFilter from "./CategoryFilter";

interface CurationTableProps {
  results: resultType[];
  categories: categorySetType;
  analyse: (rowData: resultType[]) => void;
  updateCategory: (r: number[], p: number, rows?: resultType[]) => void;
  setSelectedRows: (p: resultType[]) => void;
  showProjectColumns?: boolean;
  showDeduplication?: boolean;
  // Cached abstracts/keywords by normalized title, and the research question's content words.
  details?: Map<string, paperDetailsType>;
  terms?: queryTerm[];
  // Rows the suggested rank is computed over (the whole project even when a source filter
  // narrows what is shown); defaults to the rows shown.
  rankAmong?: resultType[];
}

const CurationTable: FC<CurationTableProps> = ({
  results,
  categories,
  analyse,
  updateCategory,
  setSelectedRows,
  showProjectColumns = false,
  showDeduplication = false,
  details,
  terms,
  rankAmong,
}) => {
  // Order is relative to every scored paper in the project, not just the rows on screen.
  const ranking = useMemo(
    () => rankByScore((rankAmong ?? results).map((row) => row.relevanceScore)),
    [rankAmong, results]
  );
  const rankFor = (row: resultType) =>
    typeof row.relevanceScore === "number"
      ? { rank: ranking.rankOf(row.relevanceScore), total: ranking.total }
      : null;
  const detailsProps: ResultDetailsExtras = { details, terms, rank: rankFor };
  const categoriesByPriority = Object.values(categories).filter(
    (category, index, allCategories) =>
      allCategories.findIndex((cat) => cat.priority === category.priority) ===
      index
  );

  const columns: TableColumn<resultType>[] = [];

  columns.push({
      id: "title",
      name: "Title",
      sortable: true,
      selector: (row) => row.document.title,
      cell: (row) => {
        const paperUrl = getPaperUrl(row);
        return (
          <div className="py-2">
            {row.document.title}{" "}
            {!!paperUrl && (
              <a
                className="paper-link"
                href={paperUrl}
                target="_blank"
                rel="noreferrer"
              >
                <FiExternalLink />
              </a>
            )}
          </div>
        );
      },
  });

  if (showProjectColumns) {
    columns.push({
      id: "query",
      name: "Queries",
      sortable: true,
      selector: (row) =>
        (row as any).duplicateQuerySummary || (row as any).queryName || "",
      cell: (res) => (
        <div
          className="py-2 small"
          title={(res as any).duplicateQuerySummary || (res as any).queryName}
        >
          {(res as any).duplicateQuerySummary || (res as any).queryName}
        </div>
      ),
      width: "16%",
    });
  }

  columns.push({
      id: "category",
      name: "Category",
      selector: (row) => row.curationSortPriority ?? row.priority,
      cell: (res) => (
        <Dropdown
          onSelect={(val) =>
            updateCategory([res.resultId], parseInt(val as string), [res])
          }
        >
          <Dropdown.Toggle variant="outline-[#414c7b]">
            <CategorySymbol
              color={
                (res as any).categoryColor ||
                getCategoryColor(categories, res.priority)
              }
            />{" "}
            {(res as any).categoryLabel ||
              getCategoryLabel(categories, res.priority)}
          </Dropdown.Toggle>

          <Dropdown.Menu variant="dark">
            {categoriesByPriority.map((cat, i) => (
              <Dropdown.Item key={i} eventKey={cat.priority}>
                <CategorySymbol color={cat.color} /> {cat.label}
              </Dropdown.Item>
            ))}
          </Dropdown.Menu>
        </Dropdown>
      ),
      width: "15%",
      center: true,
      sortable: true,
    });

  columns.push({
      id: "suggested",
      name: (
        <span title="Suggested review order from a local model's reading of each paper against the project's research question. Rank 1 = look first. An ordering aid only: it never changes the category and is not a verdict on relevance.">
          Suggested order
        </span>
      ),
      // Unscored papers sort below every scored one.
      selector: (row) => row.relevanceScore ?? -1,
      cell: (res) => {
        const position = rankFor(res);
        if (!position) {
          return (
            <span className="text-muted" title="Not scored yet. Set a research question in Project settings; scoring runs in the background.">
              —
            </span>
          );
        }
        const topPercent = Math.max(1, Math.ceil((position.rank / position.total) * 100));
        return (
          <div
            className="rank-cell"
            title={`Rank ${position.rank} of ${position.total} scored papers (top ${topPercent}%). Open the row to see why.`}
          >
            <strong>#{position.rank}</strong>
            <small>of {position.total}</small>
          </div>
        );
      },
      // Fixed px: the label, sort arrow and cell padding need ~135px, and a % width
      // (which overrides minWidth here) clipped "Suggested" on both sides.
      width: "150px",
      center: true,
      sortable: true,
    });

  columns.push({
      name: "Source",
      selector: (row) => (row as any).duplicateSourceSummary || row.datasource,
      cell: (res) => (
        <div title={(res as any).duplicateSourceSummary || res.datasource}>
          {(res as any).duplicateSourceSummary || res.datasource}
        </div>
      ),
      width: showProjectColumns ? "10%" : "8%",
      center: true,
    });

  if (showDeduplication) {
    columns.push({
      id: "duplicates",
      name: "Instances",
      selector: (row) => (row as any).duplicateCount || 1,
      cell: (res) => (
        <Badge bg={(res as any).duplicateCount > 1 ? "warning" : "secondary"}>
          {(res as any).duplicateCount || 1}
        </Badge>
      ),
      // Same as Suggested: a % width clipped "Instances" plus its sort arrow.
      width: "120px",
      center: true,
      sortable: true,
    });
  }

  columns.push({
      name: "",
      cell: (res) => (
        <div className="py-2 fs-3 cp" onClick={() => analyse([res])}>
          <MdOutlineManageSearch className="primary-icon" />
        </div>
      ),
      center: true,
      width: "5%",
    });

  const [filterText, setFilterText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number>(-1); // only using priority attribute of category
  const [resetPaginationToggle, setResetPaginationToggle] = useState(false);
  const data = results.filter(({ document, priority }) => {
    let cond1 = true;
    let cond2 = true;
    if (selectedCategory !== -1) {
      cond1 = priority === selectedCategory;
    }
    if (filterText) {
      cond2 =
        !!document.title &&
        document.title.toLowerCase().includes(filterText.toLowerCase());
    }
    return cond1 && cond2;
  });

  const subHeaderComponentMemo = useMemo(() => {
    const handleClear = () => {
      if (filterText) {
        setResetPaginationToggle(!resetPaginationToggle);
        setFilterText("");
      }
    };

    return (
      <div className="d-flex justify-content-end">
        <CategoryFilter
          categories={categories}
          onFilter={(p) => setSelectedCategory(p)}
          selectedCategory={selectedCategory}
        />
        <SearchFilter
          onFilter={(e) => setFilterText(e.target.value)}
          onClear={handleClear}
          filterText={filterText}
        />
      </div>
    );
  }, [filterText, resetPaginationToggle, selectedCategory, categories]);

  return (
    <DataTable
      columns={columns}
      data={data}
      pagination
      paginationRowsPerPageOptions={[10, 25, 50, 100, 200]}
      subHeader
      expandableRows
      expandableRowsComponent={ResultDetails}
      expandableRowsComponentProps={detailsProps}
      paginationResetDefaultPage={resetPaginationToggle}
      subHeaderComponent={subHeaderComponentMemo}
      fixedHeader
      selectableRows
      defaultSortAsc={false}
      defaultSortFieldId={showDeduplication ? "duplicates" : "category"}
      onSelectedRowsChange={({ selectedRows }) => setSelectedRows(selectedRows)}
      className="c-table"
    />
  );
};

export default CurationTable;
