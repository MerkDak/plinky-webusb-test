<script>

	import { onMount } from "svelte";
	import { Serial, Port } from './WebUSB';
	import { WebUSBPlinky } from './WebUSBPlinky';
	export let name;

	let port;
	let inref;
	let outref;
	
	async function connect() {

		if (port) {
			//await port.disconnect();
		}

		try {
			port = await Serial.requestPort(WebUSBPlinky);
			port.outref = outref;
			window.port = port;
			console.log(port);
			await port.connect();
		}
		catch(err) {
			console.error(err);
		}

	}

	function send() {
		console.log(inref.value);
		port.send(new TextEncoder('utf-8').encode(inref.value));
	}

</script>

<main>
	<h1>Hello {name}!</h1>

	<button on:click={connect}>Connect</button>

	<form on:submit|preventDefault={send}>
		<textarea bind:this={inref}></textarea>
		<button type="submit">Send</button>
	</form>

	<textarea bind:this={outref}></textarea>

</main>

<style>
	main {
		text-align: center;
		padding: 1em;
		margin: 0 auto;
	}
</style>