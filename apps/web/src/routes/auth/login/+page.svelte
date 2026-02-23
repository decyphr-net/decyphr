<script lang="ts">
  let email = '';
  let message = '';
  let loading = false;
  let sent = false;

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    message = '';
    loading = true;

    try {
      const res = await fetch('/api/auth/magic-link', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await res.json();
      if (res.ok) {
        message = data.message || 'Magic link sent!';
        sent = true;
      } else {
        message = data.error || 'Something went wrong';
      }
    } catch {
      message = 'Unable to reach auth service';
    } finally {
      loading = false;
    }
  }
</script>

<nav class="border-b bg-white">
  <div class="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
    <a href="/" class="text-2xl font-bold bg-blue-500 bg-clip-text text-transparent">Misneach</a>
  </div>
</nav>

<div class="min-h-screen grid grid-cols-1 md:grid-cols-2">
  <div class="flex items-center justify-center p-8 bg-gray-50">
    <div class="w-full max-w-md bg-white rounded-xl shadow-lg p-8 animate-slide-in transition-all duration-500 hover:shadow-2xl">
      <h1 class="text-3xl font-bold mb-4">Welcome to Misneach</h1>
      <p class="text-gray-600 mb-6">Your practical Irish course for local business communication.</p>

      <form class="space-y-4" onsubmit={submit}>
        <input
          type="email"
          bind:value={email}
          required
          placeholder="Enter your email"
          class="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:scale-105 transform transition-all duration-300"
        />

        {#if !sent}
          <button
            type="submit"
            class="w-full px-4 py-2 rounded-md bg-gradient-to-r from-teal-400 to-blue-500 text-white font-semibold hover:from-teal-500 hover:to-blue-600 hover:scale-105 transform transition-all duration-300 disabled:opacity-70"
            disabled={loading}
          >
            {#if loading}
              Sending...
            {:else}
              Send magic link
            {/if}
          </button>
        {/if}

        {#if message}
          <div
            class="mt-4 p-3 rounded-md text-center font-medium text-white"
            class:bg-green-600={sent}
            class:bg-red-600={!sent}
          >
            {message}
          </div>
        {/if}
      </form>
    </div>
  </div>

  <div class="hidden md:flex flex-col justify-center text-white bg-gradient-to-br from-teal-500 via-blue-500 to-indigo-600 p-10">
    <div class="max-w-md mx-auto text-center">
      <h2 class="text-3xl font-bold mb-4 animate-fade-in">Why this course?</h2>
      <ul class="text-left space-y-4">
        <li class="flex items-start"><span class="mr-3 text-green-200 text-xl">✅</span><span class="text-blue-100">Learn Irish phrases used in local shops and service counters</span></li>
        <li class="flex items-start"><span class="mr-3 text-green-200 text-xl">✅</span><span class="text-blue-100">Practice realistic customer conversations for Irish businesses</span></li>
        <li class="flex items-start"><span class="mr-3 text-green-200 text-xl">✅</span><span class="text-blue-100">Build confidence quickly with guided scenarios and revision tools</span></li>
      </ul>
    </div>
  </div>
</div>
