import React, { createContext, useEffect, useState } from "react";
import { unsetToken } from "../api/utility";
import { datasourceType, userType } from "../api/types";
import { getDataSources } from "../api/search";

type appContextType = {
  user: userType | null;
  datasources: datasourceType;
  setUser: React.Dispatch<React.SetStateAction<userType | null>>;
  unsetUserDetails: () => void;
};

const initialAppState: appContextType = {
  user: null,
  datasources: {
    IEEE: { url: "" },
    MANUAL: { url: "" },
    PUBMED: { url: "" },
    SCOPUS: { url: "" },
    WOS: { url: "" },
  },
  setUser: () => {},
  unsetUserDetails: () => {},
};

export const AppContext = createContext<appContextType>(initialAppState);

export const AppContextProvider = ({ children }) => {
  const [user, setUser] = useState<userType | null>(initialAppState.user);
  const [datasources, setDatasources] = useState<datasourceType>(
    initialAppState.datasources
  );

  const unsetUserDetails = () => {
    unsetToken();
    setUser(null);
  };

  const fetchDatasources = () => {
    getDataSources()
      ?.then((datasources) => setDatasources(datasources))
      .catch((e) => alert(e));
  };

  const value = { user, datasources, unsetUserDetails, setUser };

  useEffect(() => {
    fetchDatasources();
  }, []);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export default AppContext;
