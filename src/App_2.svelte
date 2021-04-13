<script>

	import { onMount } from "svelte";
	import { PlinkyManager } from "./lib/PlinkyManager";
	export let name;

	let port;
	let inref;
	let inarrbufref;
	let outref;

	const plinky = new PlinkyManager();
	const { store, send } = plinky.service;

	async function connect() {
		await plinky.connect();
	}

	function sendArrayBuffer() {
		const cmd = new Uint8Array(inarrbufref.value.split(',').map(v=>eval(v)));
		port.send(cmd);
	}

	function sendBuf() {
		port.send(new Uint8Array([0xf3,0x0f,0xab,0xca,0,32,0,0,0,0]));
	}

	function getPatch() {
		plinky.loadPatch();
	}

	$: connected = ['connected', 'loadPatch', 'loadingPatch', 'savePatch'].indexOf($store.state) > -1;

</script>

<main>
	<h1>Current state: {$store.state}</h1>

	<button style="display: {!connected ? 'block' : 'none'}" on:click={connect}>Connect</button>
	<div style="display: {connected ? 'block' : 'none'}">

		<h2>Get patch</h2>
		<form on:submit|preventDefault={getPatch}>
			<input type="number" bind:value={$store.context.patchNumber} />
			<button type="submit">Get</button>
		</form>
		
		<hr />

		<h2>Send Uint8Array</h2>

		<form on:submit|preventDefault={sendArrayBuffer}>
			<textarea bind:this={inarrbufref}>0xf3,0x0f,0xab,0xca,0,3,0,0,0,0</textarea>
			<button type="submit">Send Uint8Array</button>
		</form>

		<hr />

		<h2>Send predefined</h2>

		<button on:click={sendBuf}>Send 0xf3,0x0f,0xab,0xca,0,3,0,0,0,0</button>

		<hr />

		<h3>OUTPUT:</h3>
		<textarea bind:this={outref}></textarea>

	</div>


</main>

<style>
	main {
		padding: 1em;
		margin: 0 auto;
	}
	textarea {
		width: 320px;
		height: 50px;
		display: inline-block;
		margin: 0;
	}
	hr {
		margin: 36px 0;
		border-color: #ccc;
	}
	form {
		margin: 16px 0;
		display: flex;
		flex-direction: row;
	}
	button {
		padding: 12px;
		margin: 0;
		display: inline-block;
	}
</style>