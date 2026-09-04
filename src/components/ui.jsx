// ============================================================
// Composants d'interface partagés — copiés tels quels depuis
// le prototype Claude (boutons, cartes, barre d'accès rapide...).
// ============================================================
import React, { useState } from "react";
import { COLORS } from "../constants.js";
import { NavIcon } from "./icons.jsx";
import { NavigationContext, ProfileNavContext } from "../contexts.js";
import { formatMoney } from "../utils.js";

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

export function ScrollToTopButton() {
  const [visible, setVisible] = useState(false);

  React.useEffect(() => {
    const handler = () => {
      const nearBottom = window.innerHeight + window.scrollY >= document.body.scrollHeight - 140;
      setVisible(window.scrollY > 400 && !nearBottom);
    };
    window.addEventListener("scroll", handler);
    window.addEventListener("resize", handler);
    handler();
    return () => {
      window.removeEventListener("scroll", handler);
      window.removeEventListener("resize", handler);
    };
  }, []);

  if (!visible) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
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

// Affichage standard du nom d'un Bibax — prénom + nom obligatoires, surnom éventuel en plus
// petit à côté. Utilisé partout où un Bibax est listé (relations, demandes, suggestions),
// pour ne jamais se retrouver avec un simple prénom qui ne permet pas de reconnaître qui est
// qui.
export function BibaxName({ name, lastName, nickname, city, locality, style }) {
  const fullName = [name, lastName].filter(Boolean).join(" ") || "Bibax";
  const location = city ? (locality ? `${city} (${locality})` : city) : null;
  return (
    <span style={{ display: "inline-flex", flexDirection: "column", minWidth: 0, ...style }}>
      <span style={{ fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{fullName}</span>
      {nickname && <span style={{ fontSize: "0.85em", fontWeight: 400, fontStyle: "italic", color: COLORS.amber, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{nickname}</span>}
      {location && <span style={{ fontSize: "0.8em", fontWeight: 400, color: COLORS.inkSoft, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{location}</span>}
    </span>
  );
}

export function EntityAvatar({ photoUrl, photoEmoji, size = 40, onClick, fallbackIcon = "bibamus-monogram", fallbackColor = COLORS.amber }) {
  const content = photoUrl ? null : photoEmoji ? photoEmoji : <NavIcon name={fallbackIcon} size={Math.round(size * 0.58)} color={fallbackColor} />;
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

export function PageFooterNav({ onBack }) {
  const goHome = React.useContext(NavigationContext);
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", marginTop: "24px", paddingTop: "18px", borderTop: `1px solid ${COLORS.paperAlt}` }}>
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

export function CategoryTile({ title, subtitle, onClick, badge, disabled }) {
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
        padding: "16px 14px",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.55 : 1,
        position: "relative",
        minHeight: "104px",
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

export function MoneyAmount({ value, currency, centered = false, jetonIconSize = 14 }) {
  if (currency === "jeton") {
    const n = Math.round(value * 10) / 10;
    const numPart = n % 1 === 0 ? n : n.toFixed(1);
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
        {numPart} <NavIcon name="jeton-token" size={jetonIconSize} color="#0040ef" />
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

export function BottomNav({ screen, onNavigate, onGoToSessionHub, unreadNotifications = 0 }) {
  const items = [
    { key: "home", label: "Home", accent: "", icon: "ti-home" },
    { key: "bibaPulse", label: "Biba", accent: "Pulse", icon: "ti-activity" },
  ];
  const active = (key) => screen === key;

  return (
    <div
      style={{
        width: "100%",
        flexShrink: 0,
        background: COLORS.surface,
        borderTop: `2px solid ${COLORS.paperAlt}`,
        display: "flex",
        justifyContent: "space-around",
        alignItems: "flex-end",
        padding: "8px 4px calc(8px + env(safe-area-inset-bottom, 0px))",
      }}
    >
      {items.map((item) => (
        <button
          key={item.key}
          onClick={() => onNavigate(item.key)}
          style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", padding: "4px 8px", flex: 1 }}
        >
          <NavIcon name={item.icon.slice(3)} size={20} color={active(item.key) ? COLORS.jetonFluo : COLORS.amber} />
          <span style={{ fontSize: "10px", fontWeight: active(item.key) ? 700 : 600 }}>
            <span style={{ color: active(item.key) ? COLORS.jetonFluo : COLORS.ink }}>{item.label}</span>
            <span style={{ color: active(item.key) ? COLORS.jetonFluo : COLORS.amber }}>{item.accent}</span>
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
            background: active("sessionHub") ? COLORS.jetonFluo : COLORS.paperAlt,
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
        <span style={{ fontSize: "10px", fontWeight: active("sessionHub") ? 700 : 600, color: active("sessionHub") ? COLORS.jetonFluo : COLORS.ink }}>
          <span style={{ color: COLORS.ink }}>Biba</span>
          <span style={{ color: COLORS.amber }}>Go</span>
        </span>
      </button>

      <button
        onClick={() => onNavigate("repertoireHub")}
        style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", padding: "4px 8px", flex: 1 }}
      >
        <NavIcon name="map" size={20} color={active("repertoireHub") ? COLORS.jetonFluo : COLORS.amber} />
        <span style={{ fontSize: "10px", fontWeight: active("repertoireHub") ? 700 : 600 }}>
          <span style={{ color: active("repertoireHub") ? COLORS.jetonFluo : COLORS.ink }}>Bib</span>
          <span style={{ color: active("repertoireHub") ? COLORS.jetonFluo : COLORS.amber }}>Atlas</span>
        </span>
      </button>

      <button
        onClick={() => onNavigate("notificationsFeed")}
        style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", padding: "4px 8px", flex: 1, position: "relative" }}
      >
        <span style={{ position: "relative", display: "inline-block", lineHeight: 0 }}>
          <NavIcon name="bell" size={22} color={active("notificationsFeed") ? COLORS.jetonFluo : COLORS.amber} />
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
        <span style={{ fontSize: "10px", fontWeight: active("notificationsFeed") ? 700 : 600, color: active("notificationsFeed") ? COLORS.jetonFluo : COLORS.ink }}>Notifications</span>
      </button>
    </div>
  );
}