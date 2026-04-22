import React, { FC, useState } from "react";
import { FiSettings } from "react-icons/fi";
import ProjectSettingsModal from "../ProjectSettingsModal/Index";

interface SettingsIconButtonProps {
  variant?: "dark" | "light";
  size?: "lg" | "md" | "sm";
}

// The component needs to be covered with ProjectContextProvider

const SettingsIconButton: FC<SettingsIconButtonProps> = ({ variant, size }) => {
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const iconStyle = () => {
    let style = {
      cursor: "pointer",
      color: "var(--light-color)",
      fontSize: "1.2rem",
    };
    if (variant === "dark") {
      style["color"] = "var(--primary-color)";
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
    setShowSettingsModal(true);
  };

  const handleSelf = (e: React.ChangeEvent | React.MouseEvent) => {
    // stop propogration if this icon placed inside any clickable element
    e.stopPropagation();
  };

  return (
    <div onClick={handleSelf}>
      <div className="settings-icon">
        <FiSettings style={iconStyle()} onClick={handleIconClick} />
      </div>
      <ProjectSettingsModal
        show={showSettingsModal}
        handleClose={() => setShowSettingsModal(false)}
      />
    </div>
  );
};

export default SettingsIconButton;
