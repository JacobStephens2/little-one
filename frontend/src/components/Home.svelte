<script lang="ts">
  import { onMount } from "svelte";
  import { events$, settings$, saveSettings } from "../lib/db";
  import { toast } from "../lib/toast";
  import { I, META } from "../lib/icons";
  import { WEEK_DATA } from "../lib/weekdata";
  import { sessionFact, factDismissed } from "../lib/funfacts";
  import {
    phase, pregInfo, babyAge, units, summary, fmtDur, timeAgo, dayKey, r1,
  } from "../lib/format";
  import type { Ev } from "../lib/types";
  import TlItem from "./TlItem.svelte";

  let { open } = $props<{ open: (s: any) => void }>();
  const s = $derived($settings$);
  const evs = $derived($events$);
  const ph = $derived(phase(s));

  let ringOn = $state(false);
  onMount(() => requestAnimationFrame(() => requestAnimationFrame(() => (ringOn = true))));

  const recent = $derived(evs.slice(0, 5));
  function openEvent(ev: Ev) { open({ kind: "event", id: ev.id }); }

  function toggleAge() {
    const next = (s.age_pref || "embryonic") === "embryonic" ? "gestational" : "embryonic";
    saveSettings({ age_pref: next });
    toast("Showing " + next + " age");
  }
</script>

{#if ph === "setup"}
  <div class="stack">
    <section class="card reveal hero">
      <div class="eyebrow">Welcome</div>
      <h2>Let's get started</h2>
      <p class="due">Add the dates of your pregnancy, or your baby's birthday, in Settings and we'll tailor everything from here.</p>
    </section>
    <p class="empty"><span class="e-emoji">🍼</span><br><span class="tiny">A private little home for every kick, feed, and milestone.</span></p>
  </div>

{:else if ph === "pregnancy"}
  {@const g = pregInfo(s)}
  {@const primary = (g.pref === "embryonic" ? (g.emb || g.ga) : (g.ga || g.emb))}
  {@const secondary = g.pref === "embryonic" ? g.ga : g.emb}
  {@const wk = g.ga ? Math.min(40, Math.max(4, g.ga.weeks)) : 4}
  {@const w = WEEK_DATA[wk] || WEEK_DATA[40]}
  {@const C = 2 * Math.PI * 92}
  {@const lastUS = evs.find((e) => e.type === "ultrasound")}
  {@const upcoming = evs.filter((e) => e.type === "appointment" && e.data.when && new Date(e.data.when) > new Date()).sort((a, b) => +new Date(a.data.when) - +new Date(b.data.when)).slice(0, 2)}
  {@const fact = sessionFact(g.ga?.weeks ?? 0)}
  <div class="stack">
    <section class="card reveal hero">
      <div class="eyebrow">{g.tri}</div>
      <div class="ring-wrap" role="button" tabindex="0" title="Tap to switch age type" style="cursor:pointer" onclick={toggleAge} onkeydown={(e) => (e.key === "Enter" || e.key === " ") && toggleAge()}>
        <svg class="ring" viewBox="0 0 200 200">
          <circle class="ring-bg" cx="100" cy="100" r="92" />
          <circle class="ring-fg" cx="100" cy="100" r="92" stroke-dasharray={C} stroke-dashoffset={ringOn ? C * (1 - g.pct) : C} />
        </svg>
        <div class="ring-label">
          <span class="big">{primary?.weeks ?? 0}<span style="font-size:1.3rem">w</span></span>
          <span class="sub">{primary?.rem ?? 0}d · {g.pref} age</span>
        </div>
      </div>
      {#if g.daysToDue != null}
        <span class="trimester">{g.daysToDue >= 0 ? g.daysToDue + " days to go" : Math.abs(g.daysToDue) + " days over"}</span>
      {/if}
      <h2>Due {g.due != null ? new Date(g.due).toLocaleDateString([], { month: "long", day: "numeric", year: "numeric" }) : "—"}</h2>
      {#if secondary}<div class="due">{g.pref === "embryonic" ? "Gestational" : "Embryonic"} age · {secondary.weeks}w {secondary.rem}d</div>
        <div class="tiny" style="margin-top:5px;opacity:.75">tap the ring to switch</div>{/if}
    </section>

    <section class="card reveal size-card">
      <div class="fruit">{w.emoji}</div>
      <div class="meta">
        <div class="eyebrow">Week {wk} gestational · size of a</div>
        <div class="name">{w.fruit}</div>
        <div class="dims">{w.size}</div>
        <div class="blurb">{w.note}</div>
      </div>
    </section>

    {#if fact && !$factDismissed}
      <section class="card reveal">
        <div class="row-between">
          <span class="eyebrow">Did you know?</span>
          <button aria-label="Dismiss" onclick={() => factDismissed.set(true)} style="width:26px;height:26px;border-radius:50%;background:color-mix(in srgb,var(--ink-faint) 16%,transparent);color:var(--ink-soft);font-size:1.15rem;line-height:1;display:grid;place-items:center;flex:none">×</button>
        </div>
        <div style="display:flex;gap:14px;align-items:flex-start;margin-top:10px">
          <span style="font-size:1.9rem;line-height:1">{fact.emoji}</span>
          <div><div class="display" style="font-size:1.1rem;line-height:1.25">{fact.q}</div><div class="muted" style="margin-top:5px">{fact.a}</div></div>
        </div>
        <div class="tiny" style="margin-top:10px;opacity:.65">General info, not medical advice.</div>
      </section>
    {/if}

    {#if lastUS}
      <section class="card reveal" style="display:flex;gap:16px;align-items:center">
        <div class="ti t-sky" style="width:48px;height:48px;border-radius:14px;display:grid;place-items:center;flex:none">{@html I.ultrasound}</div>
        <div style="flex:1"><div class="eyebrow">Latest ultrasound</div><div class="display" style="font-size:1.25rem">{summary(lastUS, s)}</div><div class="tiny">{new Date(lastUS.ts).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}</div></div>
      </section>
    {/if}

    <div class="sec-head"><h3>Quick log</h3></div>
    <div class="quick-grid">
      <button class="quick t-rose" onclick={() => open({ kind: "log", type: "symptom" })}><span class="qi">{@html I.symptom}</span><span><span class="qt">Symptom</span><br><span class="qs">How you feel</span></span></button>
      <button class="quick t-sky" onclick={() => open({ kind: "log", type: "ultrasound" })}><span class="qi">{@html I.ultrasound}</span><span><span class="qt">Ultrasound</span><br><span class="qs">CRL & heartbeat</span></span></button>
      <button class="quick t-sage" onclick={() => open({ kind: "log", type: "weight" })}><span class="qi">{@html I.weight}</span><span><span class="qt">My weight</span><br><span class="qs">Track the curve</span></span></button>
      <button class="quick t-sky" onclick={() => open({ kind: "log", type: "appointment" })}><span class="qi">{@html I.appointment}</span><span><span class="qt">Appointment</span><br><span class="qs">Don't forget</span></span></button>
      <button class="quick t-sage" onclick={() => open({ kind: "kick" })}><span class="qi">{@html I.kick}</span><span><span class="qt">Kick counter</span><br><span class="qs">Count movements</span></span></button>
      <button class="quick t-rose" onclick={() => open({ kind: "contraction" })}><span class="qi">{@html I.contraction}</span><span><span class="qt">Contractions</span><br><span class="qs">Time them</span></span></button>
    </div>

    {#if upcoming.length}
      <div class="sec-head"><h3>Upcoming</h3></div>
      <div class="stack">
        {#each upcoming as a}
          <div class="tl-item">
            <div class="ti t-sky" style="display:grid;place-items:center">{@html I.appointment}</div>
            <div class="tb"><div class="tt">{a.data.title}</div><div class="ts">{a.data.location || ""}</div></div>
            <div class="tr"><div class="time">{new Date(a.data.when).toLocaleDateString([], { month: "short", day: "numeric" })}</div></div>
          </div>
        {/each}
      </div>
    {/if}

    {@render recentBlock()}
  </div>

{:else}
  {@const a = babyAge(s)}
  {@const U = units(s)}
  {@const lf = evs.find((e) => e.type === "feed")}
  {@const ls = evs.find((e) => e.type === "sleep")}
  {@const ld = evs.find((e) => e.type === "diaper")}
  {@const ongoing = evs.find((e) => e.type === "sleep" && !e.data.end)}
  {@const today = evs.filter((e) => dayKey(e.ts) === dayKey(Date.now()))}
  {@const feeds = today.filter((e) => e.type === "feed")}
  {@const feedVol = feeds.reduce((n, e) => n + (e.data.amount_ml || 0), 0)}
  {@const diapers = today.filter((e) => e.type === "diaper")}
  {@const sleepSec = today.filter((e) => e.type === "sleep" && e.data.end).reduce((n, e) => n + (+new Date(e.data.end) - +new Date(e.ts)) / 1000, 0)}
  <div class="stack">
    {#if ongoing}
      <section class="card reveal" style="display:flex;align-items:center;gap:16px">
        <div class="ti t-plum" style="width:48px;height:48px;border-radius:14px;display:grid;place-items:center">{@html I.sleep}</div>
        <div style="flex:1"><div class="eyebrow pulse">Sleeping now</div><div class="display" style="font-size:1.8rem">{fmtDur((Date.now() - +new Date(ongoing.ts)) / 1000)}</div></div>
        <button class="btn primary" style="width:auto;padding:12px 18px" onclick={() => open({ kind: "event", id: ongoing.id })}>Details</button>
      </section>
    {/if}

    <section class="card reveal">
      <div class="eyebrow">Since last</div>
      <div class="glance" style="margin-top:12px">
        <div class="g"><div class="gl">Fed</div><div class="gv">{lf ? timeAgo(lf.ts).replace(" ago", "") : "—"}</div><div class="gu">{lf ? summary(lf, s) : "no feeds yet"}</div></div>
        <div class="g"><div class="gl">Slept</div><div class="gv">{ls ? timeAgo(ls.data.end || ls.ts).replace(" ago", "") : "—"}</div><div class="gu">{ongoing ? "sleeping" : ls ? summary(ls, s) : "—"}</div></div>
        <div class="g"><div class="gl">Changed</div><div class="gv">{ld ? timeAgo(ld.ts).replace(" ago", "") : "—"}</div><div class="gu">{ld ? summary(ld, s) : "—"}</div></div>
      </div>
    </section>

    <section class="card reveal">
      <div class="row-between"><div class="eyebrow">Today so far</div><div class="tiny">{a.months < 1 ? a.weeks + " weeks old" : a.months + " months old"}</div></div>
      <div class="glance" style="margin-top:12px">
        <div class="g"><div class="gl">Feeds</div><div class="gv">{feeds.length}</div><div class="gu">{feedVol ? r1(U.vol.fromC(feedVol)) + " " + U.vol.u : ""}</div></div>
        <div class="g"><div class="gl">Diapers</div><div class="gv">{diapers.length}</div><div class="gu">{diapers.filter((e) => e.data.kind !== "wet").length} dirty</div></div>
        <div class="g"><div class="gl">Sleep</div><div class="gv">{sleepSec ? fmtDur(sleepSec).split(" ")[0] : "0h"}</div><div class="gu">{sleepSec ? "logged" : "none yet"}</div></div>
      </div>
    </section>

    <div class="sec-head"><h3>Quick log</h3></div>
    <div class="quick-grid">
      {#each [["feed", "Feed", "Breast or bottle"], ["diaper", "Diaper", "Wet or dirty"], ["sleep", "Sleep", "Start or log"], ["pump", "Pump", "Track output"], ["measurement", "Growth", "Weight & length"], ["milestone", "Milestone", "First smile!"]] as item}
        <button class="quick {META[item[0]].tint}" onclick={() => open({ kind: "log", type: item[0] })}>
          <span class="qi">{@html META[item[0]].icon}</span><span><span class="qt">{item[1]}</span><br><span class="qs">{item[2]}</span></span>
        </button>
      {/each}
    </div>

    {@render recentBlock()}
  </div>
{/if}

{#snippet recentBlock()}
  <div class="sec-head"><h3>Recent</h3></div>
  {#if recent.length}
    {#each recent as ev (ev.id)}<TlItem {ev} onopen={openEvent} />{/each}
  {:else}
    <div class="empty"><span class="e-emoji">🌙</span><p>Nothing logged yet</p></div>
  {/if}
{/snippet}
