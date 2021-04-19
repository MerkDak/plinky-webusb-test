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

	$: connected = ['connected', 'loadPatch', 'loadingPatch', 'savePatch'].indexOf($store.state) > -1;

</script>

<main>
	<h1>Current state: {$store.state}</h1>

	<button style="display: {!connected ? 'block' : 'none'}" on:click={connect}>Connect</button>

	<div style="display: {connected ? 'block' : 'none'}">
		<label for="i-patch-number">Patch number</label>
		<input type="number" id="i-patch-number" bind:value={$store.context.patchNumber} />
		<button on:click={loadPatch}>Load patch</button>
		<button on:click={savePatch}>Save patch</button>
	</div>

</main>

<style>
	main {
		padding: 1em;
		margin: 0 auto;
	}
	button {
		padding: 6px 12px;
		margin: 0;
		display: inline-block;
	}
</style>