import React from "react";

export function PageTitle({ children }) {
  return (
    <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "26px", margin: 0, display: "flex", alignItems: "center", gap: "10px" }}>
      <span style={{ width: "4px", height: "22px", background: "#39FF66", borderRadius: "2px", display: "inline-block", flexShrink: 0 }} />
      {children}
    </h1>
  );
}
