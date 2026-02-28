<script lang="ts">
  import '../app.css';
  let { data, children } = $props();
</script>

<svelte:head>
  <title>Misneach</title>
</svelte:head>

{@render children()}
