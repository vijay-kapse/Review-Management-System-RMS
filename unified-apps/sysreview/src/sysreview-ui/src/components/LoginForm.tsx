import React, { useState } from "react";
import { Button, Form, InputGroup } from "react-bootstrap";
import { loginUser } from "../api/user";
import { FaRegUser } from "react-icons/fa";
import { IoKeyOutline } from "react-icons/io5";

interface loginFormPropsType {
  toggleTab: () => void;
  success: () => void;
}

const LoginForm = ({ toggleTab, success }: loginFormPropsType) => {
  const [username, setUsername] = useState("");
  const [pass, setPass] = useState("");

  const handleSubmit = (e: React.MouseEvent) => {
    e.preventDefault();
    loginUser({ username: username, password: pass })
      .then((_) => success())
      .catch((e) => alert(e));
  };

  return (
    <>
      <h2>LOGIN</h2>
      <Form className="login-form">
        <Form.Label>Username</Form.Label>
        <InputGroup className="mb-3 rounded-3">
          <InputGroup.Text>
            <FaRegUser />
          </InputGroup.Text>
          <Form.Control
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            type="text"
            placeholder="John Doe"
          />
        </InputGroup>
        <Form.Group className="mb-3">
          <Form.Label>Password</Form.Label>
          <InputGroup className="mb-3 rounded-3">
            <InputGroup.Text>
              <IoKeyOutline />
            </InputGroup.Text>
            <Form.Control
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              type="password"
              placeholder="********"
              id="password"
            />
          </InputGroup>
        </Form.Group>
        {/* <div className="d-flex justify-content-end">
          <Button className="c-btn-text">Forgot password?</Button>
        </div> */}
        <div className="d-flex my-4">
          <Button
            className="c-btn-secondary py-2 w-100 fs-4"
            type="submit"
            onClick={handleSubmit}
          >
            Log In
          </Button>
        </div>
      </Form>
      <div className="mt-4 d-flex justify-content-center gap-2">
        Don't have an account?
        <Button className="c-btn-text" onClick={toggleTab}>
          Register here.
        </Button>
      </div>
    </>
  );
};

export default LoginForm;
