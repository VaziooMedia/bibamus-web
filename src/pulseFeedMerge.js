// Fusion des pages du fil BibaPulse (écran BibaPulse).
//
// Le serveur (get_pulse_feed) place en tête de la première page, avant le fil chronologique, un bloc de cartes
// « prioritaires » : celles des marques et des producteurs que la personne a mis en favori (cœur sur la fiche de la marque ou du producteur).
// Chaque carte du bloc porte metadata.priority = true (valeur calculée à la lecture, jamais enregistrée).
// Ce bloc compte 5 cartes au plus, toutes datant de moins de 7 jours.
//
// Ces fonctions gardent ce bloc en tête quand l'écran rafraîchit le haut du fil (toutes les 10 secondes) ou charge
// une page plus ancienne ; elles ne font que réordonner et dédoublonner, jamais retirer une carte.

export function isPriorityPulseEntry(entry) {
  return !!(entry && entry.metadata && entry.metadata.priority === true);
}

const newestFirst = (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();

// prev : le fil déjà affiché (ou null) ; freshTop : la première page, relue. Résultat : le bloc prioritaire du
// serveur d'abord (dans son ordre), puis tout le reste — cartes déjà affichées (mises à jour par la version relue)
// et nouvelles cartes — du plus récent au plus ancien. Une carte qui a quitté le bloc retrouve ainsi sa place
// chronologique, et une nouvelle carte ordinaire ne passe jamais devant le bloc.
export function mergePulseFeedTop(prev, freshTop) {
  if (!prev) return freshTop;
  const freshById = new Map(freshTop.map((e) => [e.id, e]));
  const block = freshTop.filter(isPriorityPulseEntry);
  const blockIds = new Set(block.map((e) => e.id));
  const prevIds = new Set(prev.map((e) => e.id));
  const rest = [
    ...freshTop.filter((e) => !blockIds.has(e.id) && !prevIds.has(e.id)),
    ...prev.filter((e) => !blockIds.has(e.id)).map((e) => freshById.get(e.id) || e),
  ];
  // Tri stable : à date égale, l'ordre ci-dessus (nouvelles cartes d'abord) est conservé.
  rest.sort(newestFirst);
  return [...block, ...rest];
}

// Page plus ancienne : à la suite du fil, sans carte déjà affichée (une carte sortie du bloc entre deux chargements
// peut se retrouver dans la page suivante).
export function appendOlderPulsePage(prev, more) {
  const seen = new Set((prev || []).map((e) => e.id));
  return [...(prev || []), ...more.filter((e) => !seen.has(e.id))];
}
