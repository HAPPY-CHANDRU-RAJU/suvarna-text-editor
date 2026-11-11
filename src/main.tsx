import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { DOCUMENT_CSS } from "./lib/export/print";
import "./index.css";

// Shared document typography (also used for printing and HTML export).
const documentStyles = document.createElement("style");
documentStyles.textContent = DOCUMENT_CSS;
document.head.prepend(documentStyles);

createRoot(document.getElementById("root")!).render(<App />);
