import React, { FC } from "react";
import { Badge, Card } from "react-bootstrap";
import { FaTrash } from "react-icons/fa";
import { LiaCloneSolid } from "react-icons/lia";

interface QueryCardHeaderProps {
  allResultCount: number;
  isNew: Boolean;
  deleteQuery: () => void;
  cloneQuery: () => void;
}

const QueryCardHeader: FC<QueryCardHeaderProps> = ({
  allResultCount,
  isNew,
  deleteQuery,
  cloneQuery,
}) => {
  const handleCloneQuery = (e: React.MouseEvent<HTMLOrSVGElement>) => {
    e.preventDefault();
    e.stopPropagation();
    cloneQuery();
  };
  const handleDeleteQuery = (e: React.MouseEvent<HTMLOrSVGElement>) => {
    e.preventDefault();
    e.stopPropagation();
    deleteQuery();
  };
  return (
    <Card.Header className="d-flex justify-content-between align-items-center">
      {isNew ? (
        <Badge className="new-badge">NEW</Badge>
      ) : (
        <Badge className="result-badge">{allResultCount}</Badge>
      )}
      <div className="query-card-action d-flex gap-2 align-items-center">
        <LiaCloneSolid className="clone-icon" onClick={handleCloneQuery} />
        <FaTrash className="trash-icon" onClick={handleDeleteQuery} />
      </div>
    </Card.Header>
  );
};

export default QueryCardHeader;
