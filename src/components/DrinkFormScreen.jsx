// ============================================================
// Formulaire "Proposer une boisson" — copié tel quel depuis
// le prototype Claude.
// ============================================================
import React, { useState } from "react";
import { COLORS, DRINK_TYPES, GLUTEN_BIO_ELIGIBLE_TYPES, NATIONALITY_ELIGIBLE_TYPES, DRINK_VOLUMES_CL, SNACK_WEIGHTS_G, SERVING_MODE_LABELS, BEER_STYLE_TAGS, SOFT_DRINK_TAGS, SPIRIT_TAGS, WINE_TAGS, SNACK_TYPES, BEER_TYPES, COUNTRIES } from "../constants.js";
import { NavIcon } from "./icons.jsx";
import { PageHeader, BackFooterLink, PrimaryButton } from "./ui.jsx";
import { BrewerySearchSelect } from "./BrewerySearchSelect.jsx";
import { BrandSearchSelect, DrinkLinkPicker } from "./MoreSearchPickers.jsx";
import { capitalizeFirst, drinkTypeLabel } from "../utils.js";

export function DrinkFormScreen({ drink, breweriesDirectory, onRegisterBrewery, brandsDirectory, onRegisterBrand, drinksDirectory = [], suggestMode, onSave, onCancel }) {
  const [name, setName] = useState(drink?.name || "");
  const [type, setType] = useState(drink?.type || "");
  const [abv, setAbv] = useState(drink?.abv != null ? String(drink.abv) : "");
  const [kcalPer100ml, setKcalPer100ml] = useState(drink?.kcalPer100ml != null ? String(drink.kcalPer100ml) : "");
  const [beerTags, setBeerTags] = useState(drink?.beerTags || []);
  const [brand, setBrand] = useState(drink?.brand || "");
  const [brewery, setBrewery] = useState(drink?.brewery || "");
  const [description, setDescription] = useState(drink?.description || "");
  const [nationality, setNationality] = useState(drink?.nationality || "");
  const [glutenFree, setGlutenFree] = useState(!!drink?.glutenFree);
  const [bio, setBio] = useState(!!drink?.bio);
  const [volumeCl, setVolumeCl] = useState(drink?.volumeCl != null ? String(drink.volumeCl) : "");
  const [servingMode, setServingMode] = useState(drink?.servingMode || "");
  const [snackType, setSnackType] = useState(drink?.snackType || "");
  const [weightG, setWeightG] = useState(drink?.weightG != null ? String(drink.weightG) : "");
  const [isGeneric, setIsGeneric] = useState(!!drink?.isGeneric);
  const [averagePrice, setAveragePrice] = useState(drink?.averagePrice != null ? String(drink.averagePrice).replace(".", ",") : "");
  const [averageJetonValue, setAverageJetonValue] = useState(drink?.averageJetonValue != null ? String(drink.averageJetonValue) : "");
  const [countsAsDrinkId, setCountsAsDrinkId] = useState(drink?.countsAsDrinkId || null);

  const isBeer = BEER_TYPES.includes(type);
  const isSoft = type === "Softs & eaux";
  const isSpirit = type === "Spiritueux";
  const isWine = type === "Vins & bulles";
  const isSnack = type === "Snacks";
  React.useEffect(() => {
    if (isSnack && abv === "") setAbv("0");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSnack]);
  const hasStyleTags = isBeer || isSoft || isSpirit || isWine;
  const styleTagOptions = isBeer ? BEER_STYLE_TAGS : isSoft ? SOFT_DRINK_TAGS : isSpirit ? SPIRIT_TAGS : isWine ? WINE_TAGS : [];
  const canSave = name.trim().length > 0 && type !== "" && brand.trim().length > 0 && abv !== "" && !isNaN(parseFloat(abv));
  const fieldStyle = { padding: "12px 14px", borderRadius: "10px", border: `2px solid ${COLORS.paperAlt}`, fontSize: "14px", outline: "none", marginBottom: "14px", width: "100%" };
  const labelStyle = { fontSize: "13px", fontWeight: 600, color: COLORS.inkSoft, marginBottom: "6px", display: "block" };

  const toggleTag = (tag) => setBeerTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));

  return (
    <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onCancel} />
      <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "40px", margin: "0 0 6px 0" }}>
        {!drink ? "Proposer une boisson" : suggestMode ? "Suggérer une modification" : "Éditer la fiche"}
      </h1>
      {!drink && (
        <p style={{ fontSize: "13px", color: COLORS.inkSoft, marginBottom: "18px" }}>
          Ta proposition sera visible et utilisable immédiatement. Un badge "en attente" s'affichera jusqu'à validation par un administrateur.
        </p>
      )}
      {suggestMode && (
        <p style={{ fontSize: "13px", color: COLORS.inkSoft, marginBottom: "18px" }}>
          Ce produit est certifié — tes changements seront proposés à un administrateur plutôt qu'appliqués directement. Le produit garde ses valeurs actuelles en attendant.
        </p>
      )}

      <label style={labelStyle}>
        Nom complet du produit<span style={{ color: COLORS.wine }}> *</span>
      </label>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex. Jupiler" autoFocus style={fieldStyle} />

      <label style={labelStyle}>
        Type de boisson<span style={{ color: COLORS.wine }}> *</span>
      </label>
      <select value={type} onChange={(e) => setType(e.target.value)} style={{ ...fieldStyle, fontFamily: "'Work Sans', sans-serif" }}>
        <option value="">—</option>
        {DRINK_TYPES.map((t) => (
          <option key={t} value={t}>
            {drinkTypeLabel(t)}
          </option>
        ))}
      </select>

      <label style={labelStyle}>
        Marque du produit<span style={{ color: COLORS.wine }}> *</span>
      </label>
      <div style={{ marginBottom: "8px" }}>
        <BrandSearchSelect value={brand} onChange={setBrand} brands={brandsDirectory} onRegister={onRegisterBrand} />
      </div>
      <p style={{ fontSize: "11.5px", color: COLORS.inkSoft, marginTop: "0", marginBottom: "14px" }}>
        Le nom commercial du produit — ex. "Bacardi" pour un "Bacardi Carta Oro". Choisissez-en une déjà enregistrée si possible, pour éviter les doublons.
      </p>

      <>
        <label style={labelStyle}>
          Degré d'alcool (% ABV)<span style={{ color: COLORS.wine }}> *</span>
        </label>
        <input value={abv} onChange={(e) => setAbv(e.target.value.replace(",", "."))} placeholder={isSnack ? "Ex. 0" : "Ex. 5.2"} inputMode="decimal" style={fieldStyle} />
        <p style={{ fontSize: "11.5px", color: COLORS.inkSoft, marginTop: "-10px", marginBottom: "14px" }}>
          {isSnack
            ? "La plupart des snacks sont à 0% — mais mettez le vrai degré s'il y a de l'alcool dedans (ex. un dessert au rhum)."
            : 'Mettez le vrai degré, même pour un produit "sans alcool" (souvent 0,0 à 0,4% en réalité) — l\'app considère qu\'un produit est sans alcool jusqu\'à 0,5% inclus, comme la norme belge.'}
        </p>
      </>

      {NATIONALITY_ELIGIBLE_TYPES.includes(type) && (
        <>
          <label style={labelStyle}>Pays d'origine de la marque (facultatif)</label>
          <select value={nationality} onChange={(e) => setNationality(e.target.value)} style={{ ...fieldStyle, fontFamily: "'Work Sans', sans-serif" }}>
            <option value="">Sélectionner...</option>
            {COUNTRIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </>
      )}

      <label style={labelStyle}>Producteur (facultatif)</label>
      <div style={{ marginBottom: "8px" }}>
        <BrewerySearchSelect value={brewery} onChange={setBrewery} breweries={breweriesDirectory} onRegister={onRegisterBrewery} />
      </div>
      <p style={{ fontSize: "11.5px", color: COLORS.inkSoft, marginTop: "0", marginBottom: "14px" }}>
        L'entreprise qui fabrique le produit — parfois différente de la marque (ex. "Bacardi-Martini" produit "Bacardi"). Choisissez-en un déjà enregistré si possible, pour éviter les doublons (ex. "AB InBev" vs "ab In Bev").
      </p>

      <label style={labelStyle}>Kcal / 100ml (facultatif)</label>
      <input value={kcalPer100ml} onChange={(e) => setKcalPer100ml(e.target.value.replace(",", "."))} placeholder="Ex. 44" inputMode="decimal" style={fieldStyle} />

      {GLUTEN_BIO_ELIGIBLE_TYPES.includes(type) && (
        <div style={{ display: "flex", gap: "20px", marginBottom: "14px" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13.5px", cursor: "pointer" }}>
            <input type="checkbox" checked={glutenFree} onChange={(e) => setGlutenFree(e.target.checked)} style={{ width: "17px", height: "17px", accentColor: COLORS.amber }} />
            Sans gluten
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13.5px", cursor: "pointer" }}>
            <input type="checkbox" checked={bio} onChange={(e) => setBio(e.target.checked)} style={{ width: "17px", height: "17px", accentColor: COLORS.amber }} />
            Label Bio
          </label>
        </div>
      )}

      {isSnack ? (
        <>
          <label style={labelStyle}>Poids par défaut (facultatif)</label>
          <select value={weightG} onChange={(e) => setWeightG(e.target.value)} style={{ ...fieldStyle, fontFamily: "'Work Sans', sans-serif" }}>
            <option value="">Non défini — varie selon le lieu</option>
            {SNACK_WEIGHTS_G.map((w) => (
              <option key={w} value={w}>
                {w} g.
              </option>
            ))}
          </select>
        </>
      ) : (
        <>
          <label style={labelStyle}>Volume par défaut (facultatif)</label>
          <select value={volumeCl} onChange={(e) => setVolumeCl(e.target.value)} style={{ ...fieldStyle, fontFamily: "'Work Sans', sans-serif" }}>
            <option value="">Non défini — varie selon le lieu</option>
            {DRINK_VOLUMES_CL.map((v) => (
              <option key={v} value={v}>
                {String(v).replace(".", ",")} cl.
              </option>
            ))}
          </select>
        </>
      )}

      {!isSnack && (
        <>
          <label style={labelStyle}>Type de service par défaut (facultatif)</label>
          <div style={{ display: "flex", gap: "10px", marginBottom: "8px" }}>
            {Object.entries(SERVING_MODE_LABELS).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setServingMode(servingMode === key ? "" : key)}
                style={{
                  flex: 1,
                  padding: "10px",
                  borderRadius: "9px",
                  border: `2px solid ${servingMode === key ? COLORS.ink : COLORS.paperAlt}`,
                  background: servingMode === key ? COLORS.amber : COLORS.surface,
                  color: servingMode === key ? COLORS.paper : COLORS.ink,
                  fontWeight: 700,
                  fontSize: "13.5px",
                  cursor: "pointer",
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <p style={{ fontSize: "11.5px", color: COLORS.inkSoft, marginTop: "0", marginBottom: "14px" }}>
            À remplir seulement si ce produit a toujours le même format (ex. une canette unique) — sinon laissez vide, ça se précisera lieu par lieu en l'ajoutant à une carte boissons.
          </p>
        </>
      )}

      {hasStyleTags && (
        <>
          <label style={labelStyle}>Style & caractéristiques (facultatif)</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "14px" }}>
            {styleTagOptions.map((tag) => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                style={{
                  background: beerTags.includes(tag) ? COLORS.amber : COLORS.surface,
                  border: `2px solid ${beerTags.includes(tag) ? COLORS.amber : COLORS.paperAlt}`,
                  borderRadius: "999px",
                  padding: "6px 12px",
                  fontSize: "12.5px",
                  fontWeight: 600,
                  color: beerTags.includes(tag) ? COLORS.paper : COLORS.ink,
                  cursor: "pointer",
                }}
              >
                {tag}
              </button>
            ))}
          </div>
        </>
      )}

      {isSnack && (
        <>
          <label style={labelStyle}>Type de produit (facultatif)</label>
          <select value={snackType} onChange={(e) => setSnackType(e.target.value)} style={{ ...fieldStyle, fontFamily: "'Work Sans', sans-serif" }}>
            <option value="">Sélectionner...</option>
            {SNACK_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </>
      )}

      <div style={{ background: COLORS.paperAlt, borderRadius: "12px", padding: "14px", marginBottom: "14px" }}>
        <label style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "14px", fontWeight: 700, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={isGeneric}
            onChange={(e) => setIsGeneric(e.target.checked)}
            style={{ width: "18px", height: "18px", accentColor: COLORS.amber }}
          />
          Produit générique
        </label>
        <p style={{ fontSize: "11.5px", color: COLORS.inkSoft, marginTop: "6px", marginBottom: isGeneric ? "12px" : 0 }}>
          Pour un produit où la marque précise importe peu (ex. "Vodka", "Pastis") — le rend disponible dans "Charger la carte générique" lors d'un événement sans lieu fixe.
        </p>
        {isGeneric && (
          <>
            <label style={{ ...labelStyle, marginTop: 0 }}>Prix indicatif (facultatif)</label>
            <input
              value={averagePrice}
              onChange={(e) => setAveragePrice(e.target.value.replace(".", ","))}
              placeholder="Ex. 2,50"
              inputMode="decimal"
              style={{ ...fieldStyle, marginBottom: 0 }}
            />
            <p style={{ fontSize: "11.5px", color: COLORS.inkSoft, marginTop: "6px", marginBottom: "12px" }}>
              Un prix moyen en € — sert de base pour la carte générique d'un événement, ajustable ensuite sur place.
            </p>
            <label style={{ ...labelStyle, marginTop: 0, display: "flex", alignItems: "center", gap: "6px" }}>
              Valeur en jetons (facultatif)
              <NavIcon name="jeton" size={15} color={COLORS.jetonFluo} />
            </label>
            <input
              value={averageJetonValue}
              onChange={(e) => setAverageJetonValue(e.target.value.replace(/[^0-9]/g, ""))}
              placeholder="Ex. 1"
              inputMode="numeric"
              style={{ ...fieldStyle, marginBottom: 0 }}
            />
            <p style={{ fontSize: "11.5px", color: COLORS.inkSoft, marginTop: "6px", marginBottom: 0 }}>
              Un nombre de jetons fixe (ex. 1 jeton par défaut) — utilisé à la place du calcul automatique depuis le prix indicatif, pour un événement en jetons.
            </p>
          </>
        )}
      </div>

      <div style={{ background: COLORS.paperAlt, borderRadius: "12px", padding: "14px", marginBottom: "14px" }}>
        <label style={{ fontSize: "14px", fontWeight: 700, display: "block", marginBottom: "6px" }}>Compte comme (pour tes stats)</label>
        <p style={{ fontSize: "11.5px", color: COLORS.inkSoft, marginTop: 0, marginBottom: "10px" }}>
          Pour un mélange à base d'une autre boisson (ex. "Mazout" à la Jupiler) — tes statistiques personnelles compteront ce produit dans le total de la boisson liée, plutôt que sous son propre nom.
        </p>
        {countsAsDrinkId ? (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: COLORS.surface, borderRadius: "8px", padding: "10px 12px" }}>
            <span style={{ fontSize: "14px", fontWeight: 600 }}>{drinksDirectory.find((d) => d.id === countsAsDrinkId)?.name || "Produit introuvable"}</span>
            <button onClick={() => setCountsAsDrinkId(null)} style={{ background: "none", border: "none", color: COLORS.wine, fontSize: "13px", fontWeight: 700, cursor: "pointer", padding: 0 }}>
              Retirer
            </button>
          </div>
        ) : (
          <DrinkLinkPicker drinksDirectory={drinksDirectory.filter((d) => d.id !== drink?.id)} onPick={(d) => setCountsAsDrinkId(d.id)} />
        )}
      </div>

      <label style={labelStyle}>Description (facultatif)</label>
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Un mot sur cette boisson..."
        rows={3}
        style={{ ...fieldStyle, resize: "vertical", fontFamily: "'Work Sans', sans-serif" }}
      />

      <PrimaryButton
        onClick={() =>
          canSave &&
          onSave({
            name: capitalizeFirst(name.trim()),
            type,
            abv: abv !== "" ? parseFloat(abv) : null,
            kcalPer100ml: kcalPer100ml ? parseFloat(kcalPer100ml) : null,
            beerTags: hasStyleTags ? beerTags : [],
            brand: brand.trim(),
            brewery: brewery.trim(),
            nationality: NATIONALITY_ELIGIBLE_TYPES.includes(type) ? nationality : "",
            glutenFree: GLUTEN_BIO_ELIGIBLE_TYPES.includes(type) ? glutenFree : false,
            bio: GLUTEN_BIO_ELIGIBLE_TYPES.includes(type) ? bio : false,
            volumeCl: !isSnack && volumeCl ? parseFloat(volumeCl) : null,
            servingMode: isSnack ? "" : servingMode,
            snackType: isSnack ? snackType : "",
            weightG: isSnack && weightG ? parseFloat(weightG) : null,
            isGeneric,
            averagePrice: isGeneric && averagePrice ? parseFloat(averagePrice.replace(",", ".")) : null,
            averageJetonValue: isGeneric && averageJetonValue ? parseInt(averageJetonValue, 10) : null,
            countsAsDrinkId,
            description: description.trim(),
          })
        }
        disabled={!canSave}
        style={{ marginTop: "8px", width: "100%" }}
      >
        {!drink ? "Proposer cette boisson" : suggestMode ? "Envoyer la suggestion" : "Enregistrer"}
      </PrimaryButton>
      <BackFooterLink onClick={onCancel} />
    </div>
  );
}
