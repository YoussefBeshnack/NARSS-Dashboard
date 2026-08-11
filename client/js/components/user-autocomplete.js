import { authService } from "../services/auth.service.js";

/**
 * Sets up a live-search user autocomplete that appends the dropdown to
 * document.body (position: fixed) so it can escape any overflow:hidden or
 * z-index stacking context imposed by modal wrappers.
 *
 * @param {object} opts
 * @param {HTMLElement} opts.searchInputEl  - Visible text input the user types in
 * @param {HTMLElement} opts.hiddenInputEl  - Hidden input that stores the selected user ID
 * @param {HTMLElement} opts.containerEl    - Wrapper element used as the anchor for positioning
 * @param {Function}    [opts.onSelect]     - Called with the selected user object
 */
export function setupUserAutocomplete({ searchInputEl, hiddenInputEl, containerEl, onSelect }) {
  if (!searchInputEl || !hiddenInputEl || !containerEl) return;

  let debounceTimer = null;
  let isOpen = false;

  // ── Create floating dropdown and attach to body ─────────────────────────────
  const dropdownEl = document.createElement("div");
  dropdownEl.className = "dropdown-menu border-secondary bg-dark text-light shadow-lg";
  dropdownEl.style.cssText = [
    "position: fixed",
    "z-index: 9999",
    "max-height: 220px",
    "overflow-y: auto",
    "display: none",
    "min-width: 240px",
    "width: auto",
    "border-radius: 8px",
    "border: 1px solid rgba(255,255,255,0.1)",
    "box-shadow: 0 8px 32px rgba(0,0,0,0.5)",
  ].join(";");
  document.body.appendChild(dropdownEl);

  // ── Positioning helper ───────────────────────────────────────────────────────
  function repositionDropdown() {
    const rect = searchInputEl.getBoundingClientRect();
    dropdownEl.style.top = `${rect.bottom + 4}px`;
    dropdownEl.style.left = `${rect.left}px`;
    dropdownEl.style.width = `${rect.width}px`;
  }

  function showDropdown() {
    repositionDropdown();
    dropdownEl.style.display = "block";
    isOpen = true;
  }

  function hideDropdown() {
    dropdownEl.style.display = "none";
    isOpen = false;
  }

  // ── Fetch & render suggestions ───────────────────────────────────────────────
  const fetchAndRenderSuggestions = async (query) => {
    try {
      dropdownEl.innerHTML =
        '<div class="px-3 py-2 text-muted small"><i class="fa-solid fa-spinner fa-spin me-2"></i>Searching users...</div>';
      showDropdown();

      const res = await authService.searchUsers(query);
      const users = res && res.users ? res.users : [];

      if (users.length === 0) {
        dropdownEl.innerHTML = '<div class="px-3 py-2 text-muted small">No matching users found</div>';
        return;
      }

      dropdownEl.innerHTML = users
        .map(
          (u) => `
        <div
          class="dropdown-item d-flex align-items-center justify-content-between text-light py-2 px-3 border-bottom border-secondary border-opacity-25 cursor-pointer user-suggestion-item"
          style="cursor:pointer"
          data-id="${u._id}"
          data-name="${u.name}"
          data-email="${u.email}"
          data-role="${u.role}">
          <div>
            <div class="fw-semibold text-light">${u.name}</div>
            <small class="text-secondary">${u.email}</small>
          </div>
          <span class="badge bg-secondary">${u.role}</span>
        </div>
      `,
        )
        .join("");

      // Hover styles for items
      dropdownEl.querySelectorAll(".user-suggestion-item").forEach((item) => {
        item.addEventListener("mouseenter", () => {
          item.style.backgroundColor = "rgba(0,165,212,0.15)";
        });
        item.addEventListener("mouseleave", () => {
          item.style.backgroundColor = "";
        });

        // Selection handler — use mousedown so it fires before the blur event
        item.addEventListener("mousedown", (e) => {
          e.preventDefault();
          e.stopPropagation();

          const userId = item.getAttribute("data-id");
          const name = item.getAttribute("data-name");
          const email = item.getAttribute("data-email");
          const role = item.getAttribute("data-role");

          hiddenInputEl.value = userId;
          searchInputEl.value = `${name} (${email})`;
          hideDropdown();

          if (onSelect) onSelect({ _id: userId, name, email, role });
        });
      });
    } catch (err) {
      console.error("User autocomplete search error:", err);
      dropdownEl.innerHTML = '<div class="px-3 py-2 text-danger small">Error fetching users</div>';
    }
  };

  // ── Input events ─────────────────────────────────────────────────────────────
  searchInputEl.addEventListener("input", () => {
    hiddenInputEl.value = ""; // reset stored ID when user edits text
    const query = searchInputEl.value.trim();

    clearTimeout(debounceTimer);
    if (query.length === 0) {
      // Show all users when field is cleared
      debounceTimer = setTimeout(() => fetchAndRenderSuggestions(""), 200);
    } else {
      debounceTimer = setTimeout(() => fetchAndRenderSuggestions(query), 250);
    }
  });

  searchInputEl.addEventListener("focus", () => {
    const query = searchInputEl.value.trim();
    fetchAndRenderSuggestions(query);
  });

  searchInputEl.addEventListener("blur", () => {
    // Slight delay so the mousedown on a suggestion fires first
    setTimeout(() => {
      if (!isOpen) return;
      hideDropdown();
    }, 150);
  });

  // ── Reposition on scroll / resize ────────────────────────────────────────────
  const handleScroll = () => {
    if (isOpen) repositionDropdown();
  };
  window.addEventListener("scroll", handleScroll, true);
  window.addEventListener("resize", handleScroll);

  // ── Hide on outside click ────────────────────────────────────────────────────
  document.addEventListener("click", (e) => {
    if (isOpen && !containerEl.contains(e.target) && !dropdownEl.contains(e.target)) {
      hideDropdown();
    }
  });

  // ── Cleanup helper (call when the parent modal is destroyed) ─────────────────
  searchInputEl._destroyAutocomplete = () => {
    hideDropdown();
    dropdownEl.remove();
    window.removeEventListener("scroll", handleScroll, true);
    window.removeEventListener("resize", handleScroll);
  };
}
