import { useRef, useState } from "react";
import { Button, Overlay, Tooltip } from "react-bootstrap";
import { AiFillCopy } from "react-icons/ai";
import { copyToClipboard } from "../api/utility";

interface copyToClipboardProps {
  text: string;
}

const CopyToClipboard = ({ text }: copyToClipboardProps) => {
  const [show, setShow] = useState(false);
  const target = useRef(null);

  const handleCopy = () => {
    copyToClipboard(text)
      .then(() => {
        setShow(true);
        setTimeout(() => setShow(false), 2000);
      })
      .catch((e) => alert("Failed To Copy!"));
  };

  return (
    <>
      <Overlay target={target.current} show={show} placement="top">
        {(props) => <Tooltip {...props}>Copied To Clipboard!</Tooltip>}
      </Overlay>
      <Button className="c-btn-text" ref={target} onClick={handleCopy}>
        <AiFillCopy className="cp" />
      </Button>
    </>
  );
};

export default CopyToClipboard;
