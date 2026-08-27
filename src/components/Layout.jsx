import React, { useState } from "react";
import { TopBar } from "./TopBar.jsx";

const TOP_ITEMS = [
  { key: "chat", label: "Chat" },
];

const DATABASE_ITEMS = [
  { key: "venues", label: "Établissements" },
  { key: "drinks", label: "Produits" },
  { key: "brands", label: "Marques" },
  { key: "breweries", label: "Producteurs" },
];

const BOTTOM_ITEMS = [
  { key: "stats", label: "Statistiques" },
  { key: "finances", label: "Finances" },
  { key: "notifications", label: "Notifications" },
  { key: "admins", label: "Administrateurs" },
  { key: "settings", label: "Paramètres" },
];

function NavButton({ item, current, onNavigate, indent }) {
  const active = current === item.key;
  return (
    <button
      key={item.key}
      onClick={() => onNavigate(item.key)}
      style={{
        textAlign: "left",
        background: active ? "#28405C" : "none",
        border: "none",
        borderLeft: active ? "3px solid #39FF66" : "3px solid transparent",
        padding: indent ? "10px 20px 10px 20px" : "12px 20px",
        fontSize: indent ? "13px" : "14px",
        fontWeight: active ? 700 : 500,
        color: active ? "#39FF66" : "#F2F2E8",
        cursor: "pointer",
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: "10px",
      }}
    >
      <span
        style={
          indent
            ? { color: "#39FF66", fontWeight: 800, fontSize: "13px", flexShrink: 0 }
            : { width: "4px", height: "16px", background: "#39FF66", borderRadius: "2px", display: "inline-block", flexShrink: 0 }
        }
      >
        {indent ? "–" : ""}
      </span>
      {item.label}
    </button>
  );
}

export function Layout({ current, onNavigate, children }) {
  const isDatabaseScreen = DATABASE_ITEMS.some((i) => i.key === current) || current === "database";
  const [databaseOpen, setDatabaseOpen] = useState(isDatabaseScreen);

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <div style={{ width: "220px", flexShrink: 0, background: "#16273D", padding: "24px 0", display: "flex", flexDirection: "column" }}>
        <button
          onClick={() => onNavigate("dashboard")}
          style={{ background: "none", border: "none", cursor: "pointer", padding: "0 20px 28px 20px", textAlign: "left" }}
        >
          <img src="/bibamus-logo.svg" alt="Bibamus" style={{ height: "26px", display: "block" }} />
          <div style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "13px", color: "#39FF66", letterSpacing: "1px", marginTop: "4px" }}>
            Management
          </div>
        </button>

        <NavButton item={{ key: "dashboard", label: "Tableau de bord" }} current={current} onNavigate={onNavigate} />
        {TOP_ITEMS.map((item) => (
          <NavButton key={item.key} item={item} current={current} onNavigate={onNavigate} />
        ))}

        <button
          onClick={() => {
            onNavigate("database");
            setDatabaseOpen(true);
          }}
          style={{
            textAlign: "left",
            background: isDatabaseScreen ? "#28405C" : "none",
            border: "none",
            borderLeft: isDatabaseScreen ? "3px solid #39FF66" : "3px solid transparent",
            padding: "12px 20px",
            fontSize: "14px",
            fontWeight: isDatabaseScreen ? 700 : 500,
            color: isDatabaseScreen ? "#39FF66" : "#F2F2E8",
            cursor: "pointer",
            width: "100%",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ width: "4px", height: "16px", background: "#39FF66", borderRadius: "2px", display: "inline-block", flexShrink: 0 }} />
            DataBase
          </span>
          <span
            onClick={(e) => {
              e.stopPropagation();
              setDatabaseOpen((o) => !o);
            }}
            style={{ fontSize: "11px", color: "#39FF66", padding: "4px", display: "inline-block" }}
          >
            {databaseOpen ? "▼" : "▶"}
          </span>
        </button>
        {databaseOpen && (
          <div style={{ paddingLeft: "14px" }}>
            {DATABASE_ITEMS.map((item) => (
              <NavButton key={item.key} item={item} current={current} onNavigate={onNavigate} indent />
            ))}
          </div>
        )}

        {BOTTOM_ITEMS.map((item) => (
          <NavButton key={item.key} item={item} current={current} onNavigate={onNavigate} />
        ))}

        <div style={{ flex: 1 }} />
        <div style={{ padding: "16px 20px 0 20px", fontSize: "11px", color: "#8792A6" }}>VaziooMedia - 2026</div>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <TopBar />
        <div style={{ flex: 1, padding: "32px 40px", overflowY: "auto" }}>{children}</div>
      </div>
    </div>
  );
}
