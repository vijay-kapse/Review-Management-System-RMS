import { Alert, Button, Container } from "react-bootstrap";
import { categoryType } from "../api/types";
import { v4 as uuidv4 } from "uuid";
import { FC, useContext } from "react";
import {
  deleteCategory,
  postCategories,
  updateCategory,
} from "../api/category";
import Category from "./Category";
import ProjectContext from "../contexts/ProjectContext";
import { BsFillInfoCircleFill } from "react-icons/bs";

interface CategoriesProps {
  projectId: number;
}

const Categories: FC<CategoriesProps> = ({ projectId }) => {
  const { categories, setCategories } = useContext(ProjectContext);
  const saveCategory = (cId: string, cat: categoryType) => {
    postCategories(projectId, cat)
      .then((data) => {
        const { cId: _, ...rest } = categories;
        setCategories({
          ...rest,
          [cId]: data, // updating the value of that id after post success call
        });
      })
      .catch((e) => {
        alert("Failed to post categories");
        console.log(e);
      });
  };

  const modifyCategory = (cId: string, cat: categoryType) => {
    updateCategory(projectId, cat)
      .then((data) => {
        const { cId: _, ...rest } = categories;
        setCategories({
          ...rest,
          [cId]: cat, // updating the value of that id after post success call
        });
      })
      .catch((e) => {
        alert("Failed to update categories");
        console.log(e);
      });
  };

  const addCategory = () => {
    const newId: string = uuidv4();
    const newCategory: categoryType = {
      categoryId: 0,
      label: "New Category",
      color: "#563d7c",
      priority: Object.keys(categories).length,
    };
    setCategories({ ...categories, [newId]: newCategory });
  };

  const removeCategory = (cId: string, cat: categoryType) => {
    if (!cat.categoryId) {
      let updatedCategories = { ...categories };
      delete updatedCategories[cId];
      setCategories(updatedCategories);
      return;
    }
    deleteCategory(cat.categoryId)
      .then((res) => {
        let updatedCategories = { ...categories };
        delete updatedCategories[cId];
        setCategories(updatedCategories);
      })
      .catch((e) => {
        alert(e.message);
        console.log(e);
      });
  };

  // useEffect(() => setCategories(cCategories), [cCategories]);
  return (
    <>
      <h4>Categories</h4>
      {Object.values(categories).length === 0 && (
        <Alert className="c-alert-info">
          <BsFillInfoCircleFill />
          First category will be assigned to all results as default
        </Alert>
      )}

      <Container>
        {Object.entries(categories).map(([cId, cat], i) => (
          <Category
            cat={cat}
            cId={cId}
            saveCategory={saveCategory}
            modifyCategory={modifyCategory}
            removeCategory={removeCategory}
            key={i}
          />
        ))}
      </Container>
      <div className="d-flex mt-4">
        <Button className="c-btn-primary m-auto" onClick={addCategory}>
          ADD
        </Button>
      </div>
    </>
  );
};

export default Categories;
