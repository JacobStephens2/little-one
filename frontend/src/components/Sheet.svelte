<script lang="ts">
  import { onMount } from "svelte";
  let { onclose, children } = $props<{ onclose?: () => void; children?: any }>();
  let open = $state(false);
  onMount(() => { requestAnimationFrame(() => (open = true)); });
  function backdrop(e: MouseEvent) { if (e.target === e.currentTarget) onclose?.(); }
</script>

<div class="scrim" class:open role="presentation" onclick={backdrop}>
  <div class="sheet" role="dialog" aria-modal="true">
    <div class="grab"></div>
    {@render children?.()}
  </div>
</div>
