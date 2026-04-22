import { useContext } from "react";
import { Button, Card } from "react-bootstrap";
import { queryType } from "../api/types";
import { getResultStats, mergeResults } from "../api/utility";
import QueryContext from "../contexts/QueryContext";
import SourcesData from "./SourcesData";
import { APP_URI_PREFIX } from "../constants";
import ProjectContext from "../contexts/ProjectContext";
import { deleteQuery } from "../api/query";
import QueryCardHeader from "./Queries/QueryCardHeader";

interface QueryCardProps {
  selected: boolean;
  qId: string;
  query: queryType;
}

const QueryCard = ({ qId, query, selected }: QueryCardProps) => {
  const { project } = useContext(ProjectContext);
  const { cloneQuery, removeQuery } = useContext(QueryContext);

  // same function is repeated for query details
  const removeCurrentQuery = () => {
    if (!window.confirm("Are you sure?")) return;
    if (!query.queryId) {
      removeQuery(qId);
      return;
    }
    deleteQuery(query.queryId)
      .then((res) => removeQuery(qId))
      .catch((e) => {
        alert("Failed to delete query");
        console.log(e);
      });
  };

  const curate = (e: React.MouseEvent<HTMLButtonElement>, queryId: number) => {
    e.preventDefault();
    e.stopPropagation();
    const link = `${APP_URI_PREFIX}/query/?id=${queryId}&pId=${project.projectId}`;
    window.open(link, "_blank", "noreferrer");
  };

  const displayQueryStats = () => {
    const stats = getResultStats(query.searchResults);
    return <SourcesData data={stats["sources"]} />;
  };

  const isNew = query.queryId ? false : true;
  const allResults = mergeResults(Object.values(query.searchResults));

  return (
    <>
      <Card className={`query-card cp ${selected && "query-card-selected"}`}>
        <QueryCardHeader
          allResultCount={allResults.length}
          isNew={isNew}
          deleteQuery={removeCurrentQuery}
          cloneQuery={() => cloneQuery(qId)}
        />
        <Card.Body className="closed-card-body">
          <Card.Title>{query.query_name}</Card.Title>
          {displayQueryStats()}
        </Card.Body>
        <Card.Footer className="text-center">
          {!isNew ? (
            <Button
              className="c-btn-primary"
              onClick={(e) => curate(e, query.queryId)}
            >
              CURATE
            </Button>
          ) : (
            <p>Click To Edit Below</p>
          )}
        </Card.Footer>
      </Card>
    </>
  );
};

export default QueryCard;
