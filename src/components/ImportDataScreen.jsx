// ============================================================
// Écran d'import ponctuel — permet de charger le fichier JSON
// exporté depuis le prototype Claude (établissements, produits,
// brasseries, marques) directement dans Supabase.
//
// À utiliser une seule fois pour la migration initiale ; peut
// être ré-utilisé plus tard si de nouvelles données doivent être
// transférées depuis l'artefact.
// ============================================================
import React, { useState } from "react";
import { COLORS } from "../constants.js";
import { PageHeader, PrimaryButton } from "./ui.jsx";
import { createPublicVenue, createDrink, createBrewery, createBrand } from "../data/sharedDirectories.js";

export function ImportDataScreen({ onBack }) {
  const [status, setStatus] = useState("idle"); // idle | reading | importing | done | error
  const [log, setLog] = useState([]);
  const [counts, setCounts] = useState({ venues: 0, drinks: 0, breweries: 0, brands: 0 });
  const [errors, setErrors] = useState([]);

  const appendLog = (line) => setLog((prev) => [...prev, line]);

  const handleFile = async (file) => {
    setStatus("reading");
    setLog([]);
    setErrors([]);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      setStatus("importing");

      const venues = data.publicVenues || [];
      const drinks = data.drinksDirectory || [];
      const breweries = data.breweriesDirectory || [];
      const brands = data.brandsDirectory || [];

      appendLog(`Fichier lu : ${venues.length} établissements, ${drinks.length} produits, ${breweries.length} brasseries, ${brands.length} marques.`);

      let vCount = 0,
        dCount = 0,
        bwCount = 0,
        bnCount = 0;
      const errs = [];

      for (const v of venues) {
        const created = await createPublicVenue(v);
        if (created) vCount++;
        else errs.push(`Établissement "${v.name}" : échec`);
      }
      appendLog(`Établissements importés : ${vCount} / ${venues.length}`);
      setCounts((c) => ({ ...c, venues: vCount }));

      for (const d of drinks) {
        const created = await createDrink(d);
        if (created) dCount++;
        else errs.push(`Produit "${d.name}" : échec`);
      }
      appendLog(`Produits importés : ${dCount} / ${drinks.length}`);
      setCounts((c) => ({ ...c, drinks: dCount }));

      for (const b of breweries) {
        const created = await createBrewery(b);
        if (created) bwCount++;
        else errs.push(`Brasserie "${b.name}" : échec`);
      }
      appendLog(`Brasseries importées : ${bwCount} / ${breweries.length}`);
      setCounts((c) => ({ ...c, breweries: bwCount }));

      for (const b of brands) {
        const created = await createBrand(b);
        if (created) bnCount++;
        else errs.push(`Marque "${b.name}" : échec`);
      }
      appendLog(`Marques importées : ${bnCount} / ${brands.length}`);
      setCounts((c) => ({ ...c, brands: bnCount }));

      setErrors(errs);
      setStatus("done");
    } catch (e) {
      appendLog(`Erreur : ${e.message}`);
      setStatus("error");
    }
  };

  return (
    <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onBack} />
      <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "28px", margin: "4px 0 8px 0" }}>Import des données</h1>
      <p style={{ fontSize: "13px", color: COLORS.inkSoft, marginBottom: "20px" }}>
        Sélectionnez le fichier <code>bibamus-export-....json</code> téléchargé depuis l'artefact Claude. Chaque élément est ajouté un par un — ça peut
        prendre une minute ou deux pour plusieurs centaines de produits.
      </p>

      {status === "idle" && (
        <label
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: `2px dashed ${COLORS.paperAlt}`,
            borderRadius: "12px",
            padding: "40px 20px",
            cursor: "pointer",
            color: COLORS.inkSoft,
            fontSize: "14px",
            textAlign: "center",
          }}
        >
          Cliquez pour choisir le fichier JSON
          <input
            type="file"
            accept="application/json"
            style={{ display: "none" }}
            onChange={(e) => e.target.files[0] && handleFile(e.target.files[0])}
          />
        </label>
      )}

      {(status === "reading" || status === "importing") && (
        <div style={{ textAlign: "center", padding: "30px 0", color: COLORS.inkSoft }}>
          {status === "reading" ? "Lecture du fichier..." : "Import en cours, ne fermez pas cette page..."}
        </div>
      )}

      {(status === "done" || status === "error") && (
        <div
          style={{
            background: COLORS.surface,
            border: `2px solid ${status === "error" ? COLORS.redFluo : COLORS.amber}`,
            borderRadius: "12px",
            padding: "16px",
            fontSize: "13px",
            fontFamily: "monospace",
            whiteSpace: "pre-wrap",
            marginBottom: "16px",
          }}
        >
          {log.join("\n")}
          {errors.length > 0 && (
            <>
              {"\n\n"}
              {errors.length} erreur(s) :{"\n"}
              {errors.join("\n")}
            </>
          )}
        </div>
      )}

      {status === "done" && (
        <PrimaryButton onClick={onBack} style={{ width: "100%" }}>
          Terminé — retour
        </PrimaryButton>
      )}
    </div>
  );
}
