import React, { FC, useState } from "react";
import { BiSolidReport } from "react-icons/bi";
import ProjectReportModal from "../ProjectReportModal";
import { querySetType } from "../../api/types";

interface ReportIconButtonProps {
  variant?: "dark" | "light" | "negative";
  size?: "lg" | "md" | "sm";
  queries: querySetType;
}

const ReportIconButton: FC<ReportIconButtonProps> = ({
  variant,
  size,
  queries,
}) => {
  const [showReportModal, setShowReportModal] = useState(false);
  const iconStyle = () => {
    let style = {
      cursor: "pointer",
      color: "var(--light-color)",
      fontSize: "1.2rem",
    };
    if (variant === "dark") {
      style["color"] = "var(--primary-color)";
    }
    if (variant === "negative") {
      style["color"] = "var(--negative-color)";
    }
    if (size === "lg") {
      style["fontSize"] = "1.5rem";
    }
    if (size === "sm") {
      style["fontSize"] = "1rem";
    }
    return style;
  };

  const handleIconClick = (e: React.MouseEvent<SVGAElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setShowReportModal(true);
  };

  const handleSelf = (e: React.MouseEvent) => {
    // stop propogration if this icon placed inside any clickable element
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div onClick={handleSelf}>
      <div>
        <BiSolidReport style={iconStyle()} onClick={handleIconClick} />
      </div>
      {showReportModal && (
        <ProjectReportModal
          show={showReportModal}
          queries={queries}
          handleClose={() => setShowReportModal(false)}
        />
      )}
    </div>
  );
};

export default ReportIconButton;
