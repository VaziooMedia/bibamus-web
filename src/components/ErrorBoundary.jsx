import React from "react";
import { COLORS } from "../constants.js";
import { reportCrash } from "../data/sharedDirectories.js";

// Capture les erreurs de rendu React (qui donneraient sinon un écran blanc silencieux),
// les transmet pour consultation côté plateforme de gestion, et affiche un écran de secours
// clair plutôt que de laisser l'app dans un état inutilisable sans explication.
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    reportCrash({
      message: error?.message,
      stack: (error?.stack || "") + "\n" + (info?.componentStack || ""),
      source: "react_render",
      screen: this.props.currentScreen || null,
      bibroCode: this.props.myBibroCode || null,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "32px 24px",
            background: COLORS.paper,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "44px", marginBottom: "16px" }}>⚠️</div>
          <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "22px", margin: "0 0 12px" }}>Un problème est survenu</h1>
          <p style={{ fontSize: "14px", color: COLORS.inkSoft, lineHeight: 1.6, marginBottom: "24px", maxWidth: "320px" }}>
            L'incident a été transmis automatiquement à notre équipe. Essayez de recharger l'app — si le problème persiste, revenez un peu plus tard.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{ background: COLORS.amber, border: "none", borderRadius: "10px", padding: "13px 28px", fontWeight: 700, fontSize: "14px", color: COLORS.paper, cursor: "pointer" }}
          >
            Recharger l'app
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Capture les erreurs qui ne passent pas par le rendu React (JS classique, promesses
// rejetées non gérées) — installé une seule fois au démarrage de l'app.
export function installGlobalCrashReporting(getContext) {
  window.addEventListener("error", (event) => {
    const ctx = getContext?.() || {};
    reportCrash({
      message: event.message,
      stack: event.error?.stack || null,
      source: "window_error",
      screen: ctx.screen || null,
      bibroCode: ctx.bibroCode || null,
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    const ctx = getContext?.() || {};
    reportCrash({
      message: event.reason?.message || String(event.reason),
      stack: event.reason?.stack || null,
      source: "unhandled_rejection",
      screen: ctx.screen || null,
      bibroCode: ctx.bibroCode || null,
    });
  });
}
