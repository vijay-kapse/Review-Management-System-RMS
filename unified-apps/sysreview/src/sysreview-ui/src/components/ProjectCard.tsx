import { Link } from "react-router-dom";
import { CategorySymbol } from "./CategoryLabel";
import ReportIconButton from "./IconButtons/ReportIconButton";
import { categorySetType, projectType, querySetType } from "../api/types";
import { FC } from "react";
import { FaTasks } from "react-icons/fa";
import { FiArrowUpRight, FiLayers } from "react-icons/fi";
import { MdOutlineManageSearch } from "react-icons/md";
import { APP_URI_PREFIX } from "../constants";

interface ProjectCardProps {
  project: projectType;
  categories: categorySetType;
  queries: querySetType;
  accentIndex?: number;
}
const ProjectCard: FC<ProjectCardProps> = ({
  project,
  categories,
  queries,
  accentIndex = 0,
}) => {
  const { projectId, projectName, description, collections } = project;
  const categoryList = Object.values(categories).sort(
    (a, b) => a.priority - b.priority,
  );
  const visibleCategories = categoryList.slice(0, 4);
  const hiddenCategoryCount = categoryList.length - visibleCategories.length;
  const queryCount = Object.keys(queries).length;
  const accentClass = `project-card--accent-${accentIndex % 4}`;

  return (
    <article className={`project-card ${accentClass}`}>
      <div className="project-card__topline">
        <span className="project-card__status">Ready</span>
        <span className="project-card__id">Project #{projectId}</span>
      </div>

      <div className="project-card__body">
        <h3>{projectName}</h3>
        <p>
          {description
            ? description.length > 150
              ? `${description.slice(0, 150)}...`
              : description
            : "No description yet."}
        </p>
      </div>

      <div
        className="project-card__metrics"
        aria-label={`${projectName} summary`}
      >
        <div>
          <FaTasks />
          <span>{queryCount}</span>
          <small>Queries</small>
        </div>
        <div>
          <FiLayers />
          <span>{categoryList.length}</span>
          <small>Categories</small>
        </div>
        <div>
          <FiLayers />
          <span>{collections?.length || 0}</span>
          <small>Collections</small>
        </div>
      </div>

      <div className="project-category-strip">
        {visibleCategories.length > 0 ? (
          <>
            {visibleCategories.map((cat) => (
              <span className="project-category-pill" key={cat.categoryId}>
                <CategorySymbol color={cat.color} size="0.55rem" />
                {cat.label}
              </span>
            ))}
            {hiddenCategoryCount > 0 && (
              <span className="project-category-pill project-category-pill--muted">
                +{hiddenCategoryCount}
              </span>
            )}
          </>
        ) : (
          <span className="project-card__muted">No categories</span>
        )}
      </div>

      <div className="project-card__actions">
        <Link
          to={`${APP_URI_PREFIX}/project/?id=${projectId}`}
          className="project-action project-action--primary"
        >
          Open
          <FiArrowUpRight />
        </Link>
        <Link
          to={`${APP_URI_PREFIX}/project/curate/?id=${projectId}`}
          className="project-action project-action--secondary"
        >
          <MdOutlineManageSearch />
          Curate
        </Link>
        <div className="project-report-action" title="Project report">
          <ReportIconButton variant="dark" size="md" queries={queries} />
        </div>
      </div>
    </article>
  );
};

export default ProjectCard;
