import { userType } from "./types";
import axios, { AxiosError } from "axios";
import { setToken } from "./utility";
import { isTokenSet, getConfig } from "./utility";
import { API_URI } from "../constants";

type returnUserOrNull = () => Promise<userType | null> | null;
const getUser: returnUserOrNull = async () => {
  if (!isTokenSet()) return null;
  const config = getConfig();

  console.log("Fetching Current User");
  const url = API_URI + "/users/loggedInUser";
  try {
    const resp = await axios.get(url, config);
    console.log(resp.data);
    return resp.data;
  } catch (e) {
    const err = e as AxiosError;
    if (err.response?.status === 403) return null;
    else throw new Error(err.message);
  }
};

type registerUserBody = {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  username: string;
};

const registerUser = async (data: registerUserBody) => {
  console.log("registering User", data);
  const url = API_URI + "/auth/signup";
  try {
    const resp = await axios.post(url, data);
    console.log(resp);
    if (resp.status !== 200) throw new Error("Request failed");
    const { authToken } = resp.data;
    if (!authToken) throw new Error("User registration failed");
    setToken(authToken);
    return true;
  } catch (e: any | AxiosError) {
    console.log(e);
    const msg = e.response?.data["authToken"];
    if (axios.isAxiosError(e)) {
      throw new Error(msg);
    }
    throw new Error("Failed to delete cat");
  }
};

type loginUserBody = {
  username: string;
  password: string;
};

const loginUser = async (data: loginUserBody) => {
  console.log("Login in User", data);
  const url = API_URI + "/auth/signin";
  try {
    const resp = await axios.post(url, data);
    console.log(resp);
    if (resp.status !== 200) throw new Error("Request failed");
    const { authToken } = resp.data;
    if (!authToken) throw new Error("No user found");
    setToken(authToken);
    return true;
  } catch (e: any | AxiosError) {
    console.log(e);
    const msg = e.response?.data["authToken"];
    if (axios.isAxiosError(e)) {
      throw new Error(msg);
    }
    throw new Error("Failed to delete cat");
  }
};

export { getUser, registerUser, loginUser };
