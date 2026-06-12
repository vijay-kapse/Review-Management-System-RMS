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
    <div className="workspace-category-row">
      <Form className="workspace-category-form">
        <Form.Group className="workspace-category-color">
          <Form.Control
            type="color"
            name="color"
            value={category.color}
            onChange={updateCategory}
          />
        </Form.Group>
        <Form.Group className="workspace-category-name">
          <Form.Control
            type="text"
            placeholder="Category Label"
            value={category.label}
            name="label"
            onChange={updateCategory}
          />
        </Form.Group>
        <Button
          type="button"
          className="workspace-icon-danger"
          aria-label="Remove category"
          onClick={() => removeCategory(cId, cat)}
        >
          <MdCancel />
        </Button>
      </Form>
      {(!cat.categoryId || editing) && (
        <Button
          type="button"
          className="workspace-secondary-action workspace-category-action"
          onClick={handleSave}
        >
          Save
        </Button>
      )}
      {!!(cat.categoryId && editing) && (
        <Button
          type="button"
          className="workspace-muted-action workspace-category-action"
          onClick={handleReset}
        >
          Reset
        </Button>
      )}
    </div>
  );
};

export default Category;
