import { useEffect, useState } from "react";
import axios from "axios";

function App() {
  const [message, setMessage] = useState("Loading...");

  useEffect(() => {
    axios.get("http://127.0.0.1:8000/api/hello/")
      .then(res => setMessage(res.data.message))
      .catch(err => setMessage("Error connecting to Django 😢"));
  }, []);

  return (
    <div style={{ textAlign: "center", marginTop: "3rem" }}>
      <h1>{message}</h1>
    </div>
  );
}

export default App;
