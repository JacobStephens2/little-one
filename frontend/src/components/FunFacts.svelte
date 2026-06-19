<script lang="ts">
  import { settings$ } from "../lib/db";
  import { pregInfo } from "../lib/format";
  import { FUN_FACTS, type FunFact } from "../lib/funfacts";
  import Sheet from "./Sheet.svelte";

  let { onclose } = $props<{ onclose: () => void }>();
  const s = $derived($settings$);
  const wk = $derived(pregInfo(s).ga?.weeks ?? 0);
  const upcoming = $derived(FUN_FACTS.filter((f) => f.week >= wk).sort((a, b) => a.week - b.week));
  const earlier = $derived(FUN_FACTS.filter((f) => f.week < wk).sort((a, b) => b.week - a.week));

  function soon(f: FunFact): string {
    const n = f.week - wk;
    return n <= 0 ? "around now" : n === 1 ? "next week" : `in ~${n} wks`;
  }
</script>

{#snippet fact(f: FunFact, badge: string, hot: boolean)}
  <div class="ff">
    <div class="ff-top">
      <span class="ff-emoji">{f.emoji}</span>
      <span class="ff-q">{f.q}</span>
      <span class="ff-when" class:hot>{badge}</span>
    </div>
    <div class="ff-a">{f.a}</div>
  </div>
{/snippet}

<Sheet {onclose}>
  <h3>Did you know?</h3>
  <p class="sub">Little milestones and curiosities, timed to where you are{wk ? ` (week ${wk})` : ""}.</p>

  {#if upcoming.length}
    <div class="tl-day-label">Coming up</div>
    {#each upcoming as f (f.q)}{@render fact(f, soon(f), f.week - wk <= 1)}{/each}
  {/if}
  {#if earlier.length}
    <div class="tl-day-label">Earlier in your pregnancy</div>
    {#each earlier as f (f.q)}{@render fact(f, `week ${f.week}`, false)}{/each}
  {/if}

  <p class="tiny" style="text-align:center;margin:14px 4px 0">General information, not medical advice — every pregnancy is different, so check with your provider.</p>
  <div class="btn-row" style="margin-top:12px"><button class="btn ghost" type="button" onclick={onclose}>Close</button></div>
</Sheet>

<style>
  .ff { background: var(--card); border: 1px solid var(--line); border-radius: var(--radius-sm); box-shadow: var(--shadow-sm); padding: 14px 16px; margin-bottom: 10px; }
  .ff-top { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
  .ff-emoji { font-size: 1.35rem; line-height: 1; }
  .ff-q { font-weight: 700; flex: 1; font-size: .96rem; }
  .ff-a { font-size: .89rem; color: var(--ink-soft); line-height: 1.5; }
  .ff-when { font-size: .68rem; color: var(--ink-faint); background: color-mix(in srgb, var(--ink-faint) 12%, transparent); padding: 3px 9px; border-radius: 999px; white-space: nowrap; }
  .ff-when.hot { color: var(--clay-deep); background: color-mix(in srgb, var(--clay) 14%, transparent); }
</style>
