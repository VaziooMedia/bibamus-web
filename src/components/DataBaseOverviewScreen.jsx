import React from "react";
import { PageTitle } from "./PageTitle.jsx";

const TILES = [
  { key: "venues", label: "Établissements" },
  { key: "drinks", label: "Produits" },
  { key: "brands", label: "Marques" },
  { key: "breweries", label: "Producteurs" },
];

export function DataBaseOverviewScreen({ onNavigate, supabaseUrl }) {
  return (
    <div>
      <PageTitle>DataBase</PageTitle>
      <div style={{ height: "20px" }} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "28px" }}>
        {TILES.map((t) => (
          <button
            key={t.key}
            onClick={() => onNavigate(t.key)}
            style={{
              textAlign: "left",
              background: "#16273D",
              border: "2px solid #28405C",
              borderRadius: "12px",
              padding: "20px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <span style={{ width: "4px", height: "20px", background: "#39FF66", borderRadius: "2px", display: "inline-block", flexShrink: 0 }} />
            <span style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 700, fontSize: "16px", color: "#F2F2E8" }}>{t.label}</span>
          </button>
        ))}
      </div>

      {supabaseUrl && (
        <a
          href={supabaseUrl}
          target="_blank"
          rel="noreferrer"
          style={{
            display: "inline-flex",
            alignItems: "center",
            background: "#FF9500",
            borderRadius: "10px",
            padding: "12px 22px",
            textDecoration: "none",
          }}
        >
          <span style={{ color: "#fff", fontSize: "14px", fontWeight: 800 }}>Supabase</span>
        </a>
      )}
    </div>
  );
}
