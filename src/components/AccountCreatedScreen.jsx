import React, { useEffect, useRef } from "react";
import { LoadingScreen, LOOP_SECONDS, FADE_FROM } from "./LoadingScreen.jsx";

// Écran affiché juste après la création du compte : uniquement l'animation de l'écran de chargement, reprise telle quelle (la bouteille du logo monte, tremble et saute le
// bouchon, les éclats jaillissent), sans texte. L'écran suivant arrive tout seul à la fin de l'animation, juste avant qu'elle ne s'estompe pour recommencer (ou dès qu'on
// touche l'écran). Sans animation demandée par le système, cet écran n'est jamais montré (voir AuthScreen).

const SHOW_SECONDS = (LOOP_SECONDS * FADE_FROM) / 100;

export function AccountCreatedScreen({ onDone }) {
  const doneRef = useRef(false);
  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    onDone();
  };

  useEffect(() => {
    const timer = setTimeout(finish, SHOW_SECONDS * 1000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div onClick={finish}>
      <LoadingScreen />
    </div>
  );
}
