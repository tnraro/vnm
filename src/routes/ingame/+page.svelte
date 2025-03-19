<script lang="ts">
  import Paragraph from "$lib/features/script/paragraph.svelte";
  import type { VariableCommand } from "$lib/features/svnm/command.js";
  import type { SvnmState } from "$lib/features/svnm/svnm-parser.js";
  import { SvnmRuntime } from "$lib/features/svnm/svnm-runtime.js";

  let { data } = $props();

  let currentState = $state.raw<SvnmState>();
  let done = $state(false);

  const runtime = new SvnmRuntime(data.svnm, {
    start: data.config.states.start,
    functions: {
      입장: (runtime) => {
        currentState = runtime.currentState;
        done = false;
      },
      증가: (runtime, x: VariableCommand) => {
        runtime.setVariable(x.name, runtime.getVariable(x.name) + 1);
      },
    },
  });
</script>

<button
  onclick={() => {
    if (done) {
      runtime.emit("다음");
    } else {
      runtime.emit("완독");
      done = true;
    }
  }}>다음</button
>
<div style:margin-bottom="1rem">
  state id: {currentState?.id}
</div>
{#if currentState != null}
  {#key currentState.id}
    <Paragraph paragraph={currentState.paragraph} bind:done />
  {/key}
  {#if currentState.options != null && done}
    <div>
      {#each currentState.options as item}
        <button
          disabled={!runtime.checkCondition(item.condition)}
          onclick={() => {
            runtime.select(item.name);
          }}>{item.name}</button
        >
      {/each}
    </div>
  {/if}
{/if}
