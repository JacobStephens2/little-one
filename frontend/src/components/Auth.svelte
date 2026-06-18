<script lang="ts">
  import { onMount } from "svelte";
  import { auth } from "../lib/session";
  import { I } from "../lib/icons";

  let { resetToken = null, inviteToken = null, flash = "", ondone } = $props<{
    resetToken?: string | null; inviteToken?: string | null; flash?: string; ondone?: () => void;
  }>();

  type Mode = "login" | "register" | "forgot" | "magic" | "reset" | "invite";
  let mode = $state<Mode>(resetToken ? "reset" : "login");
  let email = $state(""), password = $state(""), name = $state(""), household = $state("");
  let err = $state(""), info = $state(flash), busy = $state(false);
  let inviteHousehold = $state("");

  onMount(async () => {
    if (inviteToken) {
      try {
        const d = await auth.inviteInfo(inviteToken);
        email = d.email; inviteHousehold = d.household; mode = "invite";
      } catch (e: any) { err = e.detail || "This invite is invalid or expired."; }
    }
  });

  async function go(e: Event) {
    e.preventDefault();
    err = ""; info = ""; busy = true;
    try {
      if (mode === "login") await auth.login(email, password);
      else if (mode === "register") { await auth.register({ email, password, display_name: name, household_name: household }); info = "Check your email to confirm your account, then sign in."; mode = "login"; }
      else if (mode === "forgot") { await auth.forgot(email); info = "If that email has an account, a reset link is on its way."; mode = "login"; }
      else if (mode === "magic") { await auth.magic(email); info = "Check your email for a sign-in link."; }
      else if (mode === "reset") { await auth.reset(resetToken!, password); ondone?.(); }
      else if (mode === "invite") { await auth.acceptInvite(inviteToken!, password, name); ondone?.(); }
    } catch (e: any) {
      err = e.detail || "Something went wrong. Try again.";
      if (e.status === 403) info = "";
    } finally { busy = false; }
  }
  const title = $derived<Record<Mode, string>>({
    login: "Welcome back", register: "Create your space", forgot: "Reset password",
    magic: "Email me a link", reset: "Choose a new password", invite: `Join ${inviteHousehold}`,
  });
</script>

<div class="login-wrap">
  <div class="mark-lg">{@html I.heart}</div>
  <h1>Little One</h1>
  <p>{mode === "invite" ? `You've been invited to help track ${inviteHousehold}.` : "A warm, private place for pregnancy and your new baby."}</p>

  <form class="login-card stack" onsubmit={go}>
    <div class="auth-title">{title[mode]}</div>

    {#if mode === "register" || mode === "invite"}
      <input bind:value={name} placeholder="Your name (e.g. Mom, Dad)" autocomplete="name" />
    {/if}
    {#if mode === "register"}
      <input bind:value={household} placeholder="Family name (optional)" />
    {/if}
    {#if mode !== "reset" && mode !== "invite"}
      <input bind:value={email} type="email" placeholder="Email" autocomplete="email" required />
    {/if}
    {#if mode === "invite"}
      <input value={email} disabled />
    {/if}
    {#if mode !== "forgot" && mode !== "magic"}
      <input bind:value={password} type="password" placeholder={mode === "login" ? "Password" : "Choose a password (8+ chars)"} autocomplete={mode === "login" ? "current-password" : "new-password"} required />
    {/if}

    <button class="btn primary" type="submit" disabled={busy}>
      {busy ? "…" : mode === "login" ? "Sign in" : mode === "register" ? "Create account" : mode === "forgot" ? "Send reset link" : mode === "magic" ? "Send link" : mode === "reset" ? "Set password" : "Join household"}
    </button>

    {#if err}<div class="login-err">{err}</div>{/if}
    {#if info}<div class="login-info">{info}</div>{/if}
  </form>

  {#if mode === "login"}
    <div class="auth-links">
      <button onclick={() => { mode = "register"; err = ""; info = ""; }}>Create an account</button>
      <span>·</span>
      <button onclick={() => { mode = "magic"; err = ""; info = ""; }}>Email me a link</button>
      <span>·</span>
      <button onclick={() => { mode = "forgot"; err = ""; info = ""; }}>Forgot password</button>
    </div>
  {:else if mode !== "invite" && mode !== "reset"}
    <div class="auth-links"><button onclick={() => { mode = "login"; err = ""; info = ""; }}>← Back to sign in</button></div>
  {/if}
</div>

<style>
  .auth-title { font-family: var(--display); font-size: 1.15rem; color: var(--ink); margin-bottom: 4px; }
  .login-info { color: var(--sage); font-size: .86rem; margin-top: 8px; }
  .auth-links { margin-top: 18px; display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; align-items: center; }
  .auth-links button { color: var(--clay); font-weight: 600; font-size: .85rem; background: none; }
  .auth-links span { color: var(--ink-faint); }
  input:disabled { opacity: .6; }
</style>
