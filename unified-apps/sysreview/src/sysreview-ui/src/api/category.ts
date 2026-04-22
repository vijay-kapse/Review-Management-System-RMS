import axios, { AxiosError } from "axios";
import { categoryType } from "./types";
import { getConfig } from "./utility";
import { API_URI } from "../constants";

type returnProject = (pId: number) => Promise<categoryType[]>;
const getCategories: returnProject = async (pId) => {
  const config = getConfig();

  console.log("Fetching Categories for project", pId);
  const url = API_URI + "/categories/project/" + pId;

  const resp = await axios.get(url, config);
  console.log(resp.data);
  return resp.data;
};
type returnSavedCategory = (
  pId: number,
  categories: categoryType
) => Promise<categoryType>;

const postCategories: returnSavedCategory = async (pId, categories) => {
  const config = getConfig();

  console.log("Saving category", categories);
  const url = API_URI + "/categories/project/" + pId;

  const resp = await axios.post(url, [categories], config);
  console.log(resp.data[0]);
  return resp.data[0];
};

type returnUpdatedCategory = (
  pId: number,
  category: categoryType
) => Promise<categoryType>;

const updateCategory: returnUpdatedCategory = async (pId, category) => {
  const config = getConfig();

  console.log("Updating category", category);
  const url = API_URI + "/categories/" + category.categoryId;

  const resp = await axios.put(url, category, config);
  console.log(resp.data);
  return resp.data;
};

type returnDeletedCategory = (cId: number) => Promise<boolean>;

const deleteCategory: returnDeletedCategory = async (cId) => {
  const config = getConfig();

  console.log("Deleting category", cId);
  const url = API_URI + "/categories/" + cId;
  try {
    const resp = await axios.delete(url, config);
    console.log(resp.data);
    return true;
  } catch (e: any | AxiosError) {
    if (axios.isAxiosError(e)) {
      throw new Error(e.response?.data);
    }
    throw new Error("Failed to delete cat");
  }
};

export { postCategories, updateCategory, getCategories, deleteCategory };
