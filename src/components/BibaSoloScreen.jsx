// ============================================================
// BibaSolo — accessible depuis BibaGo. Historique continu de
// consommations personnelles, sans notion de session/salon :
// on choisit une boisson, un prix (obligatoire), un lieu
// (optionnel), et c'est tout. Récapitulatif du jour visible en
// direct au-dessus de la liste.
// ============================================================
import React, { useState, useEffect, useMemo } from "react";
import { COLORS } from "../constants.js";
import { NavIcon } from "./icons.jsx";
import { PageHeader, PageFooterNav, PrimaryButton, EntityAvatar } from "./ui.jsx";
import { addSoloCheckin, loadMySoloCheckins, deleteSoloCheckin } from "../data/sharedDirectories.js";

function normalize(str) {
  return (str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function startOfTodayIso() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function formatDateTime(iso) {
  const d = new Date(iso);
  const time = d.toLocaleTimeString("fr-BE", { hour: "2-digit", minute: "2-digit" });
  const today = new Date();
  const isToday = d.toDateString() === today.toDateString();
  if (isToday) return time;
  const date = d.toLocaleDateString("fr-BE", { day: "2-digit", month: "2-digit" });
  return `${date} à ${time}`;
}

function drinkCalories(drink) {
  if (!drink?.kcalPer100ml) return 0;
  const volume = drink.defaultVolumeCl || 25;
  return Math.round((drink.kcalPer100ml * volume) / 100);
}

// Écran d'ajout — recherche une boisson, prix obligatoire, lieu optionnel.
function AddSoloCheckinScreen({ drinksDirectory, venues, myUserId, onDone, onBack }) {
  const [query, setQuery] = useState("");
  const [selectedDrink, setSelectedDrink] = useState(null);
  const [price, setPrice] = useState("");
  const [venueQuery, setVenueQuery] = useState("");
  const [selectedVenue, setSelectedVenue] = useState(null);
  const [saving, setSaving] = useState(false);

  const q = normalize(query);
  const drinkResults = useMemo(() => (q.length < 2 ? [] : drinksDirectory.filter((d) => normalize(d.name).includes(q)).slice(0, 8)), [drinksDirectory, q]);

  const vq = normalize(venueQuery);
  const venueResults = useMemo(() => (vq.length < 2 ? [] : venues.filter((v) => normalize(v.name).includes(vq)).slice(0, 6)), [venues, vq]);

  const handleSubmit = async () => {
    if (!selectedDrink || !price) return;
    setSaving(true);
    await addSoloCheckin(myUserId, selectedDrink.id, parseFloat(price.replace(",", ".")), selectedVenue?.id);
    setSaving(false);
    onDone();
  };

  return (
    <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onBack} />
      <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "22px", margin: "4px 0 18px" }}>Ajouter un verre</h1>

      {!selectedDrink ? (
        <>
          <label style={{ fontSize: "12px", fontWeight: 600, color: COLORS.inkSoft, marginBottom: "6px", display: "block" }}>Quelle boisson ?</label>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher une boisson..."
            autoFocus
            style={{ width: "100%", boxSizing: "border-box", padding: "12px 14px", borderRadius: "12px", border: `2px solid ${COLORS.paperAlt}`, background: COLORS.surface, color: COLORS.ink, fontSize: "14px" }}
          />
          {drinkResults.length > 0 && (
            <div style={{ marginTop: "10px", background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "0 12px" }}>
              {drinkResults.map((d, i) => (
                <button
                  key={d.id}
                  onClick={() => setSelectedDrink(d)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    width: "100%",
                    background: "none",
                    border: "none",
                    borderBottom: i === drinkResults.length - 1 ? "none" : `1px solid ${COLORS.paperAlt}`,
                    padding: "12px 4px",
                    textAlign: "left",
                    cursor: "pointer",
                    color: COLORS.ink,
                  }}
                >
                  <NavIcon name="bottle" size={16} color={COLORS.amber} />
                  <span style={{ flex: 1, fontSize: "14px", fontWeight: 600 }}>{d.name}</span>
                  <span style={{ fontSize: "12px", color: COLORS.inkSoft }}>{d.type}</span>
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              background: COLORS.surface,
              border: `2px solid ${COLORS.amber}`,
              borderRadius: "12px",
              padding: "12px 14px",
              marginBottom: "18px",
            }}
          >
            <NavIcon name="bottle" size={18} color={COLORS.amber} />
            <span style={{ flex: 1, fontSize: "14px", fontWeight: 700 }}>{selectedDrink.name}</span>
            <button onClick={() => setSelectedDrink(null)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
              <NavIcon name="x" size={15} color={COLORS.inkSoft} />
            </button>
          </div>

          <label style={{ fontSize: "12px", fontWeight: 600, color: COLORS.inkSoft, marginBottom: "6px", display: "block" }}>Prix payé (€)</label>
          <input
            type="text"
            inputMode="decimal"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="ex. 4,50"
            autoFocus
            style={{ width: "100%", boxSizing: "border-box", padding: "12px 14px", borderRadius: "12px", border: `2px solid ${COLORS.paperAlt}`, background: COLORS.surface, color: COLORS.ink, fontSize: "14px", marginBottom: "18px" }}
          />

          <label style={{ fontSize: "12px", fontWeight: 600, color: COLORS.inkSoft, marginBottom: "6px", display: "block" }}>Lieu (optionnel)</label>
          {selectedVenue ? (
            <div style={{ display: "flex", alignItems: "center", gap: "10px", background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "12px 14px" }}>
              <NavIcon name="map-pin" size={16} color={COLORS.amber} />
              <span style={{ flex: 1, fontSize: "14px", fontWeight: 600 }}>{selectedVenue.name}</span>
              <button onClick={() => setSelectedVenue(null)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                <NavIcon name="x" size={15} color={COLORS.inkSoft} />
              </button>
            </div>
          ) : (
            <>
              <input
                type="text"
                value={venueQuery}
                onChange={(e) => setVenueQuery(e.target.value)}
                placeholder="Rechercher un lieu..."
                style={{ width: "100%", boxSizing: "border-box", padding: "12px 14px", borderRadius: "12px", border: `2px solid ${COLORS.paperAlt}`, background: COLORS.surface, color: COLORS.ink, fontSize: "14px" }}
              />
              {venueResults.length > 0 && (
                <div style={{ marginTop: "10px", background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "0 12px" }}>
                  {venueResults.map((v, i) => (
                    <button
                      key={v.id}
                      onClick={() => {
                        setSelectedVenue(v);
                        setVenueQuery("");
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        width: "100%",
                        background: "none",
                        border: "none",
                        borderBottom: i === venueResults.length - 1 ? "none" : `1px solid ${COLORS.paperAlt}`,
                        padding: "12px 4px",
                        textAlign: "left",
                        cursor: "pointer",
                        color: COLORS.ink,
                      }}
                    >
                      <NavIcon name="map-pin" size={16} color={COLORS.amber} />
                      <span style={{ flex: 1, fontSize: "14px", fontWeight: 600 }}>{v.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          <PrimaryButton onClick={handleSubmit} disabled={!price || saving} style={{ width: "100%", marginTop: "24px" }}>
            {saving ? "Enregistrement..." : "Ajouter"}
          </PrimaryButton>
        </>
      )}

      <PageFooterNav onBack={onBack} />
    </div>
  );
}

export function BibaSoloScreen({ drinksDirectory = [], venues = [], myUserId, onOpenDrink, onBack }) {
  const [checkins, setCheckins] = useState(null);
  const [adding, setAdding] = useState(false);

  const refresh = () => loadMySoloCheckins(startOfTodayIso()).then(setCheckins);
  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const drinksById = useMemo(() => Object.fromEntries(drinksDirectory.map((d) => [String(d.id), d])), [drinksDirectory]);
  const venuesById = useMemo(() => Object.fromEntries(venues.map((v) => [String(v.id), v])), [venues]);

  const totals = useMemo(() => {
    if (!checkins) return { count: 0, price: 0, kcal: 0 };
    return checkins.reduce(
      (acc, c) => {
        const drink = drinksById[String(c.drinkId)];
        return {
          count: acc.count + 1,
          price: acc.price + (c.price || 0),
          kcal: acc.kcal + (drink ? drinkCalories(drink) : 0),
        };
      },
      { count: 0, price: 0, kcal: 0 }
    );
  }, [checkins, drinksById]);

  const handleDelete = async (id) => {
    setCheckins((prev) => prev.filter((c) => c.id !== id));
    await deleteSoloCheckin(id);
  };

  const handleReset = async () => {
    if (!checkins || checkins.length === 0) return;
    if (!window.confirm("Tout effacer pour aujourd'hui ? Cette action est irréversible.")) return;
    const ids = checkins.map((c) => c.id);
    setCheckins([]);
    await Promise.all(ids.map((id) => deleteSoloCheckin(id)));
  };

  if (adding) {
    return (
      <AddSoloCheckinScreen
        drinksDirectory={drinksDirectory}
        venues={venues}
        myUserId={myUserId}
        onBack={() => setAdding(false)}
        onDone={() => {
          setAdding(false);
          refresh();
        }}
      />
    );
  }

  return (
    <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onBack} />
      <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "4px 0 18px 0" }}>
        <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "46px", height: "46px", borderRadius: "50%", background: COLORS.paperAlt, flexShrink: 0 }}>
          <NavIcon name="bottle" size={22} color={COLORS.amber} />
        </span>
        <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "26px", margin: 0, flex: 1 }}>
          <span style={{ color: COLORS.ink }}>Biba</span>
          <span style={{ color: COLORS.amber }}>Solo</span>
        </h1>
        <button
          onClick={handleReset}
          title="Réinitialiser aujourd'hui"
          style={{ background: "none", border: `2px solid ${COLORS.paperAlt}`, borderRadius: "10px", padding: "8px", cursor: "pointer", display: "flex" }}
        >
          <NavIcon name="refresh" size={16} color={COLORS.inkSoft} />
        </button>
      </div>

      <div style={{ display: "flex", gap: "10px", marginBottom: "18px" }}>
        <div style={{ flex: 1, background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "14px", textAlign: "center" }}>
          <div style={{ fontSize: "22px", fontWeight: 800, color: COLORS.amber }}>{totals.count}</div>
          <div style={{ fontSize: "11px", color: COLORS.inkSoft, marginTop: "2px" }}>{totals.count <= 1 ? "Verre" : "Verres"}</div>
        </div>
        <div style={{ flex: 1, background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "14px", textAlign: "center" }}>
          <div style={{ fontSize: "22px", fontWeight: 800, color: COLORS.amber }}>
            {totals.price.toFixed(2)} <span style={{ fontSize: "13px", color: COLORS.inkSoft, fontWeight: 600 }}>€</span>
          </div>
          <div style={{ fontSize: "11px", color: COLORS.inkSoft, marginTop: "2px" }}>Dépensé</div>
        </div>
        <div style={{ flex: 1, background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "14px", textAlign: "center" }}>
          <div style={{ fontSize: "22px", fontWeight: 800, color: COLORS.amber }}>{totals.kcal}</div>
          <div style={{ fontSize: "11px", color: COLORS.inkSoft, marginTop: "2px" }}>Kcal</div>
        </div>
      </div>

      <PrimaryButton onClick={() => setAdding(true)} style={{ width: "100%", marginBottom: "20px" }}>
        + Ajouter un verre
      </PrimaryButton>

      <div style={{ flex: 1, overflowY: "auto" }}>
        {checkins === null ? (
          <p style={{ fontSize: "13px", color: COLORS.inkSoft, textAlign: "center", marginTop: "20px" }}>Chargement...</p>
        ) : checkins.length === 0 ? (
          <p style={{ fontSize: "13px", color: COLORS.inkSoft, textAlign: "center", marginTop: "20px" }}>Rien d'encodé aujourd'hui.</p>
        ) : (
          <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "0 14px" }}>
            {checkins.map((c, i) => {
              const drink = drinksById[String(c.drinkId)];
              const venue = c.venueId ? venuesById[String(c.venueId)] : null;
              return (
                <div
                  key={c.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "12px 0",
                    borderBottom: i === checkins.length - 1 ? "none" : `1px solid ${COLORS.paperAlt}`,
                  }}
                >
                  <button
                    onClick={() => drink && onOpenDrink && onOpenDrink(drink.id)}
                    disabled={!drink || !onOpenDrink}
                    style={{ background: "none", border: "none", padding: 0, cursor: drink && onOpenDrink ? "pointer" : "default", flexShrink: 0 }}
                  >
                    <EntityAvatar size={36} fallbackIcon="bottle" />
                  </button>
                  <button
                    onClick={() => drink && onOpenDrink && onOpenDrink(drink.id)}
                    disabled={!drink || !onOpenDrink}
                    style={{ flex: 1, minWidth: 0, background: "none", border: "none", padding: 0, textAlign: "left", cursor: drink && onOpenDrink ? "pointer" : "default" }}
                  >
                    <div style={{ fontSize: "14px", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: COLORS.ink }}>{drink?.name || "Boisson"}</div>
                    <div style={{ fontSize: "12px", color: COLORS.inkSoft }}>
                      {venue ? `${venue.name} · ` : ""}
                      {formatDateTime(c.createdAt)}
                    </div>
                  </button>
                  {c.price != null && (
                    <span style={{ fontSize: "13px", fontWeight: 700, color: COLORS.amber }}>
                      {c.price.toFixed(2)} <span style={{ fontSize: "11px", color: COLORS.inkSoft, fontWeight: 600 }}>€</span>
                    </span>
                  )}
                  <button onClick={() => handleDelete(c.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px" }}>
                    <NavIcon name="trash" size={14} color={COLORS.inkSoft} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <PageFooterNav onBack={onBack} />
    </div>
  );
}
