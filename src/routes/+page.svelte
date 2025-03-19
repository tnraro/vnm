<script lang="ts">
  let { data } = $props();
</script>

<div>
  {JSON.stringify(data.config)}
  <a href="/ingame">새 게임</a>
</div>
