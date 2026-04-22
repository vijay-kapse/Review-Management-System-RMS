import { ChangeEvent, useState } from "react";
import { categoryType } from "../api/types";
import { Button, Form } from "react-bootstrap";
import { MdCancel } from "react-icons/md";

interface CategoryProps {
  cat: categoryType;
  cId: string;
  removeCategory: (cId: string, cat: categoryType) => void;
  saveCategory: (cId: string, cat: categoryType) => void;
  modifyCategory: (cId: string, cat: categoryType) => void;
}

const Category = ({
  cat,
  cId,
  saveCategory,
  modifyCategory,
  removeCategory,
}: CategoryProps) => {
  const [category, setCategory] = useState(cat);
  const [editing, setEditing] = useState(false);

  const updateCategory = (e: ChangeEvent<HTMLInputElement>) => {
    setCategory({
      ...category,
      [e.target.name]: e.target.value,
    });
    if (cat.categoryId)
      //  eiditing tracks already saved category
      setEditing(true);
  };

  const handleSave = () => {
    if (editing) {
      modifyCategory(cId, category);
    } else {
      saveCategory(cId, category);
    }
    setEditing(false);
  };

  const handleReset = () => {
    setEditing(false);
    setCategory(cat);
  };

  return (
    <div className="d-flex align-items-center">
      <Form className="d-flex align-items-center gap-2">
        <Form.Group>
          <Form.Control
            type="color"
            name="color"
            value={category.color}
            onChange={updateCategory}
          />
        </Form.Group>
        <Form.Group>
          <Form.Control
            type="text"
            placeholder="Category Label"
            value={category.label}
            name="label"
            onChange={updateCategory}
          />
        </Form.Group>
        <Button
          className="c-btn-text-o"
          onClick={() => removeCategory(cId, cat)}
        >
          <MdCancel color="red" />
        </Button>
      </Form>
      {(!cat.categoryId || editing) && (
        <Button className="c-btn-text-o" onClick={handleSave}>
          SAVE
        </Button>
      )}
      {!!(cat.categoryId && editing) && (
        <Button className="c-btn-text-o" onClick={handleReset}>
          RESET
        </Button>
      )}
    </div>
  );
};

export default Category;
