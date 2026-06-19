<script lang="ts">
  import { onMount } from "svelte";
  import { settings$, events$, saveSettings, setLoggedBy } from "../lib/db";
  import { pregAnchors } from "../lib/format";
  import { session, auth, loadSession, enablePush, disablePush, pushSubscribed, pushTest, setTheme, currentTheme } from "../lib/session";
  import { toast } from "../lib/toast";
  import type { Settings } from "../lib/types";

  const s = $derived($settings$);
  const sess = $derived($session);

  let form = $state<Settings>({});
  let displayName = $state("");
  let householdName = $state("");
  let inviteEmail = $state("");
  let theme = $state(currentTheme());
  let pushState = $state<string>("");

  onMount(() => {
    form = { ...$settings$ };
    displayName = $session?.user.display_name || "";
    householdName = $session?.household.name || "";
    initPush();
  });
  async function initPush() {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) { pushState = "unsupported"; return; }
    if (Notification.permission === "denied") { pushState = "denied"; return; }
    pushState = (await pushSubscribed()) ? "granted" : "off";
  }

  const dueHint = $derived.by(() => {
    const due = pregAnchors(form).due;
    return due != null ? new Date(due).toLocaleDateString([], { month: "long", day: "numeric", year: "numeric" }) : null;
  });

  async function saveDates() {
    await saveSettings({
      baby_name: (form.baby_name || "").trim(),
      lmp_date: form.lmp_date || null,
      conception_date: form.conception_date || null,
      age_pref: form.age_pref || "embryonic",
      birth_date: form.birth_date || null,
      units: form.units || "imperial",
      feed_reminder_hours: form.feed_reminder_hours ? Number(form.feed_reminder_hours) : null,
    });
    toast("Saved ✓");
  }
  async function saveProfile() {
    await auth.updateProfile({ display_name: displayName.trim(), household_name: householdName.trim() });
    setLoggedBy(displayName.trim());
    await loadSession();
    toast("Saved ✓");
  }
  async function sendInvite() {
    if (!inviteEmail.trim()) return;
    try { await auth.invite(inviteEmail.trim()); toast("Invite sent ✓"); inviteEmail = ""; await loadSession(); }
    catch (e: any) { toast(e.detail || "Couldn't send invite"); }
  }
  async function turnOnPush() {
    try {
      const r = await enablePush();
      pushState = r === "granted" ? "granted" : r;
      if (r === "granted") toast("Notifications on");
      else if (r === "denied") toast("Allow notifications in your browser site settings");
      else if (r === "unsupported") toast("This browser can't do push here");
    } catch (e: any) {
      console.error("enablePush failed:", e);
      toast("Push error: " + (e?.name || "") + " " + (e?.message || e));
    }
  }
  async function testPush() { try { await pushTest(); toast("Test sent"); } catch { toast("Send a subscription first"); } }
  async function turnOffPush() { try { await disablePush(); pushState = "off"; toast("Reminders off"); } catch { toast("Couldn't turn off"); } }
  function pickTheme(t: string) { theme = t; setTheme(t); }
  function exportData() {
    const blob = new Blob([JSON.stringify({ settings: $settings$, events: $events$ }, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "baby-export.json"; a.click(); URL.revokeObjectURL(a.href);
  }
</script>

<div class="sec-head"><h3>Settings</h3></div>
<div class="stack">
  <section class="card">
    <form onsubmit={(e) => { e.preventDefault(); saveDates(); }} class="stack" style="margin:0">
      <label class="fld"><span class="lt">Baby's name or nickname</span><input bind:value={form.baby_name} placeholder="Little One" /></label>
      <label class="fld"><span class="lt">First day of last period <span class="tiny">· gestational age</span></span><input type="date" bind:value={form.lmp_date} /></label>
      <label class="fld"><span class="lt">Conception date <span class="tiny">· embryonic age</span></span><input type="date" bind:value={form.conception_date} /></label>
      {#if dueHint}<p class="tiny" style="margin:-6px 2px 0">Estimated due date: {dueHint}</p>{/if}
      <label class="fld"><span class="lt">Show age as</span>
        <div class="seg">
          <button type="button" class:on={(form.age_pref || "embryonic") === "embryonic"} onclick={() => (form.age_pref = "embryonic")}>Embryonic</button>
          <button type="button" class:on={form.age_pref === "gestational"} onclick={() => (form.age_pref = "gestational")}>Gestational</button>
        </div>
      </label>
      <label class="fld"><span class="lt">Birth date <span class="tiny">(switches to baby mode)</span></span><input type="date" bind:value={form.birth_date} /></label>
      <label class="fld"><span class="lt">Units</span>
        <div class="seg">
          <button type="button" class:on={(form.units || "imperial") === "imperial"} onclick={() => (form.units = "imperial")}>Imperial (oz, lb, in)</button>
          <button type="button" class:on={form.units === "metric"} onclick={() => (form.units = "metric")}>Metric (ml, kg, cm)</button>
        </div>
      </label>
      <button class="btn primary" type="submit">Save</button>
    </form>
  </section>

  <section class="card">
    <form onsubmit={(e) => { e.preventDefault(); saveProfile(); }} class="stack" style="margin:0">
      <label class="fld"><span class="lt">Your name <span class="tiny">(stamped on entries you log)</span></span><input bind:value={displayName} placeholder="Mom, Dad, your name" /></label>
      {#if sess?.user.role === "owner"}
        <label class="fld"><span class="lt">Household name</span><input bind:value={householdName} /></label>
      {/if}
      <p class="tiny" style="margin:0">Signed in as {sess?.user.email}</p>
      <button class="btn ghost" type="submit">Update profile</button>
    </form>
  </section>

  <section class="card">
    <div class="lt" style="margin-bottom:10px">Household {sess ? "· " + sess.household.name : ""}</div>
    {#if sess}
      {#each sess.members as m}
        <div class="list-row"><span>{m.display_name} <span class="tiny">{m.role === "owner" ? "· owner" : ""}{m.verified ? "" : " · unverified"}</span></span><span class="tiny">{m.email}</span></div>
      {/each}
      {#each sess.pending_invites as e}
        <div class="list-row"><span class="muted">Invited</span><span class="tiny">{e}</span></div>
      {/each}
    {/if}
    <label class="fld" style="margin-top:14px"><span class="lt">Invite a partner by email</span>
      <div style="display:flex;gap:8px"><input type="email" bind:value={inviteEmail} placeholder="partner@email.com" /><button class="btn primary" style="width:auto;padding:0 18px" type="button" onclick={sendInvite}>Send</button></div>
    </label>
  </section>

  <section class="card">
    <div class="lt" style="margin-bottom:10px">Notifications</div>
    {#if pushState === "granted"}
      <div class="list-row"><span>Push reminders are on</span>
        <span style="display:flex;gap:8px">
          <button class="btn ghost" style="width:auto;padding:8px 14px" type="button" onclick={testPush}>Test</button>
          <button class="btn danger" style="width:auto;padding:8px 14px" type="button" onclick={turnOffPush}>Turn off</button>
        </span>
      </div>
    {:else if pushState === "unsupported"}
      <p class="tiny" style="margin:0">This browser doesn't support push. On iPhone, add to your Home Screen first.</p>
    {:else}
      <div class="list-row"><span>Get reminders for appointments &amp; feeds</span><button class="btn primary" style="width:auto;padding:8px 16px" type="button" onclick={turnOnPush}>Turn on</button></div>
      {#if pushState === "denied"}<p class="tiny" style="margin:8px 0 0">Notifications are blocked in your browser settings.</p>{/if}
    {/if}
    <label class="fld" style="margin-top:14px"><span class="lt">Feed reminder <span class="tiny">(hours since last feed; blank = off)</span></span>
      <input type="number" step="0.5" inputmode="decimal" bind:value={form.feed_reminder_hours} placeholder="e.g. 3" onchange={saveDates} />
    </label>
  </section>

  <section class="card">
    <div class="lt" style="margin-bottom:10px">Appearance</div>
    <div class="seg">
      {#each ["light", "night", "auto"] as t}<button type="button" class:on={theme === t} onclick={() => pickTheme(t)}>{t === "light" ? "Day" : t === "night" ? "Night" : "Auto"}</button>{/each}
    </div>
  </section>

  <section class="card">
    <div class="list-row"><span>Export all data</span><button class="btn ghost" style="width:auto;padding:10px 16px" type="button" onclick={exportData}>Download</button></div>
    <div class="list-row"><span>Sign out</span><button class="btn danger" style="width:auto;padding:10px 16px" type="button" onclick={auth.logout}>Log out</button></div>
  </section>
</div>
