<script>

	import 'robot3/debug';
	import { onMount } from "svelte";
	import { PlinkyMachine } from './lib/PlinkyMachine';

	let port;
	let inref;
	let inarrbufref;
	let outref;

	const { store, send, service } = PlinkyMachine;

	async function connect() {
		send('connect'); 
	}

	function loadPatch() {
		send({
			type: 'loadPatch',
			patchNumber: $store.context.patchNumber
		});
	}

	function savePatch() {
	}

	function clearPatch() {
		send({
			type: 'clearPatch'
		});
	}

	$: connected = ['connected', 'loadPatch', 'savePatch'].indexOf($store.state) > -1;
	$: disabled = ['loadPatch', 'savePatch'].indexOf($store.state) > -1;

</script>

<main>
	<h1>Plinky WebUSB playground</h1>
	<h2>Current state: {$store.state}</h2>

	<button style="display: {!connected ? 'block' : 'none'}" on:click={connect}>Connect</button>

	<div style="display: {connected ? 'block' : 'none'}">
		<label for="i-patch-number">Patch number</label>
		<input type="number" disabled={disabled} id="i-patch-number" bind:value={$store.context.patchNumber} />
		<button disabled={disabled} on:click={loadPatch}>Load patch</button>
		<button disabled={disabled} on:click={savePatch}>Save patch</button>
	</div>

	<h2>Current patch</h2>

	{#if $store.context.patch}

		<button on:click|preventDefault={clearPatch}>Clear patch in browser memory</button>

		<p>Loaded: {$store.context.patch.byteLength} bytes</p>

		<ul>
			{#each $store.context.patchJSON as param}
				<li>{param.name} - {param.value}</li>
			{/each}
		</ul>
	{:else}
		<p>No patch in browser memory</p>
	{/if}

</main>

<style>
	main {
		padding: 1em;
		margin: 0 auto;
	}
	h1 {
		margin-top: 0;
	}
	button {
		padding: 6px 12px;
		margin: 0;
		display: inline-block;
	}
</style>