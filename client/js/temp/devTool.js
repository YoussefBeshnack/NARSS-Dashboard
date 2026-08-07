import { AuthStore } from "../services/auth.store.js";
import { handleLogout } from "../core/logout.js";

const control = new AuthStore();

const shortcutMap = {
  "Ctrl+Shift+KeyS": () => control.setSession({ token: "temp" }),
  "Ctrl+Shift+KeyL": () => await handleLogout(),
};

document.addEventListener("keydown", (event) => {
  if (["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)) return;

  // Build key combination identifier
  const modifiers = [];
  if (event.ctrlKey || event.metaKey) modifiers.push("Ctrl");
  if (event.altKey) modifiers.push("Alt");
  if (event.shiftKey) modifiers.push("Shift");

  const combo = [...modifiers, event.code].join("+");

  const action = shortcutMap[combo] || shortcutMap[event.code];

  if (action) {
    event.preventDefault();
    action();

    document.querySelector("body").innerHTML = loadingScreenHTML;
    setTimeout(function () {
      navigation.reload();
    }, 1000);
  }
});

const loadingScreenHTML = `
<div id="loading-screen" style="
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(15, 23, 42, 0.9);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 99999;
  font-family: system-ui, -apple-system, sans-serif;
  color: #ffffff;
  transition: opacity 0.3s ease, visibility 0.3s ease;
">
  <div style="
    width: 48px;
    height: 48px;
    border: 4px solid rgba(255, 255, 255, 0.1);
    border-top-color: #3b82f6;
    border-radius: 50%;
    animation: spinner 0.8s linear infinite;
  "></div>
  <p style="
    margin-top: 16px;
    font-size: 0.95rem;
    letter-spacing: 0.05em;
    color: #94a3b8;
  ">Loading...</p>

  <style>
    @keyframes spinner {
      to { transform: rotate(360deg); }
    }
  </style>
</div>
`;
