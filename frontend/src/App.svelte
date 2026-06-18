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
  <div class="boot"><div class="mark-lg">{@html "<svg viewBox='0 0 24 24' fill='currentColor'><path d='M12 21C5.5 15.5 3 12.5 3 9.2 3 6.4 5.2 4.2 8 4.2c1.6 0 3.1.8 4 2 .9-1.2 2.4-2 4-2 2.8 0 5 2.2 5 5 0 3.3-2.5 6.3-9 11.8z'/></svg>"}</div></div>
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
