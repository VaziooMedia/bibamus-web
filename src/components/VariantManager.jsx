import React, { useState, useEffect } from "react";
import { loadDrinkVariants, createDrinkVariant, updateDrinkVariant, deleteDrinkVariant } from "../data/sharedDirectories.js";
import { CONTAINER_TYPES, COMMON_VOLUMES_CL } from "../data/beerCiderStyles.js";
import { COUNTRIES } from "../constants.js";

const fieldStyle = { padding: "8px 10px", borderRadius: "6px", border: "2px solid #28405C", fontSize: "12.5px" };

function VariantRow({ variant, onSave, onDelete }) {
  const [container, setContainer] = useState(variant.container || CONTAINER_TYPES[0].code);
  const [volumeCl, setVolumeCl] = useState(variant.volumeMl ? variant.volumeMl / 10 : "");
  const [barcode, setBarcode] = useState(variant.barcode || "");
  const [marketCountry, setMarketCountry] = useState(variant.marketCountry || "");
  const [dirty, setDirty] = useState(false);

  const save = () => {
    onSave(variant.id, { container, volumeMl: volumeCl === "" ? null : parseFloat(volumeCl) * 10, barcode: barcode.trim(), marketCountry });
    setDirty(false);
  };

  return (
    <div style={{ padding: "8px", background: "#16273D", borderRadius: "8px", marginBottom: "6px" }}>
      <div style={{ display: "flex", gap: "6px", marginBottom: "6px" }}>
        <select
          value={container}
          onChange={(e) => {
            setContainer(e.target.value);
            setDirty(true);
          }}
          style={{ ...fieldStyle, flex: 1 }}
        >
          {CONTAINER_TYPES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.fr}
            </option>
          ))}
        </select>
        <input
          type="number"
          step="0.5"
          min="0"
          max="999"
          list="common-volumes-cl"
          value={volumeCl}
          onChange={(e) => {
            setVolumeCl(e.target.value);
            setDirty(true);
          }}
          title="Volume (cl)"
          style={{ ...fieldStyle, width: "60px", padding: "8px 4px", textAlign: "center", flexShrink: 0 }}
        />
        <div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
          {dirty && (
            <button onClick={save} title="Enregistrer" style={{ background: "#39FF66", border: "none", borderRadius: "6px", width: "30px", height: "30px", cursor: "pointer", fontWeight: 800, fontSize: "12px" }}>
              ✓
            </button>
          )}
          <button onClick={() => onDelete(variant.id)} title="Supprimer" style={{ background: "none", border: "none", color: "#FF3B4E", cursor: "pointer", fontSize: "14px", width: "30px" }}>
            ✕
          </button>
        </div>
      </div>
      <div style={{ display: "flex", gap: "6px" }}>
        <input
          value={barcode}
          onChange={(e) => {
            setBarcode(e.target.value);
            setDirty(true);
          }}
          placeholder="Code-barres (optionnel)"
          style={{ ...fieldStyle, flex: 1.3 }}
        />
        <select
          value={marketCountry}
          onChange={(e) => {
            setMarketCountry(e.target.value);
            setDirty(true);
          }}
          style={{ ...fieldStyle, flex: 1 }}
        >
          <option value="">Marché — tous</option>
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.fr}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

export function VariantManager({ drinkId }) {
  const [variants, setVariants] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = () => {
    setLoading(true);
    loadDrinkVariants(drinkId).then((list) => {
      setVariants(list);
      setLoading(false);
    });
  };

  useEffect(() => {
    if (drinkId) refresh();
    else setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drinkId]);

  if (!drinkId) {
    return <p style={{ fontSize: "12px", color: "#8792A6", fontStyle: "italic" }}>Enregistrez d'abord le produit pour pouvoir ajouter des conditionnements.</p>;
  }

  const addVariant = async () => {
    const created = await createDrinkVariant({ drinkId, container: CONTAINER_TYPES[0].code, volumeMl: 330, barcode: null, marketCountry: null });
    if (created) setVariants((prev) => [...prev, created]);
  };

  const saveVariant = async (id, patch) => {
    await updateDrinkVariant(id, patch);
    refresh();
  };

  const removeVariant = async (id) => {
    await deleteDrinkVariant(id);
    setVariants((prev) => prev.filter((v) => v.id !== id));
  };

  return (
    <div>
      <datalist id="common-volumes-cl">
        {COMMON_VOLUMES_CL.map((v) => (
          <option key={v} value={v} />
        ))}
      </datalist>
      {loading ? (
        <p style={{ fontSize: "12px", color: "#8792A6" }}>Chargement...</p>
      ) : (
        <>
          {variants.length === 0 && <p style={{ fontSize: "12px", color: "#8792A6", fontStyle: "italic", marginBottom: "8px" }}>Aucun conditionnement enregistré pour l'instant.</p>}
          {variants.map((v) => (
            <VariantRow key={v.id} variant={v} onSave={saveVariant} onDelete={removeVariant} />
          ))}
        </>
      )}
      <button
        onClick={addVariant}
        style={{ background: "none", border: "2px dashed #28405C", borderRadius: "8px", padding: "9px", width: "100%", color: "#39FF66", fontSize: "12.5px", fontWeight: 700, cursor: "pointer" }}
      >
        + Ajouter un conditionnement
      </button>
    </div>
  );
}
