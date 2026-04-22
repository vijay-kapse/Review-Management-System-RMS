import { Card, Container } from "react-bootstrap";
import { FiEdit2 } from "react-icons/fi";

const PreferencesCard = () => {
    return (
        <Container className="mt-4">
            <h3>Preferences</h3>
            <Card className="mt-4">
                <Card.Header>
                    Labels{" "}
                    <FiEdit2 className="profile-edit-icon" size={"1.5em"} />
                </Card.Header>
                <Card.Body>
                    <Card.Title>Special title treatment</Card.Title>
                    <Card.Text>
                        With supporting text below as a natural lead-in to
                        additional content.
                    </Card.Text>
                </Card.Body>
            </Card>
        </Container>
    );
};

export default PreferencesCard;
