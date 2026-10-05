import { FC } from "react";
import { IMAGE_URI_PREFIX } from "../constants";

// Same short description as the TRACE logo
export const TRACE_TAGLINE = "Document managing, tracking and curation";

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
      <span className="app-brand__subtitle">{TRACE_TAGLINE}</span>
    </span>
  </span>
);

export default AppBrand;
