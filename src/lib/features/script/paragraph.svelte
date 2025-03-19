<script lang="ts">
  import { getConfigSync } from "../config/global-config";

  interface Props {
    paragraph: string;
    done: boolean;
  }
  let { paragraph, done = $bindable() }: Props = $props();

  const config = getConfigSync();

  let { name, context } = $derived.by(() => {
    const match = paragraph.match(/^([^:]+):\s*/);
    if (match == null) {
      return {
        name: undefined,
        context: paragraph,
      };
    }
    return {
      name: match[1],
      context: paragraph.slice(match[0].length),
    };
  });

  let chars = $derived(
    [...context].reduce(
      (ctx, value, i) => {
        const delay =
          config.textAnimation.delay[value] ??
          config.textAnimation.defaultDelay;
        ctx.result.push({
          id: i,
          delay: ctx.delayAccumulation,
          value,
        });
        ctx.delayAccumulation += delay;
        return ctx;
      },
      {
        result: [] as { id: number; delay: number; value: string }[],
        delayAccumulation: config.textAnimation.startDelay,
      }
    ).result
  );
</script>

<div class="container">
  {#if name != null}
    <div class="name">{name}</div>
  {/if}
  <p class="content">
    {#each chars as char (char.id)}
      <span
        class="char"
        style:--delay="{char.delay}ms"
        style:opacity={done ? 1 : undefined}>{char.value}</span
      >
    {/each}
    <span
      class="char"
      style:--delay="{chars.at(-1)?.delay ?? 0}ms"
      onanimationend={() => {
        if (!done) {
          done = true;
        }
      }}
    ></span>
  </p>
</div>

<style>
  .container {
    position: relative;
    border: 1px solid gainsboro;
    border-radius: 0.25rem;
  }
  .name {
    position: absolute;
    font-weight: 700;
    border: 1px solid gainsboro;
    border-radius: 0.25rem;
    background: white;
    transform: translateY(-60%);
    padding: 0.125rem 0.5rem;
    margin-left: 0.5rem;
  }
  .content {
    white-space: pre-wrap;
    user-select: none;
    padding: 1rem;
    margin: 0;
  }
  .char {
    opacity: 0;
    animation: 50ms linear var(--delay) text-animation forwards;
  }
</style>
