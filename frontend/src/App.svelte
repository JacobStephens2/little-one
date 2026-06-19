<script lang="ts">
  import { onMount } from "svelte";
  import { session, booting, loadSession } from "./lib/session";
  import { toastMsg } from "./lib/toast";
  import Auth from "./components/Auth.svelte";
  import Main from "./components/Main.svelte";

  // URL-driven flows from email links: ?reset=, ?invite=, ?welcome=, ?verify=failed, ?magic=failed
  let params = $state(new URLSearchParams(location.search));
  let authFlash = $state("");

  function clearQuery() {
    history.replaceState(null, "", location.pathname);
    params = new URLSearchParams("");
  }

  onMount(async () => {
    if (params.get("verify") === "failed") authFlash = "That verification link is invalid or expired.";
    if (params.get("magic") === "failed") authFlash = "That sign-in link is invalid or expired.";
    if (params.get("welcome") != null) authFlash = "";
    await loadSession();
    booting.set(false);
  });
</script>

{#if $booting}
  <div class="boot"><div class="mark-lg">{@html "<svg viewBox='0 0 24 24' fill='currentColor'><path d='M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z'/></svg>"}</div></div>
{:else if $session}
  <Main />
{:else}
  <Auth
    resetToken={params.get("reset")}
    inviteToken={params.get("invite")}
    flash={authFlash}
    ondone={clearQuery}
  />
{/if}

{#if $toastMsg}
  <div class="toast show">{$toastMsg}</div>
{/if}

<style>
  .boot { min-height: 100dvh; display: grid; place-items: center; }
  .boot .mark-lg { width: 76px; height: 76px; border-radius: 24px; display: grid; place-items: center;
    background: linear-gradient(150deg, var(--clay), var(--gold)); box-shadow: var(--shadow); animation: pulse 1.6s ease-in-out infinite; }
  .boot :global(svg) { width: 42px; height: 42px; color: #fff9f0; }
</style>
