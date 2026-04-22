import { Form } from "react-bootstrap";
import { categorySetType } from "../../api/types";
import { CategorySymbol } from "../CategoryLabel";
import { FC } from "react";

interface CategoryFilterProps {
  categories: categorySetType;
  selectedCategory: number;
  onFilter: (p: number) => void;
}

const CategoryFilter: FC<CategoryFilterProps> = ({
  selectedCategory,
  onFilter,
  categories,
}) => {
  return (
    <Form className="d-flex ">
      <Form.Select
        className="c-text-primary"
        value={selectedCategory}
        onChange={(e) => onFilter(+e.target.value)}
      >
        <option value={-1} selected>
          All Categories
        </option>
        {Object.values(categories).map((cat) => (
          <option value={cat.priority}>
            <CategorySymbol color={cat.color} />
            {cat.label}
          </option>
        ))}
      </Form.Select>
    </Form>
  );
};

export default CategoryFilter;
