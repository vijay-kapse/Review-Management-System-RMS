import React, { useState } from "react";
import { Button, Form, InputGroup } from "react-bootstrap";
import { registerUser } from "../api/user";
import { FaRegUser } from "react-icons/fa";
import { IoKeyOutline, IoMailOutline } from "react-icons/io5";

interface registerFormPropsType {
  toggleTab: () => void;
  success: () => void;
}

const RegisterForm = ({ toggleTab, success }: registerFormPropsType) => {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [name, setName] = useState("");

  const handleSubmit = (e: React.MouseEvent) => {
    e.preventDefault();
    registerUser({
      email,
      password: pass,
      username: name,
      firstName: "",
      lastName: "",
    })
      .then((res) => success())
      .catch((e) => alert(e));
  };

  return (
    <>
      <h2>SIGN UP</h2>
      <Form className="register-form">
        <Form.Label>Username</Form.Label>
        <InputGroup className="mb-3 rounded-3">
          <InputGroup.Text>
            <FaRegUser />
          </InputGroup.Text>
          <Form.Control
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="John Doe"
            id="name"
          />
        </InputGroup>
        <Form.Group className="mb-3">
          <Form.Label>Email</Form.Label>
          <InputGroup className="mb-3 rounded-3">
            <InputGroup.Text>
              <IoMailOutline />
            </InputGroup.Text>
            <Form.Control
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder="youremail@gmail.com"
              id="email"
            />
          </InputGroup>
        </Form.Group>
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
        <div className="d-flex my-4">
          <Button
            className="c-btn-secondary py-2 w-100 fs-4"
            type="submit"
            onClick={handleSubmit}
          >
            Sign Up
          </Button>
        </div>
      </Form>
      <div className="mt-4 d-flex justify-content-center gap-2">
        Already have an account?
        <Button className="c-btn-text" onClick={toggleTab}>
          Login here.
        </Button>
      </div>
    </>
  );
};

export default RegisterForm;
