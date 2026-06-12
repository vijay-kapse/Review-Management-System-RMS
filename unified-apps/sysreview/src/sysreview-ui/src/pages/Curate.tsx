import {
  Badge,
  Button,
  ButtonGroup,
  Container,
  Spinner,
} from "react-bootstrap";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import {
  categorySetType,
  datasourceKeyType,
  queryType,
  resultType,
} from "../api/types";
import { getQuery, updateQuery } from "../api/query";
import { getCategories } from "../api/category";
import { mergeResults } from "../api/utility";
import { dummyQuery } from "../api/dummyData";
import { APP_URI_PREFIX } from "../constants";
import { IoMdCheckmarkCircleOutline } from "react-icons/io";
import BulkActionModal from "../components/BulkActionModal";
import Query from "../components/Query";
import CurationTable from "../components/CurationTable/Index";
import { GrAction } from "react-icons/gr";
import { FiDatabase, FiFileText, FiPieChart } from "react-icons/fi";
import { CategorySymbol } from "../components/CategoryLabel";
import { openAnalyser } from "../api/analyser";

const Curate = () => {
  const [query, setQuery] = useState<queryType>(dummyQuery);
  const [results, setResults] = useState<resultType[]>([]);
  const [filteredResults, setFilteredResults] = useState<resultType[]>([]);
  const [selectedResults, setSelectedResults] = useState<resultType[]>([]);
  const [selectedSources, setSelectedSources] = useState<datasourceKeyType[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(false);
  const [showBulkActionModal, setShowBulkActionModal] = useState(false);
  const [categories, setCategories] = useState<categorySetType>({});

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fetchQuery = (id: number) => {
    setIsLoading(true);
    getQuery(id)
      .then((data) => {
        setQuery(data);
        setResults(
          mergeResults(Object.values(data.searchResults)).map((result) => ({
            ...result,
            curationSortPriority: result.priority,
          })),
        );
      })
      .catch((e) => {
        alert("Something went wrong");
        console.log(e);
      })
      .finally(() => setIsLoading(false));
  };

  const fetchCategory = (pId: number) => {
    setIsLoading(true);
    getCategories(pId)
      .then((data) => {
        let categoriesSet = {};
        data.forEach((cat) => {
          categoriesSet[cat.categoryId.toString()] = cat;
        });
        setCategories(categoriesSet);
      })
      .catch((e) => {
        alert("Something went wrong");
        console.log(e);
      })
      .finally(() => setIsLoading(false));
  };

  const updateDocCategory = (resultIds: number[], priority: number) => {
    updateQuery(query.queryId, resultIds, priority)
      .then((_) => {
        const updatedResults = (currentResults: resultType[]) =>
          currentResults.map((result) =>
            resultIds.includes(result.resultId)
              ? { ...result, priority }
              : result,
          );
        setResults(updatedResults);
        setFilteredResults((currentResults) =>
          currentResults.length
            ? updatedResults(currentResults)
            : currentResults,
        );
        setSelectedResults(updatedResults);
      })
      .catch((e) => {
        alert("Something went wrong");
        console.log(e);
      });
  };
  const handleExtract = (rowData: resultType[]) => openAnalyser(rowData);

  const filterResultsBySources = (sources: datasourceKeyType[]) => {
    const fResults = results.filter((res) => sources.includes(res.datasource));
    setFilteredResults(fResults);
  };

  const handleDatasourceClick = (source: datasourceKeyType) => {
    console.log(selectedSources, source);
    const index = selectedSources.indexOf(source);
    const currentSources = [...selectedSources];
    console.log(index);
    if (index >= 0) {
      currentSources.splice(index, 1);
    } else {
      currentSources.push(source);
    }
    setSelectedSources(currentSources);
    filterResultsBySources(currentSources);
  };

  useEffect(() => {
    const id = parseInt(searchParams.get("id") || "0");
    const pId = parseInt(searchParams.get("pId") || "0");
    if (id === 0 || pId === 0) navigate(`${APP_URI_PREFIX}/`); // send to dashboard if no id in url
    fetchQuery(id);
    fetchCategory(pId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visibleResults = selectedSources.length ? filteredResults : results;

  const categoryCounts = useMemo(() => {
    const categoryList = Object.values(categories)
      .filter(
        (category, index, list) =>
          list.findIndex(({ priority }) => priority === category.priority) ===
          index,
      )
      .sort((a, b) => a.priority - b.priority);
    const countsByPriority = new Map<number, number>();

    visibleResults.forEach((result) => {
      countsByPriority.set(
        result.priority,
        (countsByPriority.get(result.priority) || 0) + 1,
      );
    });

    const knownPriorities = new Set(
      categoryList.map((category) => category.priority),
    );
    const fallbackCounts = Array.from(countsByPriority.entries())
      .filter(([priority]) => !knownPriorities.has(priority))
      .map(([priority, count]) => ({
        key: `priority-${priority}`,
        label: `Priority ${priority}`,
        color: "#6c757d",
        priority,
        count,
      }));

    return [
      ...categoryList.map((category) => ({
        key: category.categoryId.toString(),
        label: category.label,
        color: category.color,
        priority: category.priority,
        count: countsByPriority.get(category.priority) || 0,
      })),
      ...fallbackCounts,
    ].sort((a, b) => a.priority - b.priority);
  }, [categories, visibleResults]);

  return (
    <div className="curate-page">
      <Container fluid className="curation-shell">
        {!isLoading ? (
          <>
            <section className="curation-hero">
              <div>
                <div className="dashboard-eyebrow">
                  <FiFileText />
                  Query curation
                </div>
                <h1>{query.query_name || "New Query"}</h1>
                <p>
                  Review, categorize, and analyze papers from this saved query.
                </p>
              </div>
              <Button
                className="dashboard-primary-action"
                onClick={() => setShowBulkActionModal(true)}
              >
                <GrAction />
                Bulk Action
              </Button>
            </section>
            <section className="curation-query-panel">
              <Query queryText={query.searchText} />
            </section>

            <section className="curation-toolbar">
              <div className="curation-stat">
                <IoMdCheckmarkCircleOutline />
                <span>{results.length}</span>
                <small>Unique Results</small>
              </div>
              <div className="curation-filter-group">
                <h2>
                  <FiDatabase />
                  Datasources
                </h2>
                <ButtonGroup className="sources-list">
                  {Object.entries(query.searchResults).map(
                    ([source, res], i) => (
                      <Button
                        key={i}
                        className={`${
                          selectedSources.includes(source as datasourceKeyType)
                            ? "c-btn-primary"
                            : "c-btn-alternate"
                        } shadow-none`}
                        onClick={() =>
                          handleDatasourceClick(source as datasourceKeyType)
                        }
                      >
                        {source}{" "}
                        <Badge bg="secondary">{res.documents?.length}</Badge>
                      </Button>
                    ),
                  )}
                </ButtonGroup>
              </div>
            </section>

            <section className="curation-category-panel">
              <div className="curation-category-heading">
                <h2>
                  <FiPieChart />
                  Category counts
                </h2>
                <span>{visibleResults.length} visible</span>
              </div>
              <div className="curation-category-counts">
                {categoryCounts.map((category) => (
                  <div className="curation-category-count" key={category.key}>
                    <CategorySymbol color={category.color} size="0.58rem" />
                    <span>{category.label}</span>
                    <strong>{category.count}</strong>
                  </div>
                ))}
              </div>
            </section>

            <section className="curation-table-panel">
              <CurationTable
                results={visibleResults}
                categories={categories}
                analyse={handleExtract}
                updateCategory={updateDocCategory}
                setSelectedRows={setSelectedResults}
              />
            </section>
          </>
        ) : (
          <div className="dashboard-loading">
            <Spinner />
          </div>
        )}
      </Container>
      <BulkActionModal
        show={showBulkActionModal}
        results={selectedResults}
        categories={categories}
        analyse={handleExtract}
        updateCategory={updateDocCategory}
        handleClose={() => setShowBulkActionModal(false)}
      />
    </div>
  );
};

export default Curate;
