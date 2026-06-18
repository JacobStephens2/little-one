import "./app.css";
import { mount } from "svelte";
import App from "./App.svelte";
import { applyTheme } from "./lib/session";

applyTheme();
matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
  if ((localStorage.getItem("baby.theme") || "light") === "auto") applyTheme();
});
if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});

export default mount(App, { target: document.getElementById("root")! });
