import React, { createContext, useState } from "react";
import { categorySetType, projectType } from "../api/types";
import { getCategories } from "../api/category";

type projectContextType = {
  project: projectType;
  setProject: (proj: projectType) => void;
  categories: categorySetType;
  setCategories: React.Dispatch<React.SetStateAction<categorySetType>>;
  loadCategories: (pId: number) => void;
};

const initialProjectState: projectContextType = {
  project: {
    projectId: 0,
    collections: [],
    description: "",
    projectName: "",
    owner: "",
  },
  setProject: () => {},
  categories: {},
  setCategories: () => {},
  loadCategories: () => {},
};

export const ProjectContext =
  createContext<projectContextType>(initialProjectState);

export const ProjectContextProvider = ({ children }) => {
  const [project, setProject] = useState<projectType>(
    initialProjectState.project
  );
  const [categories, setCategories] = useState(initialProjectState.categories);

  const loadCategories = (pId: number) => {
    getCategories(pId)
      .then((data) => {
        let categoriesSet = {};
        data.forEach((cat) => {
          categoriesSet[cat.categoryId.toString()] = cat;
        });
        setCategories(categoriesSet);
      })
      .catch((e) => {
        alert("Something went wrong");
        console.log(e);
      });
  };

  const value = {
    project,
    setProject,
    categories,
    setCategories,
    loadCategories,
  };

  return (
    <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>
  );
};

export default ProjectContext;
