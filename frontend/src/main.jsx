import { createRoot } from "react-dom/client";

const root = document.getElementById("root");

createRoot(root).render(
  <div
    style={{
      padding: "40px",
      fontFamily: "Arial, sans-serif",
    }}
  >
    <h1>EduSphere</h1>
    <p>React is running successfully.</p>
  </div>,
);