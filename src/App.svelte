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

	const paramMin = -100;
	const paramMax = 100;
	const xMin = -1024;
	const xMax = 1024;

	function normalise(x) {
		return (paramMax - paramMin) * ((x-xMin)/(xMax - xMin)) + paramMin;
	}

	$: connected = ['connected', 'loadPatch', 'savePatch'].indexOf($store.state) > -1;
	$: disabled = ['loadPatch', 'savePatch'].indexOf($store.state) > -1;

	function round(num) {
		return Math.round( num * 100 + Number.EPSILON ) / 100;
	}

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

		<ul class="params">
			{#each $store.context.patchJSON as param}
				<li>
					<h3>{param.name}</h3>
					<div class="mods">
						<table>
							<tr>
								<td>Base</td>
								<td>{round(normalise(param.value))}%<br></td>
							</tr>
							<tr>
								<td>Env</td>
								<td>{round(normalise(param.mods.env))}%<br></td>
							</tr>
							<tr>
								<td>Pressure</td>
								<td>{round(normalise(param.mods.pressure))}%<br></td>
							</tr>
							<tr>
								<td>A</td>
								<td>{round(normalise(param.mods.a))}%<br></td>
							</tr>
						</table>
						<table>
							<tr>
								<td>B</td>
								<td>{round(normalise(param.mods.b))}%<br></td>
							</tr>
							<tr>
								<td>X</td>
								<td>{round(normalise(param.mods.x))}%<br></td>
							</tr>
							<tr>
								<td>Y</td>
								<td>{round(normalise(param.mods.y))}%<br></td>
							</tr>
							<tr>
								<td>Random</td>
								<td>{round(normalise(param.mods.random))}%<br></td>
							</tr>
						</table>
					</div>
				</li>
			{/each}
		</ul>
	{:else}
		<p>No patch in browser memory</p>
	{/if}

</main>

<style>
	.params {
		display: grid;
		grid-template-columns: 1fr 1fr 1fr 1fr;
		gap: 8px;
		
		margin: 0;
		list-style: none;
		padding: 0;
	}
	.params li {
		border: 1px solid #ccc;
		padding: 0;
	}
	.params li h3 {
		background: rgb(235, 237, 195);
		padding: 8px 16px;
		margin: 0;
		border-bottom: 1px solid #ccc;
	}
	.params li .mods {
		display: grid;
		padding: 16px;
		grid-template-columns: 1fr 1fr;
	}
	.params li .mods table {
		width: 100%;
	}
	.params li table td {
		padding-right: 16px;
		font-size: 14px;
		line-height: 18px;
		border-bottom: 1px solid #efefef;
	}
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