import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";
import { ErrorBoundary } from "./components/ErrorBoundary.tsx";

const root = document.getElementById("root");
if (!root) throw new Error("Elemento principal da aplicação não encontrado");

createRoot(root).render(
  <HelmetProvider>
    <ErrorBoundary><App /></ErrorBoundary>
  </HelmetProvider>
);
