import React, { useEffect, useRef } from "react";
import { GeocoderAutocomplete } from "@geoapify/geocoder-autocomplete";
import { COLORS } from "../constants.js";

const GEOAPIFY_API_KEY = import.meta.env.VITE_GEOAPIFY_API_KEY || "";

// Deux champs (code postal + ville) qui se remplissent l'un l'autre automatiquement à la
// sélection — évite les doublons linguistiques (Waimes/Weismes) puisque Geoapify renvoie le
// nom dans la langue demandée (lang: "fr"), pas les deux variantes à la fois.
//
// Style entièrement propre à l'app plutôt que le thème par défaut de la librairie (qui jure
// visuellement avec le reste) — géré via la balise <style> ci-dessous, ciblant ses vraies
// classes CSS internes.
//
// Les deux instances Geoapify sont créées UNE SEULE FOIS (pas à chaque changement de pays) —
// on met à jour leur filtre pays via l'API dédiée (clearFilters/addFilterByCountry) plutôt que
// de détruire et recréer l'objet, ce qui laissait auparavant l'ancien filtre actif en silence.
export function AddressAutocomplete({ postalCode, city, countryIsoCode, onPostalCodeChange, onCityChange, required }) {
  const postalRef = useRef(null);
  const cityRef = useRef(null);
  const postalAutocompleteRef = useRef(null);
  const cityAutocompleteRef = useRef(null);

  useEffect(() => {
    if (!GEOAPIFY_API_KEY || !postalRef.current || !cityRef.current) return;

    const postalAutocomplete = new GeocoderAutocomplete(postalRef.current, GEOAPIFY_API_KEY, {
      lang: "fr",
      type: "postcode",
      skipIcons: true,
      placeholder: "Code postal",
    });
    postalAutocomplete.on("select", (result) => {
      const props = result?.properties;
      if (!props) return;
      if (props.postcode) onPostalCodeChange(props.postcode);
      if (props.city) onCityChange(props.city);
    });
    postalAutocompleteRef.current = postalAutocomplete;

    const cityAutocomplete = new GeocoderAutocomplete(cityRef.current, GEOAPIFY_API_KEY, {
      lang: "fr",
      type: "city",
      skipIcons: true,
      placeholder: "Commune",
    });
    cityAutocomplete.on("select", (result) => {
      const props = result?.properties;
      if (!props) return;
      if (props.city) onCityChange(props.city);
      if (props.postcode) onPostalCodeChange(props.postcode);
    });
    cityAutocompleteRef.current = cityAutocomplete;

    return () => {
      postalAutocomplete.destroy?.();
      cityAutocomplete.destroy?.();
      postalAutocompleteRef.current = null;
      cityAutocompleteRef.current = null;
    };
    // Créé une seule fois au montage — le filtre pays se met à jour séparément ci-dessous,
    // sans recréer les instances.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Met à jour le filtre pays sur les instances déjà créées, à chaque changement — sans
  // jamais recréer/détruire les objets Geoapify.
  useEffect(() => {
    [postalAutocompleteRef.current, cityAutocompleteRef.current].forEach((instance) => {
      if (!instance) return;
      instance.clearFilters?.();
      if (countryIsoCode) instance.addFilterByCountry?.([countryIsoCode]);
    });
  }, [countryIsoCode]);

  // Garde les champs synchronisés si la valeur change depuis l'extérieur (ex. chargement
  // d'une fiche existante), sans perturber la saisie en cours.
  useEffect(() => {
    if (postalRef.current) {
      const input = postalRef.current.querySelector("input");
      if (input && input.value !== (postalCode || "")) input.value = postalCode || "";
    }
  }, [postalCode]);
  useEffect(() => {
    if (cityRef.current) {
      const input = cityRef.current.querySelector("input");
      if (input && input.value !== (city || "")) input.value = city || "";
    }
  }, [city]);

  if (!GEOAPIFY_API_KEY) {
    return (
      <p style={{ fontSize: "11px", color: COLORS.inkSoft, gridColumn: "1 / -1" }}>
        Auto-complétion non configurée (clé Geoapify manquante) — les champs restent modifiables à la main ci-dessous.
      </p>
    );
  }

  return (
    <>
      <style>{`
        .geoapify-autocomplete-input {
          width: 100% !important;
          box-sizing: border-box !important;
          padding: 12px 14px !important;
          border-radius: 12px !important;
          border: 2px solid ${COLORS.paperAlt} !important;
          background: ${COLORS.surface} !important;
          color: ${COLORS.ink} !important;
          font-size: 14px !important;
          font-family: inherit !important;
        }
        .geoapify-autocomplete-input:focus { outline: none !important; border-color: ${COLORS.amber} !important; }
        .geoapify-autocomplete-items {
          background: ${COLORS.surface} !important;
          border: 2px solid ${COLORS.paperAlt} !important;
          border-radius: 12px !important;
          margin-top: 4px !important;
          overflow: hidden !important;
          z-index: 1000 !important;
        }
        .geoapify-autocomplete-items > div {
          color: ${COLORS.ink} !important;
          font-size: 13.5px !important;
          padding: 10px 14px !important;
          border-bottom: 1px solid ${COLORS.paperAlt} !important;
        }
        .geoapify-autocomplete-items > div:last-child { border-bottom: none !important; }
        .geoapify-autocomplete-items > div:hover, .geoapify-autocomplete-items > .active {
          background: ${COLORS.amber} !important;
          color: ${COLORS.paper} !important;
        }
        ${required ? `.req-geo-postal .geoapify-autocomplete-input, .req-geo-city .geoapify-autocomplete-input { border-color: ${COLORS.pinkFluo} !important; }` : ""}
        .geoapify-close-button { color: ${COLORS.inkSoft} !important; right: 12px !important; }
        .geoapify-close-button:hover { color: ${COLORS.ink} !important; }
        .geoapify-autocomplete-items { position: absolute !important; }
        .geoapify-close-button {
          position: absolute !important;
          top: 0 !important;
          right: 12px !important;
          height: 100% !important;
          display: none !important;
          align-items: center !important;
        }
        .geoapify-close-button.visible { display: flex !important; }
      `}</style>
      <div>
        <div ref={postalRef} className={required ? "req-geo-postal" : undefined} style={{ position: "relative" }} onInput={(e) => onPostalCodeChange(e.target.value)} />
      </div>
      <div>
        <div ref={cityRef} className={required ? "req-geo-city" : undefined} style={{ position: "relative" }} onInput={(e) => onCityChange(e.target.value)} />
      </div>
    </>
  );
}
