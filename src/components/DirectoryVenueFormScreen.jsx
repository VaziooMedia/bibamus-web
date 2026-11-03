// ============================================================
// Formulaire "Proposer un établissement" / "Éditer la fiche" d'un lieu.
// La carte boissons ne se modifie plus depuis l'app : elle se gère depuis la plateforme de gestion
// (et, plus tard, la plateforme Business). Ce formulaire ne touche donc jamais à la carte du lieu.
// ============================================================
import React, { useState } from "react";
import { COLORS, VENUE_TYPE_TAGS } from "../constants.js";
import { TokenPinkIcon } from "./icons.jsx";
import { PageHeader, BackFooterLink, PrimaryButton } from "./ui.jsx";
import { VenuePositionPicker } from "./MoreSearchPickers.jsx";
import { capitalizeFirst, isValidVenuePhone } from "../utils.js";

export function DirectoryVenueFormScreen({ venue, addIntent, suggestMode, onSave, onCancel }) {
  const [name, setName] = useState(venue?.name || "");
  const [subtitle, setSubtitle] = useState(venue?.subtitle || "");
  const [streetName, setStreetName] = useState(venue?.streetName || "");
  const [streetNumber, setStreetNumber] = useState(venue?.streetNumber || "");
  const [postalCode, setPostalCode] = useState(venue?.postalCode || "");
  const [city, setCity] = useState(venue?.city || "");
  const [village, setVillage] = useState(venue?.village || "");
  const [country, setCountry] = useState(venue?.country || "Belgique");
  const [phone, setPhone] = useState(venue?.phone || "");
  const [email, setEmail] = useState(venue?.email || "");
  const [website, setWebsite] = useState(venue?.website || "");
  const [googleUrl, setGoogleUrl] = useState(venue?.googleUrl || "");
  const [facebookUrl, setFacebookUrl] = useState(venue?.facebookUrl || "");
  const [instagramUrl, setInstagramUrl] = useState(venue?.instagramUrl || "");
  const [tiktokUrl, setTiktokUrl] = useState(venue?.tiktokUrl || "");
  const [hasFood, setHasFood] = useState(!!venue?.hasFood);
  const [defaultCurrency, setDefaultCurrency] = useState(venue?.defaultCurrency || "euro");
  const [jetonUnitValueInput, setJetonUnitValueInput] = useState(venue?.jetonUnitValue ? String(venue.jetonUnitValue) : "");
  const [tags, setTags] = useState(venue?.tags || []);
  const [lat, setLat] = useState(venue?.lat ?? null);
  const [lng, setLng] = useState(venue?.lng ?? null);

  const canSave = name.trim().length > 0 && isValidVenuePhone(phone);
  const fieldStyle = { padding: "12px 14px", borderRadius: "10px", border: `2px solid ${COLORS.paperAlt}`, fontSize: "14px", outline: "none", marginBottom: "14px", width: "100%" };

  return (
    <div style={{ padding: "8px 20px 28px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onCancel} />
      <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "40px", margin: "0 0 6px 0" }}>
        {!venue ? (addIntent ? "Créer ce lieu" : "Proposer un établissement") : suggestMode ? "Suggérer une modification" : "Éditer la fiche"}
      </h1>
      {!venue && (
        <p style={{ fontSize: "13px", color: COLORS.inkSoft, marginBottom: "18px" }}>
          {addIntent
            ? "Il sera ajouté à tes lieux favoris immédiatement — et visible dans le répertoire tout de suite, avant d'être vérifié par un administrateur."
            : "Il sera visible et utilisable immédiatement, puis vérifié par un administrateur."}
        </p>
      )}
      {suggestMode && (
        <p style={{ fontSize: "13px", color: COLORS.inkSoft, marginBottom: "18px" }}>
          Ce lieu est certifié — tes changements sur le nom, l'adresse, le téléphone, etc. seront proposés à un administrateur.
        </p>
      )}

      <label style={{ fontSize: "13px", fontWeight: 600, color: COLORS.inkSoft, marginBottom: "6px" }}>Nom *</label>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex. Café du Centre" autoFocus style={fieldStyle} />

      <label style={{ fontSize: "13px", fontWeight: 600, color: COLORS.inkSoft, marginBottom: "6px" }}>Sous-titre (facultatif)</label>
      <input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="Ex. Événement & Loisirs" style={fieldStyle} />

      <label style={{ fontSize: "13px", fontWeight: 600, color: COLORS.inkSoft, marginBottom: "6px" }}>Adresse</label>
      <div style={{ display: "flex", gap: "8px" }}>
        <input value={streetName} onChange={(e) => setStreetName(e.target.value)} placeholder="Rue / place" style={{ ...fieldStyle, flex: 2.2 }} />
        <input value={streetNumber} onChange={(e) => setStreetNumber(e.target.value)} placeholder="N°" style={{ ...fieldStyle, flex: 1 }} />
      </div>
      <div style={{ display: "flex", gap: "8px" }}>
        <input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} placeholder="Code postal" style={{ ...fieldStyle, flex: 1 }} />
        <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ville" style={{ ...fieldStyle, flex: 2 }} />
      </div>
      <input value={village} onChange={(e) => setVillage(e.target.value)} placeholder="Village (facultatif, si différent de la ville)" style={fieldStyle} />
      <input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Pays" style={fieldStyle} />

      <label style={{ fontSize: "13px", fontWeight: 600, color: COLORS.inkSoft, marginBottom: "6px", display: "block" }}>Position sur la carte</label>
      <div style={{ marginBottom: "18px" }}>
        <VenuePositionPicker lat={lat} lng={lng} onChange={(newLat, newLng) => { setLat(newLat); setLng(newLng); }} />
      </div>

      <label style={{ fontSize: "13px", fontWeight: 600, color: COLORS.inkSoft, marginBottom: "6px" }}>Numéro de téléphone</label>
      <input
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="Ex. +32 80 12 34 56"
        style={{ ...fieldStyle, marginBottom: isValidVenuePhone(phone) ? "14px" : "6px", borderColor: isValidVenuePhone(phone) ? COLORS.paperAlt : COLORS.wine }}
      />
      {!isValidVenuePhone(phone) && (
        <p style={{ fontSize: "11.5px", color: COLORS.wine, marginTop: "-2px", marginBottom: "14px" }}>
          Doit commencer par le préfixe international (ex. +32 pour la Belgique).
        </p>
      )}

      <label style={{ fontSize: "13px", fontWeight: 600, color: COLORS.inkSoft, marginBottom: "6px" }}>Adresse e-mail</label>
      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contact@exemple.com" style={fieldStyle} />

      <label style={{ fontSize: "13px", fontWeight: 600, color: COLORS.inkSoft, marginBottom: "6px" }}>Site internet</label>
      <input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://..." style={fieldStyle} />

      <label style={{ fontSize: "13px", fontWeight: 600, color: COLORS.inkSoft, marginBottom: "6px" }}>Lien Google (page ou avis)</label>
      <input value={googleUrl} onChange={(e) => setGoogleUrl(e.target.value)} placeholder="https://..." style={fieldStyle} />

      <label style={{ fontSize: "13px", fontWeight: 600, color: COLORS.inkSoft, marginBottom: "6px" }}>Lien Facebook</label>
      <input value={facebookUrl} onChange={(e) => setFacebookUrl(e.target.value)} placeholder="https://facebook.com/..." style={fieldStyle} />

      <label style={{ fontSize: "13px", fontWeight: 600, color: COLORS.inkSoft, marginBottom: "6px" }}>Lien Instagram</label>
      <input value={instagramUrl} onChange={(e) => setInstagramUrl(e.target.value)} placeholder="https://instagram.com/..." style={fieldStyle} />

      <label style={{ fontSize: "13px", fontWeight: 600, color: COLORS.inkSoft, marginBottom: "6px" }}>Lien TikTok</label>
      <input value={tiktokUrl} onChange={(e) => setTiktokUrl(e.target.value)} placeholder="https://tiktok.com/@..." style={fieldStyle} />

      <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", color: COLORS.ink, marginBottom: "18px", cursor: "pointer" }}>
        <input type="checkbox" checked={hasFood} onChange={(e) => setHasFood(e.target.checked)} style={{ width: "17px", height: "17px", accentColor: COLORS.amber }} />
        Restauration possible, en plus des boissons
      </label>

      <label style={{ fontSize: "13px", fontWeight: 600, color: COLORS.inkSoft, marginBottom: "8px" }}>Moyen de paiement habituel</label>
      <p style={{ fontSize: "11.5px", color: COLORS.inkSoft, marginTop: "-4px", marginBottom: "10px" }}>
        Juste un préréglage — modifiable à tout moment lors d'un BibaRoom ou d'un événement.
      </p>
      <div style={{ display: "flex", gap: "10px", marginBottom: defaultCurrency === "jeton" ? "10px" : "18px" }}>
        <button
          onClick={() => setDefaultCurrency("euro")}
          style={{
            flex: 1,
            padding: "10px",
            borderRadius: "9px",
            border: `2px solid ${defaultCurrency === "euro" ? COLORS.ink : COLORS.paperAlt}`,
            background: defaultCurrency === "euro" ? COLORS.amber : COLORS.surface,
            color: defaultCurrency === "euro" ? COLORS.paper : COLORS.ink,
            fontWeight: 700,
            fontSize: "14px",
            cursor: "pointer",
          }}
        >
          € Euros
        </button>
        <button
          onClick={() => setDefaultCurrency("jeton")}
          style={{
            flex: 1,
            padding: "10px",
            borderRadius: "9px",
            border: `2px solid ${defaultCurrency === "jeton" ? COLORS.ink : COLORS.paperAlt}`,
            background: defaultCurrency === "jeton" ? COLORS.amber : COLORS.surface,
            color: defaultCurrency === "jeton" ? COLORS.paper : COLORS.ink,
            fontWeight: 700,
            fontSize: "14px",
            cursor: "pointer",
          }}
        >
          <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
            <TokenPinkIcon size={20} />
            Jetons
          </span>
        </button>
      </div>
      {defaultCurrency === "jeton" && (
        <input
          value={jetonUnitValueInput}
          onChange={(e) => setJetonUnitValueInput(e.target.value.replace(",", "."))}
          placeholder="Valeur d'un jeton en € (ex. 1.50)"
          inputMode="decimal"
          style={{ ...fieldStyle, marginBottom: "18px" }}
        />
      )}

      <label style={{ fontSize: "13px", fontWeight: 600, color: COLORS.inkSoft, marginBottom: "8px" }}>Type d'établissement</label>
      <p style={{ fontSize: "11.5px", color: COLORS.inkSoft, marginTop: "-4px", marginBottom: "10px" }}>Plusieurs choix possibles.</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "18px" }}>
        {VENUE_TYPE_TAGS.map((tag) => {
          const active = tags.includes(tag);
          return (
            <button
              key={tag}
              onClick={() => setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))}
              style={{
                padding: "6px 12px",
                borderRadius: "999px",
                border: `1.5px solid ${active ? COLORS.amber : COLORS.paperAlt}`,
                background: active ? COLORS.amber : COLORS.surface,
                color: active ? COLORS.paper : COLORS.ink,
                fontSize: "12.5px",
                fontWeight: active ? 700 : 500,
                cursor: "pointer",
              }}
            >
              {tag}
            </button>
          );
        })}
      </div>

      <PrimaryButton
        onClick={() =>
          canSave &&
          onSave({
            name: capitalizeFirst(name.trim()),
            subtitle: subtitle.trim(),
            streetName: streetName.trim(),
            streetNumber: streetNumber.trim(),
            postalCode: postalCode.trim(),
            city: city.trim(),
            village: village.trim(),
            country: country.trim(),
            phone: phone.trim(),
            email: email.trim(),
            website: website.trim(),
            googleUrl: googleUrl.trim(),
            facebookUrl: facebookUrl.trim(),
            instagramUrl: instagramUrl.trim(),
            tiktokUrl: tiktokUrl.trim(),
            hasFood,
            defaultCurrency,
            jetonUnitValue: isNaN(parseFloat(jetonUnitValueInput)) ? 0 : parseFloat(jetonUnitValueInput),
            tags,
            lat,
            lng,
          })
        }
        disabled={!canSave}
        style={{ marginTop: "4px", width: "100%" }}
      >
        {!venue ? (addIntent ? "Créer et ajouter à mes favoris" : "Proposer cet établissement") : suggestMode ? "Envoyer la suggestion" : "Enregistrer"}
      </PrimaryButton>
      <BackFooterLink onClick={onCancel} />
    </div>
  );
}
