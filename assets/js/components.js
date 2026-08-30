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
    const rawPath = window.location.pathname.replace(/\/index\.html$/, "/") || "/";
    const currentPath = rawPath === "/" ? "/" : rawPath.replace(/\/$/, "");
    const allLinks = navbar.querySelectorAll(".menu a");

    // Clear all stale active states first
    navbar.querySelectorAll(".menu-item, .menu a, .menu li").forEach((item) => {
      item.classList.remove("current-menu-item", "active", "current-menu-ancestor", "current-menu-parent");
    });

    allLinks.forEach((link) => {
      try {
        const linkUrl = new URL(link.href, window.location.origin);
        const rawLinkPath = linkUrl.pathname.replace(/\/index\.html$/, "/") || "/";
        const linkPath = rawLinkPath === "/" ? "/" : rawLinkPath.replace(/\/$/, "");

        // On root home page, only activate Home link
        if (currentPath === "/") {
          if (linkPath === "/") {
            const topMenuItem = link.closest(".nav-links > .menu-item");
            if (topMenuItem) {
              topMenuItem.classList.add("current-menu-item", "active");
            }
          }
          return;
        }

        // On inner pages, match exact route or child path
        const isMatch = linkPath !== "/" && (currentPath === linkPath || currentPath.startsWith(linkPath + "/"));

        if (isMatch) {
          link.classList.add("current-menu-item", "active");
          const parentLi = link.closest("li");
          if (parentLi) {
            parentLi.classList.add("current-menu-item", "active");
          }

          // Mark top-level navbar parent menu item as active ancestor
          const topMenuItem = link.closest(".nav-links > .menu-item");
          if (topMenuItem) {
            topMenuItem.classList.add("current-menu-ancestor", "current-menu-parent", "active");
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

  function updateMobileAncestorsHeight(item) {
    if (!isMobile()) return;
    let ancestor = item.parentElement?.closest(".menu-item-has-children.is-open");
    while (ancestor) {
      const ancSub = ancestor.querySelector(":scope > .sub-menu");
      if (ancSub) {
        ancSub.style.maxHeight = ancSub.scrollHeight + 80 + "px";
      }
      ancestor = ancestor.parentElement?.closest(".menu-item-has-children.is-open");
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
        const parentSubMenu = item.parentElement?.closest(".sub-menu");
        const parentOpensLeft = parentSubMenu?.classList.contains("opens-left");

        subMenu.classList.remove("opens-left");
        if (parentOpensLeft) {
          subMenu.classList.add("opens-left");
        }

        const rect = subMenu.getBoundingClientRect();
        if (rect.right > window.innerWidth - 16) {
          subMenu.classList.add("opens-left");
        } else if (rect.left < 16 && parentOpensLeft) {
          subMenu.classList.remove("opens-left");
        }
      } else {
        // Mobile smooth vertical accordion expand
        subMenu.style.maxHeight = subMenu.scrollHeight + 60 + "px";
        updateMobileAncestorsHeight(item);

        // Smoothly bring expanding item into view inside mobile drawer
        setTimeout(() => {
          item.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }, 120);
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
      subMenu.classList.remove("opens-left");
      if (isMobile()) {
        subMenu.style.maxHeight = null;
      }
      // Recursively close open child submenus
      const openChildren = subMenu.querySelectorAll(".menu-item-has-children.is-open");
      openChildren.forEach((child) => {
        child.classList.remove("is-open");
        const childBtn = child.querySelector(":scope > .dropdown-toggle, :scope > .menu-item-row > .dropdown-toggle");
        if (childBtn) childBtn.setAttribute("aria-expanded", "false");
        const childSub = child.querySelector(":scope > .sub-menu");
        if (childSub) {
          childSub.classList.remove("opens-left");
          if (isMobile()) {
            childSub.style.maxHeight = null;
          }
        }
      });

      if (isMobile()) {
        // Recalculate ancestors after closing
        let ancestor = item.parentElement?.closest(".menu-item-has-children.is-open");
        while (ancestor) {
          const ancSub = ancestor.querySelector(":scope > .sub-menu");
          if (ancSub) {
            ancSub.style.maxHeight = ancSub.scrollHeight + 60 + "px";
          }
          ancestor = ancestor.parentElement?.closest(".menu-item-has-children.is-open");
        }
      }
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

  const mobileNavClose = document.querySelector("#mobileNavClose");
  if (mobileNavClose) {
    mobileNavClose.addEventListener("click", (e) => {
      e.stopPropagation();
      closeMobileNav();
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

document.addEventListener("DOMContentLoaded", () => {
  const heroSlider = document.querySelector(".hero-slider");

  if (!heroSlider) return;

  new Swiper(heroSlider, {
    loop: true,

    speed: 900,

    effect: "fade",

    fadeEffect: {
      crossFade: true,
    },

    autoplay: {
      delay: 6000,
      disableOnInteraction: false,
      pauseOnMouseEnter: true,
    },

    navigation: {
      nextEl: ".hero-slider-next",
      prevEl: ".hero-slider-prev",
    },

    pagination: {
      el: ".hero-slider-dots",
      clickable: true,
    },

    keyboard: {
      enabled: true,
    },

    a11y: {
      enabled: true,
    },

    grabCursor: true,
  });
});