import React, { useState, useEffect } from "react";
import { loadPublicVenues, loadDrinksDirectory, loadBreweriesDirectory, loadBrandsDirectory } from "../data/sharedDirectories.js";
import { PageTitle } from "./PageTitle.jsx";

function breakdown(items) {
  return {
    total: items.length,
    certified: items.filter((i) => i.status === "certified").length,
    reviewed: items.filter((i) => i.status === "reviewed").length,
    pending: items.filter((i) => !i.status || i.status === "pending").length,
    ownerManaged: items.filter((i) => i.ownerManaged).length,
  };
}

function StatCard({ label, data }) {
  return (
    <div style={{ background: "#16273D", borderRadius: "12px", padding: "20px", flex: 1, textAlign: "center" }}>
      <div style={{ fontSize: "13px", color: "#8792A6", marginBottom: "6px" }}>{label}</div>
      <div style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "36px", color: "#39FF66" }}>{data.total}</div>
      <div style={{ borderBottom: "1px solid #F2F2E8", opacity: 0.25, margin: "12px 0" }} />
      <div style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "12px", textAlign: "left" }}>
        <div>
          Certifié : <span style={{ color: "#39FF66", fontWeight: 700 }}>{data.certified}</span>
        </div>
        <div>
          Non certifié : <span style={{ color: "#FF3B4E", fontWeight: 700 }}>{data.reviewed}</span>
        </div>
        <div>
          À vérifier : <span style={{ color: "#00C8FF", fontWeight: 700 }}>{data.pending}</span>
        </div>
        <div>
          Business : <span style={{ color: "#F2F2E8", fontWeight: 700 }}>{data.ownerManaged}</span>
        </div>
      </div>
    </div>
  );
}

export function Dashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    (async () => {
      const [venues, drinks, breweries, brands] = await Promise.all([
        loadPublicVenues(),
        loadDrinksDirectory(),
        loadBreweriesDirectory(),
        loadBrandsDirectory(),
      ]);
      setStats({
        venues: breakdown(venues),
        drinks: breakdown(drinks),
        breweries: breakdown(breweries),
        brands: breakdown(brands),
      });
    })();
  }, []);

  if (!stats) return <p style={{ color: "#8792A6" }}>Chargement...</p>;

  return (
    <div>
      <PageTitle>Tableau de bord</PageTitle>
      <div style={{ height: "20px" }} />
      <div style={{ border: "2px solid #39FF66", borderRadius: "16px", padding: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "18px" }}>
          <span style={{ width: "4px", height: "18px", background: "#39FF66", borderRadius: "2px", display: "inline-block" }} />
          <h2 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "18px", margin: 0 }}>Data base</h2>
        </div>
        <div style={{ display: "flex", gap: "16px" }}>
          <StatCard label="Établissements" data={stats.venues} />
          <StatCard label="Produits" data={stats.drinks} />
          <StatCard label="Producteurs" data={stats.breweries} />
          <StatCard label="Marques" data={stats.brands} />
        </div>
      </div>
    </div>
  );
}
