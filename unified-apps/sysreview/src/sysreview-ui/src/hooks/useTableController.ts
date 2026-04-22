import { useState } from "react";

const useTableController = (totalRows: number, interval: number) => {
  const [u, setU] = useState(interval);
  const [l, setL] = useState(0);

  const next = () => {
    if (l + interval >= totalRows) return;
    setU(u + interval);
    setL(l + interval);
  };
  const prev = () => {
    if (l - interval < 0) return;
    setU(u - interval);
    setL(l - interval);
  };

  return { u, l, next, prev, updateInterval: setU };
};

export default useTableController;
