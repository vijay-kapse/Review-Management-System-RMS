import React from "react";
import { Button, Form, InputGroup } from "react-bootstrap";
import { MdCancel } from "react-icons/md";

const SearchFilter = ({ filterText, onFilter, onClear }) => {
  return (
    <Form>
      <InputGroup>
        <Form.Control
          id="search"
          type="text"
          placeholder="Search By Title"
          aria-label="Search Input"
          value={filterText}
          onChange={onFilter}
        />
        <Button className="c-btn-primary" onClick={onClear}>
          <MdCancel />
        </Button>
      </InputGroup>
    </Form>
  );
};

export default SearchFilter;
