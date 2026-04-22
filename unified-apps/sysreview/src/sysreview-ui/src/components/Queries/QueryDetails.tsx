import { FC, useContext, useState } from "react";
import {
  Button,
  ButtonGroup,
  Card,
  Col,
  Container,
  Dropdown,
  DropdownButton,
  Form,
  InputGroup,
  Row,
} from "react-bootstrap";
import { datasourceKeyType, queryType, resultType } from "../../api/types";
import QueryContext from "../../contexts/QueryContext";
import { IoMdBuild } from "react-icons/io";
import QuerySourceFetcher from "../QuerySourceFetcher";
import { IoAddOutline } from "react-icons/io5";
import CumulativeResultsTableModal from "../CumulativeResultsTableModal";
import QueryCardHeader from "./QueryCardHeader";
import { mergeResults } from "../../api/utility";
import { deleteQuery, postQuery } from "../../api/query";
import { search } from "../../api/search";
import ProjectContext from "../../contexts/ProjectContext";
import QueryBuilderModal from "../QueryBuilderModal";
import Loader from "../Loader";
import SectionTitle from "../SectionTitle";
import AppContext from "../../contexts/AppContext";
import DateRangePicker from "./DateRangePicker";

interface QueryDetailsProps {
  newId: string; // temp id for frontend
  query: queryType;
}

const QueryDetails: FC<QueryDetailsProps> = ({ newId, query }) => {
  const { datasources } = useContext(AppContext);
  const { project, categories } = useContext(ProjectContext);
  const { queries, setQueries, removeQuery, cloneQuery, addResultToSource } =
    useContext(QueryContext);

  const [isLoading, setIsLoading] = useState(false);
  const [showQueryBuilderModal, setShowQueryBuilderModal] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const buildQuery = (qId: string) => {
    setShowQueryBuilderModal(true);
  };

  const handleQueryDateChange = (range: [string, string]) => {
    setQueries({
      ...queries,
      [newId]: {
        ...queries[newId],
        fromMonth: range[0] || undefined,
        toMonth: range[1] || undefined,
        includeRange: !!range[0],
      },
    });
  };

  const handleQueryNameChange = (name: string) => {
    setQueries({
      ...queries,
      [newId]: {
        ...queries[newId],
        query_name: name,
      },
    });
  };

  const handleQueryChange = (text: string) => {
    setQueries({
      ...queries,
      [newId]: {
        ...queries[newId],
        searchText: text,
      },
    });
  };
  // same function is repeated for query card
  const removeCurrentQuery = () => {
    if (!window.confirm("Are you sure?")) return;
    setIsLoading(true);
    if (!query.queryId) {
      removeQuery(newId);
      return;
    }
    deleteQuery(query.queryId)
      .then((res) => removeQuery(newId))
      .catch((e) => {
        alert("Failed to delete query");
        console.log(e);
      })
      .finally(() => setIsLoading(false));
  };

  const handleOnNewResults = (
    apiResultsCount: number,
    data: resultType[],
    datasource: datasourceKeyType
  ) => {
    addResultToSource(newId, apiResultsCount, datasource, data);
  };

  const fetchResults = (datasource: datasourceKeyType) => {
    if (!query.searchText) {
      alert("Enter some query to fetch papers!");
      return;
    }
    setIsLoading(true);
    const searchData = { datasource, queryText: query.searchText, categories };
    if (query.fromMonth && query.toMonth) {
      searchData["dateRange"] = { from: query.fromMonth, to: query.toMonth };
    }

    search(searchData)
      .then((data) =>
        handleOnNewResults(
          data.apiResultsCount,
          data.documents as resultType[],
          datasource
        )
      )
      .catch((e) => {
        alert("Fetch failed");
        console.log(e);
      })
      .finally(() => setIsLoading(false));
  };

  const setCurrentQuery = (qS: string) => {
    setQueries({
      ...queries,
      [newId]: {
        ...queries[newId],
        searchText: qS,
      },
    });
    setShowQueryBuilderModal(false);
  };

  const handleSave = () => {
    const res = window.confirm(
      "You cannot modify once you save the query, do you want to continue?"
    );
    if (!res) return;
    setIsLoading(true);
    postQuery(project.projectId, query)
      .then(({ queryId, searchResults, searchText, toMonth, fromMonth }) => {
        setQueries({
          ...queries,
          [newId]: {
            ...queries[newId],
            queryId,
            searchResults,
            searchText,
            toMonth,
            fromMonth,
          },
        });
      })
      .catch((e) => {
        alert("Failed to save the query");
        console.log(e);
      })
      .finally(() => setIsLoading(false));
  };

  const datePickerComponent = () => {
    const component = (
      <Row className="d-flex align-items-center">
        <Col>
          <DateRangePicker
            disabled={!!Object.values(query.searchResults)[0]?.documents}
            includeRange={!!query.includeRange}
            range={[query.fromMonth as string, query.toMonth as string]}
            setRange={handleQueryDateChange}
          />
        </Col>
      </Row>
    );
    if (isNew) return component;
    else {
      if (query.toMonth || query.fromMonth) return component;
    }
    return <></>;
  };

  const isNew = query.queryId ? false : true;
  const allResults = mergeResults(Object.values(query.searchResults));

  return (
    <Container className="mt-4">
      <SectionTitle title={query.query_name} />
      <Card className="query-card-expanded">
        <QueryCardHeader
          allResultCount={allResults.length}
          isNew={isNew}
          deleteQuery={removeCurrentQuery}
          cloneQuery={() => cloneQuery(newId)}
        />
        <Card.Body className="expanded-card-body">
          <Row>
            <Col sm={11}>
              <InputGroup className="name-input mb-3 w-50">
                <InputGroup.Text>NAME</InputGroup.Text>
                <Form.Control
                  placeholder="New Query"
                  disabled={query.queryId ? true : false}
                  value={query.query_name}
                  onChange={(e) => handleQueryNameChange(e.target.value)}
                />
              </InputGroup>
            </Col>
            <Col className="text-end">{isLoading && <Loader />}</Col>
          </Row>
          <Row>
            <Col md="10">
              <InputGroup className="mb-3">
                <InputGroup.Text>QUERY</InputGroup.Text>
                <Form.Control
                  placeholder="('term1' and 'term2')"
                  disabled={query.queryId ? true : false}
                  value={query.searchText}
                  onChange={(e) => handleQueryChange(e.target.value)}
                />

                <Button
                  className="builder-btn"
                  onClick={() => buildQuery(newId)}
                >
                  <IoMdBuild size={"1.3rem"} />
                </Button>
              </InputGroup>
            </Col>
          </Row>
          {datePickerComponent()}
          <Row>
            <Col sm={2}>
              <h5>Datasources:</h5>
            </Col>
          </Row>
          <Row>
            <Col sm={10} className="m-auto">
              <Row className="source-card-wrapper justify-content-center">
                {Object.entries(query.searchResults).map(([source, res]) => (
                  <Col className="mb-4" sm={3} key={source}>
                    <QuerySourceFetcher
                      key={source}
                      datasource={source as datasourceKeyType}
                      res={res}
                      qId={newId}
                      fetchResults={fetchResults}
                      submitResults={handleOnNewResults}
                      freeze={!isNew}
                    />
                  </Col>
                ))}

                {Object.keys(query.searchResults).length <
                  Object.keys(datasources).length &&
                  isNew && (
                    <Col className="d-flex gap-2 align-items-center">
                      <DropdownButton
                        className="add-source-button"
                        as={ButtonGroup}
                        title={<IoAddOutline />}
                        onSelect={(val) =>
                          addResultToSource(
                            newId,
                            0,
                            val as datasourceKeyType,
                            null
                          )
                        }
                      >
                        {Object.keys(datasources).map((source) => {
                          if (
                            !Object.keys(query.searchResults).includes(source)
                          )
                            return (
                              <Dropdown.Item key={source} eventKey={source}>
                                {source}
                              </Dropdown.Item>
                            );
                          return <></>;
                        })}
                      </DropdownButton>
                      {!Object.keys(query.searchResults).length && (
                        <p className="my-auto">
                          Add Datasources to fetch papers
                        </p>
                      )}
                    </Col>
                  )}
              </Row>
            </Col>
          </Row>
          <div className="d-flex justify-content-end mt-4 gap-2">
            {!!Object.values(query.searchResults)[0]?.documents?.length && (
              <Button
                className="c-btn-secondary"
                onClick={() => setShowResults(true)}
              >
                {isNew ? "Show All" : "Show Unique"} {allResults.length}
              </Button>
            )}
            {isNew && !!Object.values(query.searchResults)[0]?.documents && (
              <Button className="c-btn-negative" onClick={handleSave}>
                SAVE
              </Button>
            )}
          </div>
        </Card.Body>
      </Card>
      <QueryBuilderModal
        show={showQueryBuilderModal}
        saveQuery={setCurrentQuery}
        incomingQuery={query.searchText}
        disabled={!isNew}
        handleClose={() => setShowQueryBuilderModal(false)}
      />
      <CumulativeResultsTableModal
        show={showResults}
        res={allResults}
        handleClose={() => setShowResults(false)}
      />
    </Container>
  );
};

export default QueryDetails;
