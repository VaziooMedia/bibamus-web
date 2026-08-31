import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { ErrorBoundary } from "./components/ErrorBoundary.jsx";

// Désactive la correction automatique / les suggestions de mots (la barre "Je / Tu /
// C'est" au-dessus du clavier iPhone) sur tous les champs de saisie, présents et futurs —
// plus simple et plus fiable que d'ajouter ces attributs sur chaque champ du code un par un.
function disablePredictiveText(el) {
  el.setAttribute("autocorrect", "off");
  el.setAttribute("spellcheck", "false");
}
document.querySelectorAll("input, textarea").forEach(disablePredictiveText);
new MutationObserver((mutations) => {
  mutations.forEach((m) =>
    m.addedNodes.forEach((node) => {
      if (node.nodeType !== 1) return;
      if (node.matches?.("input, textarea")) disablePredictiveText(node);
      node.querySelectorAll?.("input, textarea").forEach(disablePredictiveText);
    })
  );
}).observe(document.body, { childList: true, subtree: true });

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
