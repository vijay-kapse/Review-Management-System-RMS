import { FC } from "react";
import { querySetType } from "../../api/types";
import QueryCard from "../QueryCard";

interface QueryCardsProps {
  selectedQId: string;
  queries: querySetType;
  selectQuery: (id: string) => void;
}

const QueryCards: FC<QueryCardsProps> = ({
  queries,
  selectedQId,
  selectQuery,
}) => {
  return (
    <div className="query-cards-wrapper">
      {Object.entries(queries)
        .map(([qId, query]) => {
          return (
            <div onClick={() => selectQuery(qId)} key={qId}>
              {
                <QueryCard
                  key={qId}
                  qId={qId}
                  query={query}
                  selected={selectedQId === qId}
                />
              }
            </div>
          );
        })
        .reverse()}
    </div>
  );
};

export default QueryCards;
