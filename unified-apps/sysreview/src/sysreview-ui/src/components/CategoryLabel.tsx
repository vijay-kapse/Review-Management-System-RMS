import { Col, Row } from "react-bootstrap";
import { categorySetType } from "../api/types";

interface CategorySymbolProps {
  color: string;
  size?: string;
}

export const CategorySymbol = ({ color, size }: CategorySymbolProps) => {
  return (
    <span
      className="dot"
      style={{ backgroundColor: color, width: size, height: size }}
    ></span>
  );
};

interface CategoryLabelProps {
  categories: categorySetType;
}

export const CategoryLabels = ({ categories }: CategoryLabelProps) => {
  return (
    <>
      <Row>
        {Object.values(categories).map((cat, i) => (
          <Col md={2} key={i}>
            <p>
              <CategorySymbol color={cat.color} /> {cat.label}
            </p>
          </Col>
        ))}
      </Row>
    </>
  );
};
