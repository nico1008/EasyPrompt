"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  type FocusEvent,
  type KeyboardEvent,
  type PointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { BrandIcon } from "./BrandIcon";
import { Icon, type IconName } from "./Icon";
import { UserMenu } from "./UserMenu";
import { config } from "@/config";
import {
  activeBrowseDestination,
  activePrimaryNavSection,
  matchesRoute,
  type BrowseDestination,
} from "@/lib/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { useSupabaseAccountState } from "@/lib/supabase/useUser";
import { useEscape } from "@/lib/useEscape";

type MenuId = "browse" | "build";
type ItemTone = "template" | "prompt" | "workflow";

type NavItem = {
  href: string;
  label: string;
  description: string;
  icon: IconName;
  tone: ItemTone;
  browseDestination?: BrowseDestination;
  activeRoute?: string;
};

const NAV_GROUPS: ReadonlyArray<{
  id: MenuId;
  label: string;
  items: ReadonlyArray<NavItem>;
}> = [
  {
    id: "browse",
    label: "Browse",
    items: [
      {
        href: "/templates",
        label: "Templates",
        description: "Reusable frameworks you fill in",
        icon: "list",
        tone: "template",
        browseDestination: "templates",
      },
      {
        href: "/prompts",
        label: "Prompts",
        description: "Ready-to-use content",
        icon: "code",
        tone: "prompt",
        browseDestination: "prompts",
      },
      {
        href: "/workflows",
        label: "Workflows",
        description: "Guided multi-step playbooks",
        icon: "book",
        tone: "workflow",
        browseDestination: "workflows",
      },
    ],
  },
  {
    id: "build",
    label: "Build",
    items: [
      {
        href: "/build/template",
        label: "New Template",
        description: "Build a reusable framework",
        icon: "list",
        tone: "template",
        activeRoute: "/build/template",
      },
      {
        href: "/build/prompt",
        label: "New Prompt",
        description: "Write ready-to-use content",
        icon: "code",
        tone: "prompt",
        activeRoute: "/build/prompt",
      },
    ],
  },
];

const DESKTOP_QUERY = "(min-width: 861px)";
const HOVER_CLOSE_DELAY = 150;

export function Nav() {
  const pathname = usePathname() || "/";
  const activeBrowse = activeBrowseDestination(pathname);
  const activeSection = activePrimaryNavSection(pathname);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileDisclosure, setMobileDisclosure] = useState<MenuId | null>(null);
  const [desktopMenu, setDesktopMenu] = useState<MenuId | null>(null);
  const [pinnedMenu, setPinnedMenu] = useState<MenuId | null>(null);
  const [isDesktop, setIsDesktop] = useState(true);
  const navLinksRef = useRef<HTMLDivElement>(null);
  const burgerRef = useRef<HTMLButtonElement>(null);
  const triggerRefs = useRef<Record<MenuId, HTMLButtonElement | null>>({
    browse: null,
    build: null,
  });
  const firstLinkRefs = useRef<Record<MenuId, HTMLAnchorElement | null>>({
    browse: null,
    build: null,
  });
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearHoverTimer = useCallback(() => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  }, []);

  const closeDesktopMenu = useCallback(
    (focusTrigger?: MenuId) => {
      clearHoverTimer();
      setDesktopMenu(null);
      setPinnedMenu(null);
      if (focusTrigger) triggerRefs.current[focusTrigger]?.focus();
    },
    [clearHoverTimer]
  );

  const closeMobileMenu = useCallback(
    (returnFocus = false) => {
      setMobileOpen(false);
      setMobileDisclosure(null);
      closeDesktopMenu();
      if (returnFocus) burgerRef.current?.focus();
    },
    [closeDesktopMenu]
  );

  const dismissNavigation = useCallback(() => {
    closeDesktopMenu();
    setMobileOpen(false);
    setMobileDisclosure(null);
  }, [closeDesktopMenu]);

  // Auth state stays client-side so the shared layout and public catalogs remain static.
  const accountsOn = config.accounts.enabled && isSupabaseConfigured();
  const { account, authLikely, loaded } = useSupabaseAccountState();
  const username = account?.profile.username;
  const avatarLabel = username || account?.email?.trim()[0]?.toUpperCase() || "";
  const avatarInitial = (avatarLabel.trim()[0] ?? "").toUpperCase();
  const showAccountChrome = accountsOn && (Boolean(account) || authLikely);

  useEffect(() => {
    const media = window.matchMedia(DESKTOP_QUERY);
    setIsDesktop(media.matches);

    const onChange = (event: MediaQueryListEvent) => {
      setIsDesktop(event.matches);
      dismissNavigation();
    };

    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [dismissNavigation]);

  useEffect(() => {
    dismissNavigation();
  }, [pathname, dismissNavigation]);

  useEffect(() => {
    if (!desktopMenu) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!navLinksRef.current?.contains(event.target as Node)) closeDesktopMenu();
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [desktopMenu, closeDesktopMenu]);

  useEffect(() => () => clearHoverTimer(), [clearHoverTimer]);

  useEscape(Boolean(desktopMenu || mobileOpen), () => {
    if (desktopMenu) closeDesktopMenu(desktopMenu);
    else closeMobileMenu(true);
  });

  function openDesktopPreview(menu: MenuId) {
    if (!isDesktop) return;
    clearHoverTimer();
    if (desktopMenu !== menu) setPinnedMenu(null);
    setDesktopMenu(menu);
  }

  function scheduleDesktopClose(menu: MenuId) {
    if (!isDesktop || pinnedMenu === menu) return;
    clearHoverTimer();
    hoverTimerRef.current = setTimeout(() => {
      setDesktopMenu((current) => (current === menu ? null : current));
    }, HOVER_CLOSE_DELAY);
  }

  function handlePointerEnter(event: PointerEvent<HTMLDivElement>, menu: MenuId) {
    if (event.pointerType === "mouse") openDesktopPreview(menu);
  }

  function handleGroupBlur(event: FocusEvent<HTMLDivElement>, menu: MenuId) {
    if (pinnedMenu === menu || event.currentTarget.contains(event.relatedTarget)) return;
    scheduleDesktopClose(menu);
  }

  function toggleMenu(menu: MenuId) {
    if (!isDesktop) {
      setMobileDisclosure((current) => (current === menu ? null : menu));
      return;
    }

    clearHoverTimer();
    if (pinnedMenu === menu) {
      closeDesktopMenu();
      return;
    }
    setDesktopMenu(menu);
    setPinnedMenu(menu);
  }

  function handleTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>, menu: MenuId) {
    if (!isDesktop || event.key !== "ArrowDown") return;
    event.preventDefault();
    clearHoverTimer();
    setDesktopMenu(menu);
    setPinnedMenu(null);
    requestAnimationFrame(() => firstLinkRefs.current[menu]?.focus());
  }

  function toggleMobileMenu() {
    if (mobileOpen) {
      closeMobileMenu();
      return;
    }
    closeDesktopMenu();
    setMobileDisclosure(
      activeSection === "browse" || activeSection === "build" ? activeSection : null
    );
    setMobileOpen(true);
  }

  function isItemActive(item: NavItem): boolean {
    if (item.browseDestination) return activeBrowse === item.browseDestination;
    return item.activeRoute ? matchesRoute(pathname, item.activeRoute) : false;
  }

  return (
    <nav className="nav" aria-label="Primary navigation">
      <Link className="brand" href="/" onClick={dismissNavigation}>
        <BrandIcon /> EasyPrompt
      </Link>

      <div
        ref={navLinksRef}
        id="site-nav-links"
        className={`links nav-links${mobileOpen ? " open" : ""}`}
      >
        {NAV_GROUPS.map((group) => {
          const expanded = isDesktop
            ? desktopMenu === group.id
            : mobileOpen && mobileDisclosure === group.id;
          const groupActive = activeSection === group.id;

          return (
            <div
              key={group.id}
              className={`nav-group${expanded ? " is-open" : ""}`}
              onPointerEnter={(event) => handlePointerEnter(event, group.id)}
              onPointerLeave={() => scheduleDesktopClose(group.id)}
              onFocusCapture={() => openDesktopPreview(group.id)}
              onBlurCapture={(event) => handleGroupBlur(event, group.id)}
            >
              <button
                ref={(node) => {
                  triggerRefs.current[group.id] = node;
                }}
                type="button"
                className={`nav-trigger${groupActive ? " on" : ""}`}
                aria-expanded={expanded}
                aria-controls={`nav-${group.id}-panel`}
                onClick={() => toggleMenu(group.id)}
                onKeyDown={(event) => handleTriggerKeyDown(event, group.id)}
              >
                <span>{group.label}</span>
                <Icon name="chevron" size={13} className="nav-trigger-chevron" />
              </button>

              {expanded ? (
                <div id={`nav-${group.id}-panel`} className={`nav-dropdown nav-dropdown-${group.id}`}>
                  <div className="nav-dropdown-list">
                    {group.items.map((item, index) => {
                      const itemActive = isItemActive(item);
                      return (
                        <Link
                          key={item.href}
                          ref={
                            index === 0
                              ? (node) => {
                                  firstLinkRefs.current[group.id] = node;
                                }
                              : undefined
                          }
                          href={item.href}
                          className={`nav-dropdown-item tone-${item.tone}${itemActive ? " on" : ""}`}
                          aria-current={itemActive ? "page" : undefined}
                          onClick={dismissNavigation}
                        >
                          <span className="nav-dropdown-icon">
                            <Icon name={item.icon} size={18} />
                          </span>
                          <span className="nav-dropdown-copy">
                            <strong>{item.label}</strong>
                            <span>{item.description}</span>
                          </span>
                        </Link>
                      );
                    })}
                  </div>

                  {group.id === "build" ? (
                    <Link
                      href="/build"
                      className={`nav-dropdown-footer${pathname === "/build" ? " on" : ""}`}
                      aria-current={pathname === "/build" ? "page" : undefined}
                      onClick={dismissNavigation}
                    >
                      Builder overview <Icon name="arrow-right" size={13} />
                    </Link>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })}

        <Link
          href="/my"
          className={`nav-direct-link${activeSection === "library" ? " on" : ""}`}
          aria-current={activeSection === "library" ? "page" : undefined}
          onClick={dismissNavigation}
        >
          My Library
        </Link>

        {accountsOn && !showAccountChrome ? (
          <div className="nav-menu-auth" aria-label="Account actions">
            <Link className="nav-login" href="/login" onClick={dismissNavigation}>
              Log in
            </Link>
            <Link className="btn btn-primary btn-sm" href="/signup" onClick={dismissNavigation}>
              Sign up
            </Link>
          </div>
        ) : !accountsOn ? (
          <div className="nav-menu-auth" aria-label="Get started">
            <Link className="btn btn-primary btn-sm" href="/templates" onClick={dismissNavigation}>
              Get started
            </Link>
          </div>
        ) : null}
      </div>

      <div className="right">
        {accountsOn && account && username ? (
          <UserMenu username={username} />
        ) : showAccountChrome && (!loaded || !account) ? (
          <button className="user-avatar is-loading" type="button" aria-label="Loading account" disabled>
            {avatarInitial || "?"}
          </button>
        ) : showAccountChrome ? (
          <Link className="user-avatar" href="/settings#profile" aria-label="Complete profile">
            {avatarInitial || "?"}
          </Link>
        ) : accountsOn ? (
          <>
            <Link className="nav-login nav-top-auth" href="/login">
              Log in
            </Link>
            <Link className="btn btn-primary btn-sm nav-top-auth" href="/signup">
              Sign up
            </Link>
          </>
        ) : (
          <Link className="btn btn-primary btn-sm nav-top-cta" href="/templates">
            Get started
          </Link>
        )}
        <button
          ref={burgerRef}
          className="nav-burger"
          type="button"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-controls="site-nav-links"
          aria-expanded={mobileOpen}
          onClick={toggleMobileMenu}
        >
          <Icon name={mobileOpen ? "x" : "menu"} size={20} />
        </button>
      </div>
    </nav>
  );
}
