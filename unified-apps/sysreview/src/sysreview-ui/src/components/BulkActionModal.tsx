import { FC, useState } from "react";
import {
  Alert,
  Button,
  Col,
  Dropdown,
  Form,
  Modal,
  Row,
} from "react-bootstrap";
import { categorySetType, categoryType, resultType } from "../api/types";
import { CategorySymbol } from "./CategoryLabel";
import { getCategoryColor } from "../api/utility";
import { FiExternalLink } from "react-icons/fi";
import { IoCloseSharp } from "react-icons/io5";
import { BsFillInfoCircleFill } from "react-icons/bs";

interface BulkActionModalProps {
  show: boolean;
  results: resultType[];
  analyse: (rowData: resultType[]) => void;
  categories: categorySetType;
  handleClose: () => void;
  updateCategory: (
    resIds: number[],
    priority: number,
    rows?: resultType[]
  ) => void;
}

const BulkActionModal: FC<BulkActionModalProps> = ({
  show,
  results,
  analyse,
  handleClose,
  categories,
  updateCategory,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<categoryType | null>(
    null
  );
  const categoriesByPriority = Object.entries(categories).filter(
    ([, category], index, allCategories) =>
      allCategories.findIndex(
        ([, cat]) => cat.priority === category.priority
      ) === index
  );

  const handleUpdateCategory = (val: string) => {
    console.log(val);
    const catId = parseInt(val || "0");
    if (!catId) return;
    setSelectedCategory(categories[catId]);
    updateCategory(
      results.map((res) => res.resultId),
      categories[catId].priority,
      results
    );
  };

  const modalBody = () => {
    if (results.length === 0) {
      return (
        <Alert className="c-alert-info">
          <BsFillInfoCircleFill /> Select atleast 1 row to perform bulk action
        </Alert>
      );
    }
    return (
      <Form>
        <Form.Group as={Row} className="mb-3">
          <Col>
            <h5>Update Category</h5>
            <Dropdown onSelect={(val) => handleUpdateCategory(val as string)}>
              <Dropdown.Toggle variant="secondary">
                <CategorySymbol
                  color={getCategoryColor(
                    categories,
                    selectedCategory?.priority || 0
                  )}
                />{" "}
                <span>{selectedCategory?.label || "Select a category"}</span>
              </Dropdown.Toggle>

              <Dropdown.Menu variant="dark">
                {categoriesByPriority.map(([catId, cat], i) => (
                  <Dropdown.Item key={i} eventKey={catId}>
                    <CategorySymbol color={cat.color} /> {cat.label}
                  </Dropdown.Item>
                ))}
              </Dropdown.Menu>
            </Dropdown>
          </Col>
        </Form.Group>
        <Row className="mb-3">
          <Col>
            <h5>Go to Analyser</h5>
            <Button className="c-btn-primary" onClick={() => analyse(results)}>
              Analyse{" "}
              <span>
                <FiExternalLink />
              </span>
            </Button>
          </Col>
        </Row>
      </Form>
    );
  };

  return (
    <Modal
      show={show}
      onHide={handleClose}
      size="xl"
      centered
      className="c-modal"
    >
      <Modal.Header>
        <Modal.Title>
          <Row>
            <Col>Bulk Action</Col>
            <h6>Selected Rows:{Object.values(results).length}</h6>
          </Row>
        </Modal.Title>
        <IoCloseSharp className="cp" size={"1.5rem"} onClick={handleClose} />
      </Modal.Header>
      <Modal.Body>{modalBody()}</Modal.Body>
      <Modal.Footer>
        <Button className="c-btn-negative" onClick={handleClose}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default BulkActionModal;
