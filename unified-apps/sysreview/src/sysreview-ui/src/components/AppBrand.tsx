import { FC } from "react";
import { IMAGE_URI_PREFIX } from "../constants";

export const TRACE_FULL_NAME =
  "Tracking, Reporting, Analyzing, Curating, and Extracting data";

interface AppBrandProps {
  variant?: "light" | "dark";
}

// Mark + name + full name, laid out like the QUEST, SPARK and ARGUS headers
const AppBrand: FC<AppBrandProps> = ({ variant = "light" }) => (
  <span className={`app-brand app-brand--${variant}`}>
    <img
      className="app-brand__mark"
      src={`${IMAGE_URI_PREFIX}/trace-mark.svg`}
      alt=""
    />
    <span className="app-brand__name">
      <span className="app-brand__title">TRACE</span>
      <span className="app-brand__subtitle">{TRACE_FULL_NAME}</span>
    </span>
  </span>
);

export default AppBrand;
