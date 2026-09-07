// Ce fichier tourne en dehors de l'app React, dans un contexte séparé (service worker) —
// il gère les notifications reçues quand l'app est fermée ou en arrière-plan. Il doit rester
// à la racine du site (public/) pour pouvoir intercepter les requêtes de toute l'app.
importScripts("https://www.gstatic.com/firebasejs/12.0.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.0.0/firebase-messaging-compat.js");

// Même configuration que src/firebaseClient.js — dupliquée ici car un service worker ne peut
// pas importer depuis le bundle de l'app.
firebase.initializeApp({
  apiKey: "AIzaSyDuszqCissxj-dgrQReBPfdBQm_zjKfM5s",
  authDomain: "bibamus-app.firebaseapp.com",
  projectId: "bibamus-app",
  storageBucket: "bibamus-app.firebasestorage.app",
  messagingSenderId: "581878300200",
  appId: "1:581878300200:web:b2c8f4a98994a85097ff1d",
});

const messaging = firebase.messaging();

// PAS de gestionnaire onBackgroundMessage ici volontairement : notre fonction serveur envoie un
// message avec un champ "notification" (title/body), que Firebase affiche déjà tout seul
// automatiquement quand l'app est en arrière-plan. Ajouter un onBackgroundMessage qui appelle
// SA PROPRE showNotification() pour ce même message causait un AFFICHAGE EN DOUBLE (celui
// automatique de Firebase + le nôtre) — c'était la cause des notifications reçues deux fois.

// Au clic sur la notification, ouvre ou ramène l'app au premier plan.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientsArr) => {
      if (clientsArr.length > 0) {
        return clientsArr[0].focus();
      }
      return self.clients.openWindow("/");
    })
  );
});
