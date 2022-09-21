import { useState } from "react";
import "./App.css";

interface GenerateKeyResponse {
  crt: string;
  key: string;
  message?: string;
}

function App() {
  const [clientName, setClientName] = useState<string>("");
  const [IP, setIP] = useState<string>("");
  const [groups, setGroups] = useState<string>("");

  const [crt, setCrt] = useState<string>();
  const [key, setKey] = useState<string>();

  const [errorMessage, setErrorMessage] = useState<string>();

  const generateKey = async (
    clientName: string,
    ip: string,
    groups: string
  ) => {
    if (clientName === "" || ip === "" || groups === "") {
      setCrt("");
      setKey("");
      setErrorMessage("Invalid input");
      return;
    }
    const response = await fetch("/api/generate", {
      method: "POST",
      body: JSON.stringify({
        client_name: clientName,
        ip: ip,
        groups: groups,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });
    const generateKey: GenerateKeyResponse = await response.json();
    if (generateKey.message) {
      setErrorMessage(generateKey.message);
      return;
    }
    setCrt(generateKey.crt);
    setKey(generateKey.key);
    setErrorMessage("");
  };

  return (
    <div className="App">
      <h1>Nebula Admin Panel</h1>
      <h2>Provision a new client</h2>
      <div className="card">
        <span className="card-label">Client Name: </span>
        <input
          className="card-input"
          type="text"
          onChange={(e) => {
            setClientName(e.target.value);
          }}
        />
      </div>
      <div className="card">
        <span className="card-label">IP Address + CIDR: </span>
        <input
          className="card-input"
          type="text"
          onChange={(e) => {
            setIP(e.target.value);
          }}
        />
      </div>
      <div className="card">
        <span className="card-label">Groups (comma separated): </span>
        <input
          className="card-input"
          type="text"
          onChange={(e) => {
            setGroups(e.target.value);
          }}
        />
      </div>
      <div className="card-center">
        <button onClick={() => generateKey(clientName, IP, groups)}>
          Submit
        </button>
      </div>
      {errorMessage && <pre className="error">{errorMessage}</pre>}
      {crt && key && (
        <div>
          <span>host.crt: </span>
          <pre>{crt}</pre>
          <p></p>
          <span>host.key: </span>
          <pre>{key}</pre>
        </div>
      )}
    </div>
  );
}

export default App;
