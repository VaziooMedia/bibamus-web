import React, { useState, useEffect } from "react";
import { loadPublicVenues } from "../data/sharedDirectories.js";
import { DataTable, StatusBadge } from "./DataTable.jsx";
import { VenueDetailPanel } from "./VenueDetailPanel.jsx";
import { StatsCounterBar } from "./StatsCounterBar.jsx";
import { PageTitle } from "./PageTitle.jsx";
import { COUNTRIES } from "../constants.js";

// Les données stockent désormais des codes techniques (ex. "belgique") — le tableau doit
// résoudre le libellé français pour l'affichage.
const countryMap = {};
COUNTRIES.forEach((c) => (countryMap[c.code] = c.fr));
const countryLabel = (code) => countryMap[code] || code || "—";

const allColumns = [
  { key: "name", label: "Nom" },
  { key: "city", label: "Ville" },
  { key: "country", label: "Pays", render: (v) => countryLabel(v.country) },
  { key: "phone", label: "Téléphone" },
  { key: "email", label: "Email" },
  { key: "website", label: "Site web" },
  { key: "status", label: "Statut", render: (v) => <StatusBadge status={v.status} /> },
];

export function VenuesScreen() {
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [creating, setCreating] = useState(false);

  const refresh = async () => {
    setLoading(true);
    setVenues(await loadPublicVenues());
    setLoading(false);
  };

  useEffect(() => {
    refresh();
  }, []);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <PageTitle>Établissements</PageTitle>
        <button onClick={refresh} style={{ background: "none", border: "2px solid #28405C", borderRadius: "8px", padding: "8px 14px", color: "#F2F2E8", cursor: "pointer", fontSize: "13px" }}>
          ⟳ Rafraîchir
        </button>
      </div>
      {loading ? (
        <p style={{ color: "#8792A6" }}>Chargement...</p>
      ) : (
        <>
          <StatsCounterBar items={venues} showOwnerManaged />
          <DataTable
            items={venues}
            allColumns={allColumns}
            forcedKeys={["name", "status"]}
            defaultVisibleKeys={["name", "city", "country", "phone", "status"]}
            onRowClick={setSelected}
            onAdd={() => setCreating(true)}
            searchPlaceholder="Rechercher un établissement, une ville..."
          />
        </>
      )}
      {(selected || creating) && (
        <VenueDetailPanel
          venue={selected}
          onManageMenu={() => alert("La gestion de la carte boissons depuis cette plateforme arrive prochainement — utilisable pour l'instant depuis l'app elle-même.")}
          onClose={() => {
            setSelected(null);
            setCreating(false);
          }}
          onSaved={(updated) => {
            const wasCreating = creating;
            setSelected(null);
            setCreating(false);
            if (updated) setVenues((prev) => (wasCreating ? [...prev, updated] : prev.map((v) => (v.id === updated.id ? updated : v))));
            else setVenues((prev) => prev.filter((v) => v.id !== selected.id));
          }}
        />
      )}
    </div>
  );
}
