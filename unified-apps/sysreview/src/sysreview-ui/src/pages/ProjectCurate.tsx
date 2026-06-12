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
  projectResultOccurrenceType,
  projectResultType,
  projectType,
  queryType,
  resultType,
} from "../api/types";
import { getProject } from "../api/project";
import { getQueries, updateQuery } from "../api/query";
import { getCategories } from "../api/category";
import {
  arrayToObject,
  getCategoryColor,
  getCategoryLabel,
  getProjectCurationResults,
} from "../api/utility";
import { APP_URI_PREFIX, ANALYSER_API_URI } from "../constants";
import { IoMdCheckmarkCircleOutline } from "react-icons/io";
import { GrAction } from "react-icons/gr";
import BulkActionModal from "../components/BulkActionModal";
import CurationTable from "../components/CurationTable/Index";
import { FiDatabase, FiGitMerge } from "react-icons/fi";

const emptyProject: projectType = {
  projectId: 0,
  projectName: "",
  description: "",
  owner: "",
  collections: [],
};

const ProjectCurate = () => {
  const [project, setProject] = useState<projectType>(emptyProject);
  const [queries, setQueries] = useState<queryType[]>([]);
  const [results, setResults] = useState<projectResultType[]>([]);
  const [filteredResults, setFilteredResults] = useState<projectResultType[]>(
    [],
  );
  const [selectedResults, setSelectedResults] = useState<resultType[]>([]);
  const [selectedSources, setSelectedSources] = useState<datasourceKeyType[]>(
    [],
  );
  const [categories, setCategories] = useState<categorySetType>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showBulkActionModal, setShowBulkActionModal] = useState(false);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const projectId = parseInt(searchParams.get("id") || "0");

  const sourceCounts = useMemo(() => {
    const counts: { [source: string]: number } = {};
    results.forEach((result) => {
      result.occurrences.forEach((occurrence) => {
        counts[occurrence.datasource] =
          (counts[occurrence.datasource] || 0) + 1;
      });
    });
    return counts;
  }, [results]);

  const totalInstances = useMemo(
    () => results.reduce((count, result) => count + result.duplicateCount, 0),
    [results],
  );

  const duplicateGroups = useMemo(
    () => results.filter((result) => result.duplicateCount > 1).length,
    [results],
  );

  const loadProjectCuration = (id: number) => {
    setIsLoading(true);
    return Promise.all([getProject(id), getCategories(id), getQueries(id)])
      .then(([projectData, categoryData, queryData]) => {
        const categorySet = arrayToObject(
          categoryData,
          "categoryId",
        ) as categorySetType;
        setProject(projectData);
        setQueries(queryData);
        setCategories(categorySet);
        setResults(getProjectCurationResults(queryData, categorySet));
        setFilteredResults([]);
        setSelectedSources([]);
      })
      .catch((e) => {
        alert("Failed to fetch project curation data");
        console.log(e);
      })
      .finally(() => setIsLoading(false));
  };

  const rowHasSource = (result: projectResultType, source: datasourceKeyType) =>
    result.occurrences.some((occurrence) => occurrence.datasource === source);

  const filterResultsBySources = (sources: datasourceKeyType[]) => {
    setFilteredResults(
      sources.length
        ? results.filter((result) =>
            sources.some((source) => rowHasSource(result, source)),
          )
        : [],
    );
  };

  const handleDatasourceClick = (source: datasourceKeyType) => {
    const currentSources = selectedSources.includes(source)
      ? selectedSources.filter((selectedSource) => selectedSource !== source)
      : [...selectedSources, source];
    setSelectedSources(currentSources);
    filterResultsBySources(currentSources);
  };

  const updateDocCategory = (
    resultIds: number[],
    priority: number,
    rows: resultType[] = [],
  ) => {
    const rowsToUpdate = (
      rows.length
        ? rows
        : results.filter((result) => resultIds.includes(result.resultId))
    ) as projectResultType[];
    const updatesByQuery = new Map<number, Set<number>>();

    rowsToUpdate.forEach((result) => {
      const occurrences =
        result.occurrences?.length > 0
          ? result.occurrences
          : ([result] as projectResultOccurrenceType[]);
      occurrences.forEach(({ queryId, resultId }) => {
        if (!queryId || !resultId) return;
        const existingIds = updatesByQuery.get(queryId) || new Set<number>();
        existingIds.add(resultId);
        updatesByQuery.set(queryId, existingIds);
      });
    });

    if (!updatesByQuery.size) {
      alert("No saved papers were selected for category update");
      return;
    }

    Promise.all(
      Array.from(updatesByQuery.entries()).map(([queryId, ids]) =>
        updateQuery(queryId, Array.from(ids), priority),
      ),
    )
      .then(() => {
        const targetResultIds = new Set(
          rowsToUpdate.map((result) => result.resultId),
        );
        const updatedResults = (currentResults: projectResultType[]) =>
          currentResults.map((result) => {
            if (!targetResultIds.has(result.resultId)) return result;
            return {
              ...result,
              priority,
              categoryLabel: getCategoryLabel(categories, priority),
              categoryColor: getCategoryColor(categories, priority),
              occurrences: result.occurrences.map((occurrence) => ({
                ...occurrence,
                priority,
              })),
            };
          });
        setResults(updatedResults);
        setFilteredResults((currentResults) =>
          currentResults.length
            ? updatedResults(currentResults)
            : currentResults,
        );
        setSelectedResults((currentResults) =>
          currentResults.map((result) =>
            targetResultIds.has(result.resultId)
              ? { ...result, priority }
              : result,
          ),
        );
      })
      .catch((e) => {
        alert("Something went wrong");
        console.log(e);
      });
  };

  const handleExtract = (rowData: resultType[]) => {
    const jsonString = JSON.stringify(rowData);
    const queryParams = `json=${encodeURIComponent(jsonString)}`;
    const finalUrl = `${ANALYSER_API_URI}?${queryParams}`;
    window.open(finalUrl, "_blank")?.focus();
  };

  useEffect(() => {
    if (!projectId) {
      navigate(`${APP_URI_PREFIX}/dashboard`);
      return;
    }
    loadProjectCuration(projectId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visibleResults = selectedSources.length ? filteredResults : results;

  return (
    <div className="curate-page">
      <Container fluid className="curation-shell">
        {!isLoading ? (
          <>
            <section className="curation-hero">
              <div>
                <div className="dashboard-eyebrow">
                  <FiGitMerge />
                  Project curation
                </div>
                <h1>{project.projectName || "Project"}</h1>
                <p>
                  Deduplicated project-level review across every saved query.
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

            <section className="curation-stat-grid">
              <div className="curation-stat">
                <IoMdCheckmarkCircleOutline />
                <span>{results.length}</span>
                <small>Unique Papers</small>
              </div>
              <div className="curation-stat">
                <FiDatabase />
                <span>{totalInstances}</span>
                <small>Saved Results</small>
              </div>
              <div className="curation-stat">
                <FiGitMerge />
                <span>{duplicateGroups}</span>
                <small>Duplicate Groups</small>
              </div>
              <div className="curation-stat">
                <FiDatabase />
                <span>{queries.length}</span>
                <small>Queries</small>
              </div>
            </section>

            <section className="curation-toolbar">
              <div className="curation-filter-group">
                <h2>
                  <FiDatabase />
                  Datasources
                </h2>
                <ButtonGroup className="sources-list">
                  {Object.entries(sourceCounts).map(([source, count]) => (
                    <Button
                      key={source}
                      className={`${
                        selectedSources.includes(source as datasourceKeyType)
                          ? "c-btn-primary"
                          : "c-btn-alternate"
                      } shadow-none`}
                      onClick={() =>
                        handleDatasourceClick(source as datasourceKeyType)
                      }
                    >
                      {source} <Badge bg="secondary">{count}</Badge>
                    </Button>
                  ))}
                </ButtonGroup>
              </div>
            </section>

            <section className="curation-table-panel">
              <CurationTable
                results={visibleResults}
                categories={categories}
                analyse={handleExtract}
                updateCategory={updateDocCategory}
                setSelectedRows={setSelectedResults}
                showProjectColumns
                showDeduplication
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

export default ProjectCurate;
