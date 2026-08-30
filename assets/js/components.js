/**
 * MegaCom Components & Navbar Controller
 * Handles asynchronous component injection and multi-level JavaScript-controlled dropdowns.
 */

// ============================================================
// Component Loader
// ============================================================

async function loadComponent(selector, path) {
  const element = document.querySelector(selector);
  if (!element) return false;

  try {
    const response = await fetch(path);
    if (!response.ok) throw new Error(`Failed to load ${path}`);
    element.innerHTML = await response.text();
    return true;
  } catch (error) {
    console.error(`[MegaCom] Error loading component ${path}:`, error);
    return false;
  }
}

// ============================================================
// Navbar JavaScript Controller
// ============================================================

function initNavbar() {
  const header = document.querySelector(".site-header");
  const navbar = document.querySelector(".navbar");
  if (!navbar) return;

  const menuToggle = document.querySelector("#menuToggle");
  const navWrapper = document.querySelector("#primaryNav");
  const navOverlay = document.querySelector("#navOverlay");
  const hasChildrenItems = Array.from(navbar.querySelectorAll(".menu-item-has-children"));

  const isMobile = () => window.innerWidth <= 1024;
  const closeTimers = new Map();

  // ------------------------------------------------------------
  // 1. Highlight Current Active Route & Parent Ancestors
  // ------------------------------------------------------------
  function highlightActiveRoutes() {
    const currentPath = window.location.pathname.replace(/\/$/, "") || "/";
    const allLinks = navbar.querySelectorAll(".menu a");

    allLinks.forEach((link) => {
      try {
        const linkUrl = new URL(link.href, window.location.origin);
        const linkPath = linkUrl.pathname.replace(/\/$/, "") || "/";

        if (linkPath === currentPath) {
          const li = link.closest(".menu-item");
          if (li) {
            li.classList.add("current-menu-item", "active");

            // Mark all parent menu items up the tree
            let parentLi = li.parentElement?.closest(".menu-item-has-children");
            while (parentLi) {
              parentLi.classList.add("current-menu-ancestor", "current-menu-parent");
              parentLi = parentLi.parentElement?.closest(".menu-item-has-children");
            }
          }
        }
      } catch (e) {
        // External link or invalid url
      }
    });
  }

  // ------------------------------------------------------------
  // 2. Open / Close Sub-menu Functions
  // ------------------------------------------------------------
  function clearItemTimer(item) {
    if (closeTimers.has(item)) {
      clearTimeout(closeTimers.get(item));
      closeTimers.delete(item);
    }
  }

  function openSubmenu(item, focusFirstItem = false) {
    clearItemTimer(item);

    // Close open siblings at the same hierarchical level
    const parentList = item.parentElement;
    if (parentList) {
      const siblings = Array.from(parentList.children).filter(
        (child) => child !== item && child.classList.contains("menu-item-has-children") && child.classList.contains("is-open")
      );
      siblings.forEach((sibling) => closeSubmenu(sibling));
    }

    item.classList.add("is-open");

    const toggleBtn = item.querySelector(":scope > .dropdown-toggle, :scope > .menu-item-row > .dropdown-toggle");
    if (toggleBtn) {
      toggleBtn.setAttribute("aria-expanded", "true");
    }

    const subMenu = item.querySelector(":scope > .sub-menu");
    if (subMenu) {
      if (!isMobile()) {
        // Smart Viewport Collision Detection (prevent flyout from spilling off-screen)
        subMenu.classList.remove("opens-left");
        const rect = subMenu.getBoundingClientRect();
        if (rect.right > window.innerWidth - 16) {
          subMenu.classList.add("opens-left");
        }
      } else {
        // Mobile smooth accordion expand
        subMenu.style.maxHeight = subMenu.scrollHeight + 50 + "px";
        
        // Recalculate parent accordion heights if nested
        let ancestorSubMenu = item.parentElement?.closest(".sub-menu");
        while (ancestorSubMenu) {
          ancestorSubMenu.style.maxHeight = ancestorSubMenu.scrollHeight + subMenu.scrollHeight + 50 + "px";
          ancestorSubMenu = ancestorSubMenu.parentElement?.closest(".sub-menu");
        }
      }

      if (focusFirstItem) {
        const firstLink = subMenu.querySelector("a, button");
        if (firstLink) firstLink.focus();
      }
    }
  }

  function closeSubmenu(item) {
    clearItemTimer(item);

    item.classList.remove("is-open");

    const toggleBtn = item.querySelector(":scope > .dropdown-toggle, :scope > .menu-item-row > .dropdown-toggle");
    if (toggleBtn) {
      toggleBtn.setAttribute("aria-expanded", "false");
    }

    const subMenu = item.querySelector(":scope > .sub-menu");
    if (subMenu) {
      if (isMobile()) {
        subMenu.style.maxHeight = null;
      }
      // Recursively close open child submenus
      const openChildren = subMenu.querySelectorAll(".menu-item-has-children.is-open");
      openChildren.forEach((child) => closeSubmenu(child));
    }
  }

  function toggleSubmenu(item) {
    if (item.classList.contains("is-open")) {
      closeSubmenu(item);
    } else {
      openSubmenu(item);
    }
  }

  function closeAllSubmenus(exceptItem = null) {
    hasChildrenItems.forEach((item) => {
      if (!exceptItem || (!item.contains(exceptItem) && item !== exceptItem)) {
        closeSubmenu(item);
      }
    });
  }

  // ------------------------------------------------------------
  // 3. Attach Events to Submenu Elements
  // ------------------------------------------------------------
  hasChildrenItems.forEach((item) => {
    const toggleBtn = item.querySelector(":scope > .dropdown-toggle, :scope > .menu-item-row > .dropdown-toggle");
    const subMenu = item.querySelector(":scope > .sub-menu");

    // Click / Touch on Toggle Button
    if (toggleBtn) {
      toggleBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleSubmenu(item);
      });
    }

    // Desktop Hover with Grace Delay / Intent
    item.addEventListener("mouseenter", () => {
      if (isMobile()) return;

      // Clear timers for this item and all its ancestor items
      let curr = item;
      while (curr) {
        clearItemTimer(curr);
        curr = curr.parentElement?.closest(".menu-item-has-children");
      }

      openSubmenu(item);
    });

    item.addEventListener("mouseleave", () => {
      if (isMobile()) return;

      // Set a graceful close timer (220ms) so diagonal mouse moves don't abruptly close the menu
      const timer = setTimeout(() => {
        closeSubmenu(item);
        closeTimers.delete(item);
      }, 220);

      closeTimers.set(item, timer);
    });

    // Keyboard navigation (Escape, Arrow navigation)
    item.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        if (item.classList.contains("is-open")) {
          e.preventDefault();
          e.stopPropagation();
          closeSubmenu(item);
          if (toggleBtn) toggleBtn.focus();
        }
      } else if (e.key === "ArrowRight") {
        if (!isMobile() && item.classList.contains("is-open") && subMenu) {
          const firstLink = subMenu.querySelector("a");
          if (firstLink && document.activeElement === toggleBtn) {
            e.preventDefault();
            firstLink.focus();
          }
        }
      } else if (e.key === "ArrowLeft") {
        if (!isMobile()) {
          const parentItem = item.parentElement?.closest(".menu-item-has-children");
          if (parentItem) {
            e.preventDefault();
            closeSubmenu(parentItem);
            const parentToggle = parentItem.querySelector(":scope > .dropdown-toggle, :scope > .menu-item-row > .dropdown-toggle");
            if (parentToggle) parentToggle.focus();
          }
        }
      }
    });
  });

  // ------------------------------------------------------------
  // 4. Global Click Outside & Escape Listeners
  // ------------------------------------------------------------
  document.addEventListener("click", (e) => {
    if (!navbar.contains(e.target)) {
      closeAllSubmenus();
      if (isMobile() && navbar.classList.contains("is-open")) {
        closeMobileNav();
      }
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeAllSubmenus();
      if (isMobile() && navbar.classList.contains("is-open")) {
        closeMobileNav();
      }
    }
  });

  // ------------------------------------------------------------
  // 5. Mobile Navigation (Drawer, Hamburger & Backdrop)
  // ------------------------------------------------------------
  function openMobileNav() {
    navbar.classList.add("is-open");
    if (menuToggle) {
      menuToggle.setAttribute("aria-expanded", "true");
      menuToggle.classList.add("is-active");
    }
    if (navOverlay) {
      navOverlay.classList.add("is-active");
    }
    document.body.classList.add("nav-scroll-locked");
  }

  function closeMobileNav() {
    navbar.classList.remove("is-open");
    if (menuToggle) {
      menuToggle.setAttribute("aria-expanded", "false");
      menuToggle.classList.remove("is-active");
    }
    if (navOverlay) {
      navOverlay.classList.remove("is-active");
    }
    document.body.classList.remove("nav-scroll-locked");
    closeAllSubmenus();
  }

  if (menuToggle) {
    menuToggle.addEventListener("click", (e) => {
      e.stopPropagation();
      if (navbar.classList.contains("is-open")) {
        closeMobileNav();
      } else {
        openMobileNav();
      }
    });
  }

  if (navOverlay) {
    navOverlay.addEventListener("click", () => {
      closeMobileNav();
    });
  }

  // Close mobile drawer when clicking a link that leads to a page
  const navLinks = navbar.querySelectorAll(".nav-links a");
  navLinks.forEach((link) => {
    link.addEventListener("click", () => {
      if (isMobile()) {
        closeMobileNav();
      }
    });
  });

  // ------------------------------------------------------------
  // 6. Window Resize Handler
  // ------------------------------------------------------------
  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (!isMobile()) {
        closeMobileNav();
        navbar.querySelectorAll(".sub-menu").forEach((sm) => {
          sm.style.maxHeight = null;
        });
      }
    }, 150);
  });

  // Run active route highlighter
  highlightActiveRoutes();
}

// ============================================================
// Initialize Components
// ============================================================

document.addEventListener("DOMContentLoaded", async () => {
  const navLoaded = await loadComponent("#navbar", "/components/navbar.html");
  if (navLoaded) {
    initNavbar();
  }
  await loadComponent("#footer", "/components/footer.html");
});

