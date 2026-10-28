// ============================================================
// Carte publique d'une fiche (lieu, marque, producteur) pour une personne SANS compte qui ouvre un lien bibamus.app/@nom.
//
// Elle montre le strict minimum : nom, photo, genre, types, ville et pays — rien d'autre (ni adresse, ni horaires, ni contact,
// ni produits : la base ne les rend pas, voir get_public_card). Le bouton « Ouvrir dans Bibamus » mène à l'écran de connexion /
// d'inscription ; le lien reste mémorisé et ouvre la fiche complète juste après la connexion.
//
// PublicLinkGate décide de ce qu'un visiteur voit à l'ouverture d'un lien : la carte si la fiche en a une, sinon directement
// l'écran de connexion — un compte et un nom inconnu donnent exactement la même chose (aucune carte, aucun message).
// ============================================================
import React, { useEffect, useState } from "react";
import { COLORS } from "../constants.js";
import { loadPublicCard, loadVenueListsOnce, loadProducerListsOnce, loadBrandListsOnce } from "../data/sharedDirectories.js";
import { publicCardTexts } from "../publicCard.js";
import { customNames, VENUE_TYPE_LIST_KEY } from "../venueLists.js";
import { PRODUCER_TYPE_LIST_KEY } from "../producerLists.js";
import { BRAND_TYPE_LIST_KEY } from "../brandLists.js";
import { EntityAvatar } from "./ui.jsx";

// La liste de types modifiable de chaque genre de fiche, et sa lecture.
const TYPE_LISTS = {
  venue: { key: VENUE_TYPE_LIST_KEY, load: loadVenueListsOnce },
  brand: { key: BRAND_TYPE_LIST_KEY, load: loadBrandListsOnce },
  brewery: { key: PRODUCER_TYPE_LIST_KEY, load: loadProducerListsOnce },
};

const LOAD_TIMEOUT_MS = 6000;
// Les noms de types sont un détail : si leur lecture traîne, on garde les noms de départ plutôt que de faire attendre.
const NAMES_TIMEOUT_MS = 2500;

const chipStyle = { fontSize: "11.5px", fontWeight: 600, padding: "4px 10px", borderRadius: "999px", border: `1px solid ${COLORS.paperAlt}`, background: COLORS.surface, color: COLORS.ink };

export function PublicCardScreen({ texts, onOpen }) {
  const cover = texts.coverUrl ? `${COLORS.surfaceAlt} url("${texts.coverUrl}") center/cover no-repeat` : COLORS.surfaceAlt;
  return (
    <div style={{ height: "100dvh", overflowY: "auto", background: COLORS.paper, color: COLORS.ink, display: "flex", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: "480px", minHeight: "100%", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "calc(env(safe-area-inset-top) + 16px) 20px 14px" }}>
          <img src="/bibamus-logo.svg" alt="Bibamus" style={{ width: "120px", display: "block", margin: "0 auto" }} />
        </div>
        <div style={{ position: "relative", height: "150px", background: cover }}>
          <div style={{ position: "absolute", bottom: "-45px", left: "20px", border: `3px solid ${COLORS.paper}`, borderRadius: "50%", lineHeight: 0 }}>
            <EntityAvatar photoUrl={texts.photoUrl} size={90} />
          </div>
        </div>
        <div style={{ padding: "58px 20px 0" }}>
          <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "22px", lineHeight: 1.25, margin: 0, color: COLORS.chalkWhite, overflowWrap: "anywhere" }}>{texts.name}</h1>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "12px" }}>
            <span style={{ ...chipStyle, color: COLORS.amber, borderColor: COLORS.amber }}>{texts.kindLabel}</span>
            {texts.types.map((label) => (
              <span key={label} style={chipStyle}>{label}</span>
            ))}
          </div>
          {texts.place && <p style={{ fontSize: "14px", color: COLORS.inkSoft, margin: "12px 0 0", overflowWrap: "anywhere" }}>{texts.place}</p>}
        </div>
        <div style={{ flex: 1, minHeight: "24px" }} />
        <div style={{ padding: "20px 20px calc(env(safe-area-inset-bottom) + 28px)" }}>
          <button
            onClick={onOpen}
            style={{ width: "100%", padding: "14px", borderRadius: "10px", border: "none", background: COLORS.amber, color: COLORS.paper, fontWeight: 700, fontSize: "15px", cursor: "pointer" }}
          >
            Ouvrir dans Bibamus
          </button>
          <p style={{ fontSize: "12.5px", color: COLORS.inkSoft, lineHeight: 1.5, textAlign: "center", margin: "12px 0 0" }}>
            Connecte-toi ou crée ton compte pour voir la fiche en entier.
          </p>
        </div>
      </div>
    </div>
  );
}

// `authScreen` : l'écran de connexion de l'app (déjà prêt), montré tel quel quand il n'y a pas de carte ou après le bouton.
export function PublicLinkGate({ name, authScreen }) {
  const [state, setState] = useState({ loading: true, card: null, typeNames: null });
  const [opened, setOpened] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setState({ loading: true, card: null, typeNames: null });
    // Une base qui ne répond pas ne doit pas laisser la personne devant un écran vide : au bout de quelques secondes, écran de connexion.
    const timeout = new Promise((resolve) => setTimeout(() => resolve(null), LOAD_TIMEOUT_MS));
    Promise.race([loadPublicCard(name).catch(() => null), timeout]).then(async (card) => {
      // Pour un lieu, une marque ou un producteur : les noms de types enregistrés par la plateforme de gestion. Sans eux (panne,
      // lenteur), les noms de départ.
      let typeNames = null;
      const typeList = card && typeof card.kind === "string" && Object.prototype.hasOwnProperty.call(TYPE_LISTS, card.kind) ? TYPE_LISTS[card.kind] : null;
      if (typeList) {
        const lists = await Promise.race([typeList.load().catch(() => null), new Promise((resolve) => setTimeout(() => resolve(null), NAMES_TIMEOUT_MS))]);
        typeNames = lists ? customNames(lists[typeList.key].rows) : null;
      }
      if (!cancelled) setState({ loading: false, card, typeNames });
    });
    return () => {
      cancelled = true;
    };
  }, [name]);

  if (opened) return authScreen;
  if (state.loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#F2F2E8", fontFamily: "sans-serif" }}>
        Chargement...
      </div>
    );
  }
  const texts = publicCardTexts(state.card, state.typeNames);
  if (!texts) return authScreen;
  return <PublicCardScreen texts={texts} onOpen={() => setOpened(true)} />;
}
