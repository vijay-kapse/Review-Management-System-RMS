import { useContext } from "react";
import { Container } from "react-bootstrap";
import PreferencesCard from "../components/PreferencesCard";
import ProfileCard from "../components/ProfileCard";
import AppContext from "../contexts/AppContext";

const Profile = () => {
  const { user } = useContext(AppContext);

  return (
    <Container className="profile-page">
      {user && <ProfileCard user={user} />}
      <PreferencesCard />
    </Container>
  );
};

export default Profile;
