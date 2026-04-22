import PageSubHeader from "../PageSubHeader";
import { IoMdAddCircleOutline } from "react-icons/io";
import { v4 as uuidv4 } from "uuid";
import { queryType } from "../../api/types";
import QueryContext from "../../contexts/QueryContext";
import { useContext, useEffect, useState } from "react";
import ReportIconButton from "../IconButtons/ReportIconButton";
import Loader from "../Loader";
import ProjectReportModal from "../ProjectReportModal";
import { Alert, Container } from "react-bootstrap";
import { getQueries } from "../../api/query";
import ProjectContext from "../../contexts/ProjectContext";
import QueryCards from "./QueryCards";
import SubHeaderTitle from "./SubHeaderTitle";
import QueryDetails from "./QueryDetails";
import { arrayToObject } from "../../api/utility";
import { FaTasks } from "react-icons/fa";

const Index = () => {
  const { project } = useContext(ProjectContext);
  const { queries, setQueries } = useContext(QueryContext);
  const [isLoading, setIsLoading] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedQueryId, setSelectedQueryId] = useState<string>("");

  const fetchQueries = () => {
    setIsLoading(true);
    getQueries(project.projectId)
      .then((data) => setQueries(arrayToObject(data, "queryId")))
      .catch((e) => {
        alert("Failed to fetch query");
        console.log(e);
      })
      .finally(() => setIsLoading(false));
  };

  const addQuery = () => {
    const newId: string = uuidv4(); // temp id
    const newQuery: queryType = {
      query_name: "New Query",
      queryId: 0, // db Id
      searchText: "",
      format: "(1=1)",
      searchResults: {},
    };
    setQueries({ ...queries, [newId]: newQuery });
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(fetchQueries, []);

  return (
    <>
      <Container>
        <PageSubHeader
          subTitle={
            <SubHeaderTitle
              icon={<FaTasks />}
              title="Queries"
              count={Object.keys(queries).length}
            />
          }
          sideComponent={
            <div className="d-flex gap-2 align-items-center">
              <IoMdAddCircleOutline
                className="cp"
                size={"1.5rem"}
                onClick={addQuery}
              />
              <ReportIconButton variant="light" size="lg" queries={queries} />
            </div>
          }
        />
      </Container>
      <Container className="query-content">
        {isLoading && <Loader />}
        {!isLoading && (
          <>
            {Object.keys(queries).length > 0 ? (
              <>
                <QueryCards
                  selectedQId={selectedQueryId}
                  queries={queries}
                  selectQuery={(id: string) => setSelectedQueryId(id)}
                />
                {selectedQueryId && queries[selectedQueryId] && (
                  <QueryDetails
                    newId={selectedQueryId}
                    query={queries[selectedQueryId]}
                  />
                )}
              </>
            ) : (
              <Alert className="c-alert-info">
                Use <IoMdAddCircleOutline className="m-0" /> button to add
                queries in this project
              </Alert>
            )}
          </>
        )}
      </Container>

      <ProjectReportModal
        show={showReportModal}
        queries={queries}
        handleClose={() => setShowReportModal(false)}
      />
    </>
  );
};

export default Index;
