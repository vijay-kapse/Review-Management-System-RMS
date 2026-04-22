import { QueryBuilderBootstrap } from "@react-querybuilder/bootstrap";
import { useEffect, useState } from "react";
import { Field, RuleGroupType, Operator, RuleType } from "react-querybuilder";
import { parseSQL } from "react-querybuilder/parseSQL";
import { QueryBuilderDnD } from "@react-querybuilder/dnd";
import { formatQuery, QueryBuilder } from "react-querybuilder";
import { Button, Container, Modal } from "react-bootstrap";
import { IoCloseSharp } from "react-icons/io5";
import Query from "./Query";

const fields: Field[] = [{ name: "keyword", label: "keyword" }];
const operators: Operator[] = [{ name: "=", label: "=" }];
const defaultBuilderQuery = {
  combinator: "and",
  rules: [],
};

interface queryBuilderModalProps {
  show: boolean;
  incomingQuery: string;
  disabled: boolean;
  handleClose: () => void;
  saveQuery: (qS: string) => void;
}

const QueryBuilderModal = ({
  show,
  incomingQuery,
  disabled,
  handleClose,
  saveQuery,
}: queryBuilderModalProps) => {
  const [builderQuery, setBuilderQuery] =
    useState<RuleGroupType<RuleType>>(defaultBuilderQuery); // for buillder
  const [stringQuery, setStringQuery] = useState(incomingQuery); // for us

  const onSaveClose = () => {
    saveQuery(stringQuery);
  };
  const builderToStringQuery = (q: RuleGroupType<RuleType>) => {
    const string = formatQuery(q, "sql");
    return string.replaceAll("keyword = ", "");
  };
  const stringToBuilderQuery = (q: string) => {
    if (q === "") return defaultBuilderQuery;
    try {
      const builder = parseSQL(q.replace(/'([^']*)'/g, "keyword = '$1'"));
      if (builder.rules.length === 0) {
        // passed string not in builder's format
        alert("Entered query is not in builder's format");
      }
      return builder;
    } catch (e) {
      // error in parsing the passed string
      alert("Entered query is not in builder's format");
      return defaultBuilderQuery;
    }
  };

  // update stringQuery as builderQuery is changed
  useEffect(() => {
    const string = builderToStringQuery(builderQuery);
    setStringQuery(string);
  }, [builderQuery]);

  return (
    <Modal
      show={show}
      onEnter={() => setBuilderQuery(stringToBuilderQuery(incomingQuery))}
      onHide={handleClose}
      size="xl"
      className="c-modal"
      centered
    >
      <Modal.Header>
        <Modal.Title>Build Your Query</Modal.Title>
        <IoCloseSharp className="cp" size={"1.5rem"} onClick={handleClose} />
      </Modal.Header>
      <Modal.Body>
        <Container className="mb-4">
          <h5>Builder:</h5>
          <QueryBuilderBootstrap>
            <QueryBuilderDnD>
              <QueryBuilder
                controlClassnames={{
                  header: "justify-content-end",
                  combinators: "w-min mr-auto",
                  addRule: "c-bg-primary",
                  fields: "d-none",
                  operators: "d-none",
                  notToggle: "m-0 d-flex gap-2",
                  rule: "justify-content-end",
                  value: "w-min mr-auto",
                  queryBuilder: "queryBuilder-branches",
                }}
                fields={fields}
                autoSelectField
                enableDragAndDrop={true}
                query={builderQuery}
                showNotToggle
                // showCloneButtons
                showLockButtons
                operators={operators}
                onQueryChange={(q: RuleGroupType<RuleType>) => {
                  setBuilderQuery(q);
                }}
                disabled={disabled}
              />
            </QueryBuilderDnD>
          </QueryBuilderBootstrap>
        </Container>
        <Container className="mb-4">
          <h5>Query: </h5>
          <Query queryText={stringQuery} />
        </Container>
      </Modal.Body>
      <Modal.Footer>
        <Button className="c-btn-negative" onClick={handleClose}>
          Close
        </Button>
        {!disabled && (
          <Button className="c-btn-primary" onClick={onSaveClose}>
            Use Query
          </Button>
        )}
      </Modal.Footer>
    </Modal>
  );
};

export default QueryBuilderModal;
