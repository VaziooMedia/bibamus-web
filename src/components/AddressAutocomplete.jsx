import React, { useEffect, useRef } from "react";
import { GeocoderAutocomplete } from "@geoapify/geocoder-autocomplete";
import "@geoapify/geocoder-autocomplete/styles/minimal-dark.css";

const GEOAPIFY_API_KEY = import.meta.env.VITE_GEOAPIFY_API_KEY || "";

// Deux champs (code postal + ville) qui se remplissent l'un l'autre automatiquement à la
// sélection — évite les doublons linguistiques (Waimes/Weismes) puisque Geoapify renvoie le
// nom dans la langue demandée (lang: "fr"), pas les deux variantes à la fois.
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
      placeholder: "",
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
      placeholder: "",
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
      <p style={{ fontSize: "11px", color: "#8792A6", gridColumn: "1 / -1" }}>
        Auto-complétion non configurée (clé Geoapify manquante) — les champs restent modifiables à la main ci-dessous.
      </p>
    );
  }

  return (
    <>
      {required && (
        <style>{`
          .req-geo-postal .geoapify-autocomplete-input, .req-geo-city .geoapify-autocomplete-input {
            border-color: #FF3B4E !important;
          }
        `}</style>
      )}
      <div>
        <label style={{ display: "block", fontSize: "12px", color: "#8792A6", fontWeight: 600, marginBottom: "4px" }}>Code postal</label>
        <div ref={postalRef} className={required ? "req-geo-postal" : undefined} style={{ position: "relative" }} onInput={(e) => onPostalCodeChange(e.target.value)} />
      </div>
      <div>
        <label style={{ display: "block", fontSize: "12px", color: "#8792A6", fontWeight: 600, marginBottom: "4px" }}>Commune</label>
        <div ref={cityRef} className={required ? "req-geo-city" : undefined} style={{ position: "relative" }} onInput={(e) => onCityChange(e.target.value)} />
      </div>
    </>
  );
}
