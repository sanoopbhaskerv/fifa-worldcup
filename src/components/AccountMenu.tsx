import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronIcon, SettingsIcon, UserIcon } from "./Icons";
import { ThemeSwitcher } from "./ThemeSwitcher";

type AccountMenuProps = {
  displayName: string;
  subtitle?: string;
  profilePath?: string;
};

const initialsFrom = (value: string) => {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
};

/**
 * Renders a shared topbar account menu with identity, shortcuts, and account controls.
 *
 * @param props - Component props.
 * @param props.displayName - Display name shown in trigger and menu header.
 * @param props.subtitle - Optional secondary identity line.
 * @param props.profilePath - Route used by the View profile action.
 * @returns Account menu trigger and popover panel.
 */
export const AccountMenu = ({ displayName, subtitle, profilePath = "/fantasy/profile" }: AccountMenuProps) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const firstItemRef = useRef<HTMLAnchorElement | null>(null);
  const initials = useMemo(() => initialsFrom(displayName), [displayName]);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    };
    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  useEffect(() => {
    if (open) firstItemRef.current?.focus();
  }, [open]);

  const closeMenu = () => setOpen(false);

  return (
    <div className={`account-menu ${open ? "account-menu--open" : ""}`.trim()} ref={rootRef}>
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Account menu"
        className="account-menu__trigger"
        onClick={() => setOpen((current) => !current)}
        ref={triggerRef}
        type="button"
      >
        <span className="account-menu__avatar">{initials}</span>
        <span className="account-menu__identity">
          <strong>{displayName}</strong>
          {subtitle && <small>{subtitle}</small>}
        </span>
        <ChevronIcon className="account-menu__chevron" />
      </button>

      {open && (
        <div className="account-menu__panel" role="menu">
          <div className="account-menu__summary">
            <span className="account-menu__avatar account-menu__avatar--large">{initials}</span>
            <div>
              <strong>{displayName}</strong>
              {subtitle && <small>{subtitle}</small>}
            </div>
          </div>

          <div className="account-menu__group">
            <Link className="account-menu__item" onClick={closeMenu} ref={firstItemRef} role="menuitem" to={profilePath}>
              <UserIcon />
              <span>View profile</span>
            </Link>
            <div className="account-menu__theme-row" role="menuitem">
              <span className="account-menu__theme-label"><SettingsIcon />Theme</span>
              <ThemeSwitcher compact className="account-menu__theme-switcher" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};