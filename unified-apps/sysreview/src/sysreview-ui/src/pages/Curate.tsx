import {
  Badge,
  Button,
  ButtonGroup,
  Col,
  Container,
  Row,
  Spinner,
} from "react-bootstrap";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
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
import PageHeader from "../components/PageHeader";
import SectionTitle from "../components/SectionTitle";
import PageSubHeader from "../components/PageSubHeader";
import CurationTable from "../components/CurationTable/Index";
import { GrAction } from "react-icons/gr";
import SubHeaderTitle from "../components/Queries/SubHeaderTitle";
import { ANALYSER_API_URI } from "../constants";

const Curate = () => {
  const [query, setQuery] = useState<queryType>(dummyQuery);
  const [results, setResults] = useState<resultType[]>([]);
  const [filteredResults, setFilteredResults] = useState<resultType[]>([]);
  const [selectedResults, setSelectedResults] = useState<resultType[]>([]);
  const [selectedSources, setSelectedSources] = useState<datasourceKeyType[]>(
    []
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
        setResults(mergeResults(Object.values(data.searchResults)));
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
    setIsLoading(true);
    updateQuery(query.queryId, resultIds, priority)
      .then((_) => {
        // setResults(updatedResults);
        window.location.reload();
      })
      .catch((e) => {
        alert("Something went wrong");
        console.log(e);
      })
      .finally(() => setIsLoading(false));
  };
  //TODO: refactor
  const handleExtract = (rowData: resultType[]) => {
    console.log(rowData);
    const jsonString = JSON.stringify(rowData);
    const queryParams = `json=${encodeURIComponent(jsonString)}`;
    const finalUrl = `${ANALYSER_API_URI}?${queryParams}`;
    console.log(finalUrl);
    window.open(finalUrl, "_blank")?.focus();
  };

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

  return (
    <div className="curate-page">
      <PageHeader title="Curation" />
      {!isLoading ? (
        <Container>
          <SectionTitle title={query.query_name || "New Query"} />
          <Container className="mb-4">
            <Query queryText={query.searchText} />
          </Container>
          <PageSubHeader
            subTitle={
              <SubHeaderTitle
                count={results.length}
                title="Unique Results"
                icon={<IoMdCheckmarkCircleOutline />}
              />
            }
            sideComponent={
              <Button
                className="c-btn-text fw-bold"
                onClick={() => setShowBulkActionModal(true)}
              >
                <GrAction className="m-2" />
                Bulk Action
              </Button>
            }
          />

          <Container className="my-4 d-flex gap-4 align-items-center">
            <h5 className="c-text-primary">
              Select Datasource to filter results
            </h5>
            <ButtonGroup className="sources-list">
              {Object.entries(query.searchResults).map(([source, res], i) => (
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
                  {source} <Badge bg="secondary">{res.documents?.length}</Badge>
                </Button>
              ))}
            </ButtonGroup>
          </Container>
          <Row>
            <Col>
              <CurationTable
                results={filteredResults.length ? filteredResults : results}
                categories={categories}
                analyse={handleExtract}
                updateCategory={updateDocCategory}
                setSelectedRows={setSelectedResults}
              />
            </Col>
          </Row>
        </Container>
      ) : (
        <Container>
          <Spinner />
        </Container>
      )}
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
