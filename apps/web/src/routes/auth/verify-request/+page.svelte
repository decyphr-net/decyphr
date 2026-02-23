<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';

  let message = 'Verifying your secure login link...';
  let state: 'loading' | 'error' = 'loading';
  let token = '';
  let email = '';

  async function verify() {
    if (!token || !email) {
      message = 'Invalid verification link';
      state = 'error';
      return;
    }

    const res = await fetch('/api/auth/verify-request', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token, email })
    });

    if (!res.ok) {
      const data = await res.json();
      message = data.error || 'Verification failed';
      state = 'error';
      return;
    }

    await goto('/dashboard');
  }

  onMount(async () => {
    const params = new URLSearchParams(window.location.search);
    token = params.get('token') || '';
    email = params.get('email') || '';
    await verify();
  });
</script>

<nav class="border-b bg-white">
  <div class="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
    <a href="/" class="text-2xl font-bold bg-blue-500 bg-clip-text text-transparent">Misneach</a>
  </div>
</nav>

<div class="min-h-screen flex items-center justify-center bg-gray-50 p-6">
  <div class="w-full max-w-md bg-white rounded-xl shadow-lg p-8 text-center animate-slide-in">
    <h1 class="text-2xl font-bold mb-3">Magic Link Verification</h1>
    <p class="text-gray-600 mb-6">Please wait while we sign you in.</p>

    <div class="p-4 rounded-md text-white font-medium" class:bg-blue-600={state === 'loading'} class:bg-red-600={state === 'error'}>
      {message}
    </div>

    {#if state === 'error'}
      <a href="/auth/login" class="inline-block mt-6 px-5 py-2 rounded bg-gradient-to-r from-teal-400 to-blue-500 text-white font-semibold hover:from-teal-500 hover:to-blue-600">
        Back to sign in
      </a>
    {/if}
  </div>
</div>
