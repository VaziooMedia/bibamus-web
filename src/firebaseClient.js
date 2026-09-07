import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyDuszqCissxj-dgrQReBPfdBQm_zjKfM5s",
  authDomain: "bibamus-app.firebaseapp.com",
  projectId: "bibamus-app",
  storageBucket: "bibamus-app.firebasestorage.app",
  messagingSenderId: "581878300200",
  appId: "1:581878300200:web:b2c8f4a98994a85097ff1d",
  measurementId: "G-WGW3S3J9V9",
};

// Clé VAPID publique, générée dans Firebase Console → Paramètres du projet → Cloud Messaging
// → Certificats push web. Nécessaire pour que le navigateur puisse s'abonner aux notifications.
const VAPID_KEY = "BEvIN9h7fW2f2q4O7V8n140J3o8BSrjVdrP43OOjO8S8xOkuHGZdvbo0phoukMsWFUIbSWUmjJBAACtg1OBVmcc";

const firebaseApp = initializeApp(firebaseConfig);

// getMessaging() échoue silencieusement sur certains environnements (Safari en mode non-PWA,
// navigateurs sans support des service workers) — isSupported() vérifie avant d'initialiser.
let messagingInstance = null;
async function getMessagingInstance() {
  if (messagingInstance) return messagingInstance;
  if (!(await isSupported())) return null;
  messagingInstance = getMessaging(firebaseApp);
  return messagingInstance;
}

// Demande la permission de notification au visiteur, puis récupère le jeton d'appareil FCM.
// Renvoie null si refusé, non supporté (ex. Safari hors PWA), ou en cas d'erreur.
export async function requestNotificationPermissionAndGetToken() {
  try {
    const messaging = await getMessagingInstance();
    if (!messaging) return null;

    const permission = await Notification.requestPermission();
    if (permission !== "granted") return null;

    const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
    const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration });
    return token || null;
  } catch (err) {
    console.error("requestNotificationPermissionAndGetToken:", err);
    return null;
  }
}

// Écoute les notifications reçues PENDANT que l'app est ouverte au premier plan — Firebase
// n'affiche pas automatiquement de notification système dans ce cas, contrairement à quand
// l'app est en arrière-plan (géré par le service worker). callback reçoit { title, body }.
export async function onForegroundNotification(callback) {
  const messaging = await getMessagingInstance();
  if (!messaging) return () => {};
  return onMessage(messaging, (payload) => {
    callback({
      title: payload.notification?.title || "",
      body: payload.notification?.body || "",
    });
  });
}
