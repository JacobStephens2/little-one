<script lang="ts">
  import { r1 } from "../../lib/format";
  let { points, unit } = $props<{ points: { t: number; v: number }[]; unit: string }>();
  const W = 480, H = 180, pad = 28;
  const xs = $derived(points.map((p) => p.t));
  const ys = $derived(points.map((p) => p.v));
  const minX = $derived(Math.min(...xs)), maxX = $derived(Math.max(...xs));
  const minY = $derived(Math.min(...ys)), maxY = $derived(Math.max(...ys));
  const sx = (t: number) => pad + (W - 2 * pad) * (maxX === minX ? 0.5 : (t - minX) / (maxX - minX));
  const sy = (v: number) => H - pad - (H - 2 * pad) * (maxY === minY ? 0.5 : (v - minY) / (maxY - minY));
  const d = $derived(points.map((p, i) => `${i ? "L" : "M"}${sx(p.t).toFixed(1)} ${sy(p.v).toFixed(1)}`).join(" "));
  const area = $derived(`${d} L${sx(maxX).toFixed(1)} ${H - pad} L${sx(minX).toFixed(1)} ${H - pad} Z`);
</script>

<svg class="chart" viewBox="0 0 {W} {H}" preserveAspectRatio="none">
  <line class="axis" x1={pad} y1={H - pad} x2={W - pad} y2={H - pad} />
  <path class="area" d={area} /><path class="line" d={d} />
  {#each points as p}<circle class="dot" cx={sx(p.t).toFixed(1)} cy={sy(p.v).toFixed(1)} r="4" />{/each}
</svg>
<div class="chart-legend"><span>{r1(minY)} {unit}</span><span>→</span><span>{r1(maxY)} {unit}</span></div>
