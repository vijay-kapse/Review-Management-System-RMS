import { FC } from "react";
import { Button } from "react-bootstrap";

interface ProjectSettingsActionButtonsProps {
  // cancel: () => void;
  update: () => void;
}

const ProjectSettingsActionButtons: FC<ProjectSettingsActionButtonsProps> = ({
  // cancel,
  update,
}) => {
  return (
    <div className="d-flex gap-2">
      <Button
        type="button"
        className="workspace-primary-action"
        onClick={update}
      >
        Save changes
      </Button>
    </div>
  );
};

export default ProjectSettingsActionButtons;
