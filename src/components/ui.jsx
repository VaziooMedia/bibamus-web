// ============================================================
// Composants d'interface partagés — copiés tels quels depuis
// le prototype Claude (boutons, cartes, barre d'accès rapide...).
// ============================================================
import React, { useState } from "react";
import { COLORS } from "../constants.js";
import { NavIcon, TokenPinkIcon, TokenCyanIcon, CountryFlagImg } from "./icons.jsx";
import { NavigationContext, ProfileNavContext } from "../contexts.js";
import { formatMoney, salonSpecialPlace } from "../utils.js";
import homeSalonIconUrl from "../assets/brand/home-icon.svg";
import eventSalonIconUrl from "../assets/brand/event-icon.svg";
import bibaPingIconUrl from "../assets/brand/bibaping.svg";
import bibaPingActiveIconUrl from "../assets/brand/bibaping-active.svg";
import { loadMyUnreadMessageCount, subscribeToMyMessages, onConversationRead } from "../data/messaging.js";

export function useInfiniteScroll(items, pageSize, resetKey) {
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const sentinelRef = React.useRef(null);

  React.useEffect(() => {
    setVisibleCount(pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  React.useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((c) => c + pageSize);
        }
      },
      { rootMargin: "600px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sentinelRef.current, items.length]);

  return { visibleItems: items.slice(0, visibleCount), hasMore: visibleCount < items.length, sentinelRef };
}

// L'appli défile dans un conteneur interne (voir App.jsx), pas dans la page elle-même : on cherche donc
// le plus proche ancêtre qui défile, et à défaut la page.
function findScrollParent(node) {
  for (let el = node ? node.parentElement : null; el && el !== document.body; el = el.parentElement) {
    const overflowY = getComputedStyle(el).overflowY;
    if (overflowY === "auto" || overflowY === "scroll") return el;
  }
  return null;
}

export function ScrollToTopButton() {
  const [visible, setVisible] = useState(false);
  const anchorRef = React.useRef(null);
  const scrollerRef = React.useRef(null);

  React.useEffect(() => {
    const scroller = findScrollParent(anchorRef.current);
    scrollerRef.current = scroller;
    const target = scroller || window;
    const handler = () => {
      const top = scroller ? scroller.scrollTop : window.scrollY;
      const viewport = scroller ? scroller.clientHeight : window.innerHeight;
      const total = scroller ? scroller.scrollHeight : document.body.scrollHeight;
      const nearBottom = viewport + top >= total - 140;
      setVisible(top > 400 && !nearBottom);
    };
    target.addEventListener("scroll", handler);
    window.addEventListener("resize", handler);
    handler();
    return () => {
      target.removeEventListener("scroll", handler);
      window.removeEventListener("resize", handler);
    };
  }, []);

  return (
    <>
      <span ref={anchorRef} aria-hidden="true" style={{ display: "none" }} />
      {visible && (
        <button
          onClick={() => (scrollerRef.current || window).scrollTo({ top: 0, behavior: "smooth" })}
          style={{
            position: "fixed",
            right: "16px",
            bottom: "calc(76px + env(safe-area-inset-bottom, 0px))",
            width: "44px",
            height: "44px",
            borderRadius: "50%",
            background: COLORS.surfaceAlt,
            border: `2px solid ${COLORS.amber}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            boxShadow: "0 4px 10px rgba(0,0,0,0.35)",
            zIndex: 90,
          }}
          title="Remonter en haut"
          aria-label="Remonter en haut"
        >
          <span style={{ display: "inline-flex", transform: "rotate(90deg)" }}>
            <NavIcon name="back-triangle" size={16} color={COLORS.amber} />
          </span>
        </button>
      )}
    </>
  );
}

// Style de titre de section standard dans toute l'app — barre verticale verte fluo + texte
// blanc. Utilisé pour tout titre de sous-section (ex. "Lieu", "Participants", "BibaMusic"...).
export function SectionTitle({ children }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
      <span style={{ width: "4px", height: "16px", background: COLORS.amber, borderRadius: "2px", flexShrink: 0 }} />
      <span style={{ fontWeight: 700, fontSize: "14px", color: COLORS.ink }}>{children}</span>
    </div>
  );
}

// Titre d'un bloc de l'onglet Biba360 d'une fiche produit (« Notes », « Checks », « Où ce produit est le plus consommé ? »…) :
// en blanc cassé et en gras, aligné à gauche, précédé d'une petite barre verticale vert fluo (3 × 14 px, 8 px avant le texte), et séparé
// du contenu par un trait gris fin (le même que celui qui sépare les lignes des listes ; 10 px d'air de chaque côté).
// Si le titre passe sur deux lignes (écran très étroit), la barre reste sur la première.
// `style` : ce qui est propre à un bloc (marges, trait au-dessus).
export function BlockTitle({ children, style }) {
  return (
    <div data-block-title="" style={{ display: "flex", alignItems: "flex-start", gap: "8px", fontSize: "12.5px", fontWeight: 700, color: COLORS.ink, paddingBottom: "10px", marginBottom: "10px", borderBottom: `1px solid ${COLORS.paperAlt}`, ...style }}>
      <span aria-hidden="true" style={{ width: "3px", height: "14px", borderRadius: "2px", background: COLORS.amber, flexShrink: 0 }} />
      {children}
    </div>
  );
}

// Bouton rond « > » discret : un petit chevron vert fluo dans un fin cercle de 14 px, pour qu'on voie quand même que c'est un
// bouton qui ouvre la fiche d'un lieu ou le profil d'un Bibax. Il se pose juste à côté du nom (8 px après lui), jamais en bout de
// ligne après le chiffre, et se centre sur la PREMIÈRE ligne du nom quand celui-ci tient sur deux lignes (Bibax avec surnom,
// nom de lieu long) : le conteneur de la flèche s'aligne en haut de la rangée (`alignSelf`) et contient une ligne de texte
// invisible, de même police que le nom, qui lui donne la hauteur d'une ligne de nom. La zone de toucher déborde du cercle
// d'environ 10 px tout autour (32 px au total, comme avant que le cercle ne rapetisse), sans rien changer à la mise en page.
export function GoButton({ label, onClick }) {
  return (
    <span style={{ display: "flex", alignItems: "center", alignSelf: "flex-start", flexShrink: 0, fontSize: "14px" }}>
      <span aria-hidden="true" style={{ width: 0, overflow: "hidden" }}>{"\u200b"}</span>
      <button
        aria-label={label}
        onClick={onClick}
        style={{ position: "relative", flexShrink: 0, width: "14px", height: "14px", boxSizing: "border-box", borderRadius: "50%", background: "none", border: `1px solid ${COLORS.amber}`, padding: 0, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
      >
        <span aria-hidden="true" style={{ position: "absolute", top: "-10px", right: "-10px", bottom: "-10px", left: "-10px" }} />
        <NavIcon name="chevron-right" size={8} color={COLORS.amber} />
      </button>
    </span>
  );
}

// Affichage standard du nom d'un Bibax — prénom + nom obligatoires, surnom éventuel en plus
// petit à côté. Utilisé partout où un Bibax est listé (relations, demandes, suggestions),
// pour ne jamais se retrouver avec un simple prénom qui ne permet pas de reconnaître qui est
// qui.
export function BibaxName({ name, lastName, nickname, city, locality, country, style }) {
  const fullName = [name, lastName].filter(Boolean).join(" ") || "Bibax";
  const location = city ? (locality ? `${city} (${locality})` : city) : null;
  return (
    <span style={{ display: "inline-flex", flexDirection: "column", minWidth: 0, ...style }}>
      <span style={{ fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{fullName}</span>
      {nickname && <span style={{ fontSize: "0.85em", fontWeight: 400, fontStyle: "italic", color: COLORS.amber, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{nickname}</span>}
      {location && (
        <span style={{ fontSize: "0.8em", fontWeight: 400, color: COLORS.inkSoft, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "inline-flex", alignItems: "center", gap: "4px" }}>
          {location}
          {country && <CountryFlagImg country={country} size={14} />}
        </span>
      )}
    </span>
  );
}

// Ordre de priorité du contenu du rond : photo, puis emoji, puis `fallbackImageUrl` (un picto
// image, occupant `fallbackImageScale` du rond), puis l'icône `fallbackIcon` (le « B » Bibamus
// par défaut).
export function EntityAvatar({ photoUrl, photoEmoji, size = 40, onClick, fallbackIcon = "bibamus-monogram", fallbackColor = COLORS.amber, fallbackImageUrl, fallbackImageScale = 0.62 }) {
  const fallbackImageSize = Math.round(size * fallbackImageScale);
  const content = photoUrl ? null : photoEmoji ? photoEmoji : fallbackImageUrl ? (
    <img src={fallbackImageUrl} alt="" style={{ width: `${fallbackImageSize}px`, height: `${fallbackImageSize}px`, objectFit: "contain", display: "block" }} />
  ) : <NavIcon name={fallbackIcon} size={Math.round(size * 0.58)} color={fallbackColor} />;
  const style = {
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: "50%",
    background: photoUrl ? `${COLORS.paperAlt} url(${photoUrl}) center/cover no-repeat` : COLORS.paperAlt,
    border: `2px solid ${COLORS.paperAlt}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    fontSize: `${Math.round(size * 0.42)}px`,
  };
  if (onClick) {
    return (
      <button onClick={onClick} style={{ ...style, cursor: "pointer", padding: 0 }}>
        {content}
      </button>
    );
  }
  return <span style={style}>{content}</span>;
}

// Rond de profil d'un salon : la photo ou l'emoji de son lieu s'il en a un ; sinon, un salon
// @Home porte une maison et un salon @Event un feu d'artifice (au lieu du « B » Bibamus).
export function SalonAvatar({ event, venue, size = 48 }) {
  const place = salonSpecialPlace(event);
  return (
    <EntityAvatar
      photoUrl={venue ? venue.profilePhotoUrl : null}
      photoEmoji={venue ? venue.avatarEmoji : null}
      size={size}
      fallbackImageUrl={place === "home" ? homeSalonIconUrl : place === "event" ? eventSalonIconUrl : undefined}
    />
  );
}

export function HeaderAvatarButton({ size = 40 }) {
  const { avatarUrl, goToProfile } = React.useContext(ProfileNavContext);
  return (
    <button
      onClick={goToProfile}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: "50%",
        background: COLORS.paperAlt,
        border: `2px solid ${COLORS.paperAlt}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        cursor: "pointer",
        padding: 0,
        fontSize: `${Math.round(size * 0.42)}px`,
        overflow: "hidden",
      }}
      title="Mon profil"
      aria-label="Mon profil"
    >
      {avatarUrl ? (
        <img src={avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <NavIcon name="default-avatar" size={Math.round(size * 0.58)} color={COLORS.amber} />
      )}
    </button>
  );
}

export function PageHeader({ onBack, style, right }) {
  const goHome = React.useContext(NavigationContext);
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", marginBottom: "14px", ...style }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", display: "flex", alignItems: "center" }} title="Retour" aria-label="Retour">
          <NavIcon name="back-triangle" size={22} color={COLORS.amber} />
        </button>
        <button onClick={goHome} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", display: "flex", alignItems: "center" }} title="Accueil" aria-label="Accueil">
          <NavIcon name="home" size={22} color={COLORS.amber} />
        </button>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        {right}
        <HeaderAvatarButton />
      </div>
    </div>
  );
}

export function PageFooterNav({ onBack, hideBorder = false }) {
  const goHome = React.useContext(NavigationContext);
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", marginTop: "24px", paddingTop: "18px", borderTop: hideBorder ? "none" : `1px solid ${COLORS.paperAlt}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", padding: "6px", display: "flex", alignItems: "center" }} title="Retour" aria-label="Retour">
          <NavIcon name="back-triangle" size={22} color={COLORS.amber} />
        </button>
        <button onClick={goHome} style={{ background: "none", border: "none", cursor: "pointer", padding: "6px", display: "flex", alignItems: "center" }} title="Accueil" aria-label="Accueil">
          <NavIcon name="home" size={22} color={COLORS.amber} />
        </button>
      </div>
      <HeaderAvatarButton />
    </div>
  );
}

export function BackFooterLink({ onClick, label }) {
  return <PageFooterNav onBack={onClick} />;
}

export function PrimaryButton({ children, onClick, disabled, style }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: disabled ? COLORS.paperAlt : COLORS.amber,
        color: disabled ? COLORS.inkSoft : COLORS.paper,
        border: "none",
        borderRadius: "10px",
        padding: "14px 20px",
        fontWeight: 700,
        fontSize: "16px",
        fontFamily: "'Work Sans', sans-serif",
        cursor: disabled ? "not-allowed" : "pointer",
        ...style,
      }}
    >
      {children}
    </button>
  );
}

export function ActionCard({ icon, title, subtitle, onClick, highlight, disabled, badge }) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{
        position: "relative",
        textAlign: "left",
        display: "flex",
        alignItems: "center",
        gap: "12px",
        background: COLORS.surface,
        color: COLORS.ink,
        border: `2px solid ${highlight ? COLORS.amber : COLORS.paperAlt}`,
        borderRadius: "12px",
        padding: "14px 16px",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.55 : 1,
        width: "100%",
      }}
    >
      {icon && <span style={{ fontSize: "22px" }}>{icon}</span>}
      <span style={{ display: "flex", flexDirection: "column" }}>
        <span style={{ fontWeight: 700, fontSize: "15px" }}>{title}</span>
        <span style={{ fontSize: "12.5px", opacity: 0.75, marginTop: "2px" }}>{subtitle}</span>
      </span>
      {badge && (
        <span
          style={{
            position: "absolute",
            top: "10px",
            right: "10px",
            fontSize: "9px",
            fontWeight: 700,
            letterSpacing: "0.5px",
            color: COLORS.redFluo,
            background: COLORS.paperAlt,
            borderRadius: "999px",
            padding: "3px 8px",
          }}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

export function CategoryTile({ iconElement, title, subtitle, onClick, badge, countBadge = 0, disabled }) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{
        textAlign: "left",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        background: COLORS.surface,
        border: `2px solid ${COLORS.paperAlt}`,
        borderRadius: "14px",
        padding: "12px 14px",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.55 : 1,
        position: "relative",
        minHeight: "80px",
      }}
    >
      {badge && (
        <span
          style={{
            position: "absolute",
            top: "10px",
            right: "10px",
            fontSize: "9px",
            fontWeight: 700,
            letterSpacing: "0.5px",
            color: COLORS.redFluo,
            background: COLORS.paperAlt,
            borderRadius: "999px",
            padding: "3px 8px",
          }}
        >
          {badge}
        </span>
      )}
      {countBadge > 0 && (
        <span
          style={{
            position: "absolute",
            top: "10px",
            right: "10px",
            minWidth: "20px",
            height: "20px",
            borderRadius: "999px",
            background: COLORS.redFluo,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 5px",
            boxSizing: "border-box",
            fontSize: "11px",
            fontWeight: 700,
            color: "#fff",
            lineHeight: 1,
          }}
        >
          {countBadge > 99 ? "99+" : countBadge}
        </span>
      )}
      {iconElement && <span style={{ display: "flex", lineHeight: 0 }}>{iconElement}</span>}
      <span>
        <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ width: "4px", height: "14px", background: COLORS.amber, borderRadius: "2px", flexShrink: 0 }} />
          <span style={{ fontWeight: 700, fontSize: "14.5px", color: COLORS.ink }}>{title}</span>
        </span>
        {subtitle && <span style={{ fontSize: "11.5px", opacity: 0.7, color: COLORS.ink, display: "block", marginTop: "2px" }}>{subtitle}</span>}
      </span>
    </button>
  );
}

export function MoneyAmount({ value, currency, centered = false, jetonIconSize = 14, jetonIcon = "blue" }) {
  if (currency === "jeton") {
    const n = Math.round(value * 10) / 10;
    const numPart = n % 1 === 0 ? n : n.toFixed(1);
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: "7px" }}>
        {numPart} {jetonIcon === "pink" ? <TokenPinkIcon size={jetonIconSize} /> : jetonIcon === "cyan" ? <TokenCyanIcon size={jetonIconSize} /> : <NavIcon name="jeton-token" size={jetonIconSize} color="#0040ef" />}
      </span>
    );
  }
  const formatted = formatMoney(value, currency);
  if (currency !== "euro") return formatted;
  const numPart = formatted.replace(" €", "");
  if (centered) {
    return (
      <span style={{ position: "relative", display: "inline-block" }}>
        {numPart}
        <span style={{ position: "absolute", left: "100%", top: "50%", transform: "translateY(-50%)", marginLeft: "2px", fontSize: "0.5em", color: COLORS.inkSoft, fontWeight: 600 }}>€</span>
      </span>
    );
  }
  return (
    <>
      {numPart} <span style={{ fontSize: "0.5em", color: COLORS.inkSoft, fontWeight: 600 }}>€</span>
    </>
  );
}

export function BottomNav({ screen, onNavigate, onGoToSessionHub, unreadNotifications = 0, bibaPingVisible = true, hidden = false }) {
  // Hauteur réelle de la barre : sert à la replier complètement (la zone de contenu récupère sa place).
  const barRef = React.useRef(null);
  const [barHeight, setBarHeight] = useState(56);
  React.useLayoutEffect(() => {
    const node = barRef.current;
    if (!node) return undefined;
    const measure = () => setBarHeight(node.offsetHeight || 56);
    measure();
    if (typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // Messages non lus — chargé ici plutôt que reçu en propriété : la barre est présente sur
  // tous les écrans, c'est le seul endroit qui en a besoin en permanence.
  const [unreadMessages, setUnreadMessages] = useState(0);
  const refreshUnread = React.useCallback(() => {
    loadMyUnreadMessageCount().then(setUnreadMessages);
  }, []);

  // Relevé à chaque changement d'écran — c'est ce qui met la pastille à jour dès qu'on sort
  // d'une conversation, où les messages viennent d'être marqués comme lus.
  React.useEffect(() => {
    refreshUnread();
  }, [screen, refreshUnread]);

  // Temps réel : la pastille s'incrémente dès qu'un message arrive, sans attendre. Le relevé
  // périodique reste en filet, au cas où l'abonnement saute (réseau coupé, onglet en veille).
  React.useEffect(() => {
    // Deux sources : l'arrivée d'un message, et la lecture d'une conversation — cette
    // dernière ne produit aucun événement temps réel.
    const unsubscribeRead = onConversationRead(refreshUnread);
    const unsubscribe = subscribeToMyMessages(() => {
      refreshUnread();
    });
    const interval = setInterval(refreshUnread, 120000);
    return () => {
      unsubscribe();
      unsubscribeRead();
      clearInterval(interval);
    };
  }, [refreshUnread]);

  const items = [
    { key: "home", label: "Home", accent: "", icon: "ti-home" },
    { key: "bibaPulse", label: "Biba", accent: "Pulse", icon: "ti-activity" },
  ];
  const active = (key) => screen === key;

  return (
    <div
      ref={barRef}
      aria-hidden={hidden}
      style={{
        width: "100%",
        flexShrink: 0,
        background: COLORS.surface,
        borderTop: `2px solid ${COLORS.paperAlt}`,
        display: "flex",
        justifyContent: "space-around",
        alignItems: "flex-end",
        padding: "4px 4px calc(6px + env(safe-area-inset-bottom, 0px))",
        // Repliée : la barre glisse hors de l'écran et ne prend plus de place (marge négative égale
        // à sa hauteur) ; la zone de contenu s'agrandit d'autant.
        marginBottom: hidden ? -barHeight : 0,
        transform: hidden ? `translateY(${barHeight}px)` : "none",
        transition: "transform 0.25s ease, margin-bottom 0.25s ease",
        pointerEvents: hidden ? "none" : "auto",
      }}
    >
      {items.map((item) => (
        <button
          key={item.key}
          onClick={() => onNavigate(item.key)}
          style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", padding: "3px 8px", flex: 1 }}
        >
          <NavIcon name={item.icon.slice(3)} size={20} color={active(item.key) ? COLORS.pinkFluo : COLORS.amber} />
          <span style={{ fontSize: "10px", fontWeight: active(item.key) ? 700 : 600 }}>
            <span style={{ color: COLORS.ink }}>{item.label}</span>
            <span style={{ color: active(item.key) ? COLORS.pinkFluo : COLORS.amber }}>{item.accent}</span>
          </span>
        </button>
      ))}

      <button
        onClick={onGoToSessionHub}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "3px",
          padding: 0,
          flex: 1,
          position: "relative",
        }}
      >
        <span
          style={{
            width: "56px",
            height: "56px",
            borderRadius: "50%",
            background: active("sessionHub") ? COLORS.pinkFluo : COLORS.paperAlt,
            border: `3px solid ${COLORS.surface}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginTop: "-30px",
            boxShadow: "0 4px 10px rgba(0,0,0,0.35)",
          }}
        >
          <NavIcon name="bibago-nav" size={22} color={active("sessionHub") ? COLORS.paper : COLORS.amber} />
        </span>
        <span style={{ fontSize: "10px", fontWeight: active("sessionHub") ? 700 : 600 }}>
          <span style={{ color: COLORS.ink }}>Biba</span>
          <span style={{ color: active("sessionHub") ? COLORS.pinkFluo : COLORS.amber }}>Go</span>
        </span>
      </button>

      {bibaPingVisible && (
      <button
        onClick={() => onNavigate("bibaPing")}
        style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", padding: "3px 8px", flex: 1 }}
      >
        {/* Icône fournie en SVG : contrainte en hauteur uniquement, pour ne pas déformer un
            ratio non carré. Deux fichiers plutôt qu'une couleur pilotée par le code, car la
            couleur d'un SVG importé en image n'est pas modifiable ici. */}
        <span style={{ position: "relative", display: "inline-block", lineHeight: 0 }}>
          <img src={active("bibaPing") ? bibaPingActiveIconUrl : bibaPingIconUrl} alt="" style={{ height: "20px" }} />
          {unreadMessages > 0 && (
            <span
              style={{
                position: "absolute",
                top: "-6px",
                right: "-10px",
                minWidth: "16px",
                height: "16px",
                borderRadius: "999px",
                background: "#FF3B3B",
                border: `2px solid ${COLORS.surface}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "0 3px",
                boxSizing: "border-box",
                fontSize: "9px",
                fontWeight: 700,
                color: "#fff",
                lineHeight: 1,
              }}
            >
              {unreadMessages > 9 ? "9+" : unreadMessages}
            </span>
          )}
        </span>
        <span style={{ fontSize: "10px", fontWeight: active("bibaPing") ? 700 : 600 }}>
          <span style={{ color: COLORS.ink }}>Biba</span>
          <span style={{ color: active("bibaPing") ? COLORS.pinkFluo : COLORS.amber }}>Ping</span>
        </span>
      </button>
      )}

      <button
        onClick={() => onNavigate("notificationsFeed")}
        style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", padding: "3px 8px", flex: 1, position: "relative" }}
      >
        <span style={{ position: "relative", display: "inline-block", lineHeight: 0 }}>
          <NavIcon name="bell" size={22} color={active("notificationsFeed") ? COLORS.pinkFluo : COLORS.amber} />
          {unreadNotifications > 0 && (
            <span
              style={{
                position: "absolute",
                top: "-6px",
                right: "-10px",
                minWidth: "16px",
                height: "16px",
                borderRadius: "999px",
                background: "#FF3B3B",
                border: `2px solid ${COLORS.surface}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "0 3px",
                boxSizing: "border-box",
                fontSize: "9px",
                fontWeight: 700,
                color: "#fff",
                lineHeight: 1,
              }}
            >
              {unreadNotifications > 9 ? "9+" : unreadNotifications}
            </span>
          )}
        </span>
        <span style={{ fontSize: "10px", fontWeight: active("notificationsFeed") ? 700 : 600, color: COLORS.ink }}>Notifications</span>
      </button>
    </div>
  );
}
