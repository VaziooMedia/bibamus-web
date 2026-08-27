import React, { useState, useEffect, useCallback } from "react";
import { loadDrinksPage, countDrinks, countDrinksByType } from "../data/sharedDirectories.js";
import { ServerDataTable } from "./ServerDataTable.jsx";
import { StatusBadge } from "./DataTable.jsx";
import { DrinkDetailPanel, DRINK_TYPES, BEER_CIDER_SUBTYPES } from "./DrinkDetailPanel.jsx";
import { StatsCounterBar } from "./StatsCounterBar.jsx";
import { ProductCategoryBar } from "./ProductCategoryBar.jsx";
import { PageTitle } from "./PageTitle.jsx";
import { COUNTRIES } from "../constants.js";
import { BEER_CIDER_COMMERCIAL_STATUSES } from "../data/beerCiderStyles.js";

// Les données stockent désormais des codes techniques (ex. "bieres_cidres") — le tableau doit
// résoudre le libellé français pour l'affichage, la fiche détaillée s'en charge déjà elle-même.
const labelFromList = (list) => {
  const map = {};
  list.forEach((o) => (map[o.code] = o.fr));
  return (code) => map[code] || code || "—";
};
const typeLabel = labelFromList(DRINK_TYPES);
const subtypeLabel = labelFromList(BEER_CIDER_SUBTYPES);
const countryLabel = labelFromList(COUNTRIES);
const productStatusLabel = labelFromList(BEER_CIDER_COMMERCIAL_STATUSES);

const allColumns = [
  { key: "name", label: "Nom" },
  { key: "type", label: "Type", render: (d) => typeLabel(d.type) },
  { key: "beverageSubtype", label: "Bière/Cidre", render: (d) => subtypeLabel(d.beverageSubtype) },
  { key: "brandName", label: "Marque" },
  { key: "nationality", label: "Origine", render: (d) => countryLabel(d.nationality) },
  { key: "abv", label: "Degré", render: (d) => (d.abv != null ? `${d.abv}%` : "—") },
  { key: "kcalPer100ml", label: "Kcal/100ml" },
  { key: "productStatus", label: "Statut produit", render: (d) => productStatusLabel(d.productStatus) },
  { key: "status", label: "Statut", render: (d) => <StatusBadge status={d.status} /> },
];

export function DrinksScreen() {
  const [selected, setSelected] = useState(null);
  const [creating, setCreating] = useState(false);
  const [selectedType, setSelectedType] = useState(null);
  const [statCounts, setStatCounts] = useState(null);
  const [categoryCounts, setCategoryCounts] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Les statistiques (total/certifiés/etc.) et la répartition par catégorie utilisent de
  // simples comptages côté serveur — jamais un chargement complet du répertoire, qui pourrait
  // représenter des dizaines ou centaines de milliers de lignes.
  const refreshCounts = useCallback(async () => {
    const [total, certified, reviewed, pending, byType] = await Promise.all([
      countDrinks({ type: selectedType === "__other__" ? "__other__" : selectedType }),
      countDrinks({ type: selectedType === "__other__" ? "__other__" : selectedType, status: "certified" }),
      countDrinks({ type: selectedType === "__other__" ? "__other__" : selectedType, status: "reviewed" }),
      countDrinks({ type: selectedType === "__other__" ? "__other__" : selectedType, status: "pending" }),
      countDrinksByType(),
    ]);
    setStatCounts({ total, certified, reviewed, pending });
    setCategoryCounts(byType);
  }, [selectedType]);

  useEffect(() => {
    refreshCounts();
  }, [refreshCounts, refreshKey]);

  const fetchPage = useCallback(
    (params) => loadDrinksPage({ ...params, type: selectedType === "__other__" ? "__other__" : selectedType }),
    [selectedType]
  );

  const triggerRefresh = () => setRefreshKey((k) => k + 1);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <PageTitle>Produits</PageTitle>
        <button onClick={triggerRefresh} style={{ background: "none", border: "2px solid #28405C", borderRadius: "8px", padding: "8px 14px", color: "#F2F2E8", cursor: "pointer", fontSize: "13px" }}>
          ⟳ Rafraîchir
        </button>
      </div>

      {statCounts ? <StatsCounterBar counts={statCounts} /> : <p style={{ color: "#8792A6" }}>Chargement des statistiques...</p>}
      <div style={{ borderBottom: "2px solid #39FF66", margin: "0 0 24px 0" }} />
      <ProductCategoryBar counts={categoryCounts} selectedType={selectedType} onSelect={setSelectedType} />

      <ServerDataTable
        allColumns={allColumns}
        forcedKeys={["name", "status"]}
        defaultVisibleKeys={["name", "type", "beverageSubtype", "brandName", "abv", "status"]}
        fetchPage={fetchPage}
        onRowClick={setSelected}
        onAdd={() => setCreating(true)}
        searchPlaceholder="Rechercher un produit par nom..."
        refreshKey={`${refreshKey}-${selectedType}`}
      />

      {(selected || creating) && (
        <DrinkDetailPanel
          drink={selected}
          onClose={() => {
            setSelected(null);
            setCreating(false);
          }}
          onSaved={() => {
            setSelected(null);
            setCreating(false);
            triggerRefresh();
          }}
        />
      )}
    </div>
  );
}
