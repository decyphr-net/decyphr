<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let open = false;
  export let title = '';
  export let description = '';
  export let maxWidthClass = 'max-w-lg';
  export let closeOnBackdrop = true;
  export let closeOnEscape = true;

  const dispatch = createEventDispatcher<{ close: void }>();

  function close() {
    dispatch('close');
  }

  function onBackdropClick(event: MouseEvent) {
    if (!closeOnBackdrop) return;
    if (event.target === event.currentTarget) {
      close();
    }
  }

  function onKeyDown(event: KeyboardEvent) {
    if (!closeOnEscape) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
    }
  }
</script>

{#if open}
  <div
    class="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/55 p-4"
    onclick={onBackdropClick}
    onkeydown={onKeyDown}
    tabindex="-1"
    role="presentation"
  >
    <section
      class={`w-full ${maxWidthClass} rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl`}
      role="dialog"
      aria-modal="true"
      aria-label={title || 'Dialog'}
    >
      {#if title}
        <h2 class="text-2xl font-bold text-slate-900">{title}</h2>
      {/if}
      {#if description}
        <p class="mt-2 text-sm text-slate-600">{description}</p>
      {/if}

      <div class="mt-4">
        <slot />
      </div>

      <div class="mt-6 flex flex-wrap justify-end gap-2">
        <slot name="actions" />
      </div>
    </section>
  </div>
{/if}
