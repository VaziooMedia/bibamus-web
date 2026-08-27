import React, { useState, useEffect } from "react";
import { loadBreweriesDirectory, loadBrandsDirectory } from "../data/sharedDirectories.js";
import { DataTable, StatusBadge } from "./DataTable.jsx";
import { BreweryDetailPanel } from "./BreweryDetailPanel.jsx";
import { BrandDetailPanel } from "./BrandDetailPanel.jsx";
import { StatsCounterBar } from "./StatsCounterBar.jsx";
import { PageTitle } from "./PageTitle.jsx";
import { COUNTRIES, PRODUCER_TYPES, BRAND_CLASSIFICATIONS } from "../constants.js";

// Les données stockent désormais des codes techniques — les tableaux doivent résoudre le
// libellé français pour l'affichage.
const labelFromList = (list) => {
  const map = {};
  list.forEach((o) => (map[o.code] = o.fr));
  return (code) => map[code] || code || "—";
};
const countryLabel = labelFromList(COUNTRIES);
const producerTypeLabel = labelFromList(PRODUCER_TYPES);
const classificationLabel = labelFromList(BRAND_CLASSIFICATIONS);

const breweryColumns = [
  { key: "name", label: "Nom" },
  { key: "city", label: "Ville" },
  { key: "country", label: "Pays", render: (b) => countryLabel(b.country) },
  { key: "phone", label: "Téléphone" },
  { key: "producerTypes", label: "Type", render: (b) => (b.producerTypes || []).map(producerTypeLabel).join(", ") },
  { key: "status", label: "Statut", render: (b) => <StatusBadge status={b.status} /> },
];

const brandColumns = [
  { key: "name", label: "Nom" },
  { key: "classification", label: "Classification", render: (b) => classificationLabel(b.classification) },
  { key: "originCountry", label: "Origine", render: (b) => countryLabel(b.originCountry) },
  { key: "foundedYear", label: "Créée en" },
  { key: "status", label: "Statut", render: (b) => <StatusBadge status={b.status} /> },
];

export function BreweriesScreen() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [creating, setCreating] = useState(false);

  const refresh = async () => {
    setLoading(true);
    setItems(await loadBreweriesDirectory());
    setLoading(false);
  };

  useEffect(() => {
    refresh();
  }, []);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <PageTitle>Producteurs</PageTitle>
        <button onClick={refresh} style={{ background: "none", border: "2px solid #28405C", borderRadius: "8px", padding: "8px 14px", color: "#F2F2E8", cursor: "pointer", fontSize: "13px" }}>
          ⟳ Rafraîchir
        </button>
      </div>
      {loading ? (
        <p style={{ color: "#8792A6" }}>Chargement...</p>
      ) : (
        <>
          <StatsCounterBar items={items} showOwnerManaged />
          <DataTable
            items={items}
            allColumns={breweryColumns}
            forcedKeys={["name", "status"]}
            defaultVisibleKeys={["name", "city", "country", "status"]}
            onRowClick={setSelected}
            onAdd={() => setCreating(true)}
            searchPlaceholder="Rechercher un producteur..."
          />
        </>
      )}
      {(selected || creating) && (
        <BreweryDetailPanel
          brewery={selected}
          onClose={() => {
            setSelected(null);
            setCreating(false);
          }}
          onSaved={(updated) => {
            const wasCreating = creating;
            setSelected(null);
            setCreating(false);
            if (updated) setItems((prev) => (wasCreating ? [...prev, updated] : prev.map((i) => (i.id === updated.id ? updated : i))));
            else setItems((prev) => prev.filter((i) => i.id !== selected.id));
          }}
        />
      )}
    </div>
  );
}

export function BrandsScreen() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [creating, setCreating] = useState(false);

  const refresh = async () => {
    setLoading(true);
    setItems(await loadBrandsDirectory());
    setLoading(false);
  };

  useEffect(() => {
    refresh();
  }, []);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <PageTitle>Marques</PageTitle>
        <button onClick={refresh} style={{ background: "none", border: "2px solid #28405C", borderRadius: "8px", padding: "8px 14px", color: "#F2F2E8", cursor: "pointer", fontSize: "13px" }}>
          ⟳ Rafraîchir
        </button>
      </div>
      {loading ? (
        <p style={{ color: "#8792A6" }}>Chargement...</p>
      ) : (
        <>
          <StatsCounterBar items={items} showOwnerManaged />
          <DataTable
            items={items}
            allColumns={brandColumns}
            forcedKeys={["name", "status"]}
            defaultVisibleKeys={["name", "classification", "originCountry", "status"]}
            onRowClick={setSelected}
            onAdd={() => setCreating(true)}
            searchPlaceholder="Rechercher une marque..."
          />
        </>
      )}
      {(selected || creating) && (
        <BrandDetailPanel
          brand={selected}
          onClose={() => {
            setSelected(null);
            setCreating(false);
          }}
          onSaved={(updated) => {
            const wasCreating = creating;
            setSelected(null);
            setCreating(false);
            if (updated) setItems((prev) => (wasCreating ? [...prev, updated] : prev.map((i) => (i.id === updated.id ? updated : i))));
            else setItems((prev) => prev.filter((i) => i.id !== selected.id));
          }}
        />
      )}
    </div>
  );
}
