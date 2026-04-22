import { Col, Container, Row } from "react-bootstrap";
import { FiEdit2 } from "react-icons/fi";
import { userType } from "../api/types";
interface userPropsType {
    user: userType;
}
const ProfileCard = ({ user }: userPropsType) => {
    return (
        <Container className="profile-card mt-4">
            <Row>
                <Col md={9}>
                    <Container className="profile-about">
                        <FiEdit2 className="profile-edit-icon" size={"1.5em"} />
                        <h2>{user.username}</h2>
                        <h5>
                            {user.firstName} {user.lastName}
                        </h5>
                        <p className="profile-contact">{user.email}</p>
                    </Container>
                </Col>
            </Row>
        </Container>
    );
};

export default ProfileCard;
