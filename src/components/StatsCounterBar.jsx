import React from "react";

function Stat({ label, value }) {
  return (
    <div style={{ background: "#16273D", borderRadius: "10px", padding: "14px 16px", flex: 1, minWidth: "110px", textAlign: "center" }}>
      <div style={{ fontSize: "11.5px", color: "#8792A6", marginBottom: "4px" }}>{label}</div>
      <div style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "26px", color: "#39FF66" }}>{value}</div>
    </div>
  );
}

// items: tableau d'objets avec au moins { status, ownerManaged? } — utilisé pour les petits
// répertoires (établissements, marques, producteurs).
// counts: { total, certified, reviewed, pending, ownerManaged } déjà calculés côté serveur —
// utilisé pour les répertoires trop volumineux pour être chargés entièrement (produits).
export function StatsCounterBar({ items, counts, showOwnerManaged = false }) {
  const total = counts ? counts.total : items.length;
  const certified = counts ? counts.certified : items.filter((i) => i.status === "certified").length;
  const reviewed = counts ? counts.reviewed : items.filter((i) => i.status === "reviewed").length;
  const pending = counts ? counts.pending : items.filter((i) => !i.status || i.status === "pending").length;
  const ownerManaged = counts ? counts.ownerManaged : items.filter((i) => i.ownerManaged).length;

  return (
    <div style={{ display: "flex", gap: "12px", marginBottom: "24px", flexWrap: "wrap" }}>
      <Stat label="Total" value={total} />
      <Stat label="Certifiés" value={certified} />
      <Stat label="Non certifiés" value={reviewed} />
      <Stat label="À vérifier" value={pending} />
      {showOwnerManaged && <Stat label="Business" value={ownerManaged} />}
    </div>
  );
}
