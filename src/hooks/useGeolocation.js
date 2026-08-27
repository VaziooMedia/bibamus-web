import { useState } from "react";

// État possible : "idle" (pas encore demandé), "loading", "granted", "denied", "unavailable"
// (navigateur sans support), "error" (échec ponctuel, ex. GPS indisponible temporairement).
// N'appelle jamais getCurrentPosition automatiquement — c'est à l'appelant de déclencher
// requestPosition() au bon moment (ex. clic sur "Suggérer des lieux proches"), jamais en
// silence à l'ouverture d'un écran.
export function useGeolocation() {
  const [status, setStatus] = useState("idle");
  const [position, setPosition] = useState(null);
  const [error, setError] = useState(null);

  const requestPosition = () => {
    if (!("geolocation" in navigator)) {
      setStatus("unavailable");
      return;
    }
    setStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setStatus("granted");
      },
      (err) => {
        setError(err.message);
        setStatus(err.code === err.PERMISSION_DENIED ? "denied" : "error");
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
    );
  };

  return { status, position, error, requestPosition };
}
