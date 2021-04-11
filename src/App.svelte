<script>

	import { onMount } from "svelte";
	import { Serial, Port } from './WebUSB';
	import { WebUSBPlinky } from './WebUSBPlinky';
	export let name;

	let port;
	let inref;
	let inarrbufref;
	let outref;

	var _appendBuffer = function(buffer1, buffer2) {
		var tmp = new Uint8Array(buffer1.byteLength + buffer2.byteLength);
		tmp.set(new Uint8Array(buffer1), 0);
		tmp.set(new Uint8Array(buffer2), buffer1.byteLength);
		return tmp.buffer;
	};

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

	function sendArrayBuffer() {
		const cmd = new Uint8Array(inarrbufref.value.split(',').map(v=>eval(v)));
		port.send(cmd);
	}

	function sendBuf() {
		port.send(new Uint8Array([0xf3,0x0f,0xab,0xca,0,32,0,0,0,0]));
	}

	let sliderValue;

	function sliderChange() {
		console.log(sliderValue);
	}

	$: connected = port && port.send ? true : false;

</script>

<main>
	<h1>Plinky WebUSB playground</h1>

	<button on:click={connect}>Connect</button>

	<div style="display: {connected ? 'block' : 'none'}">
		<form on:submit|preventDefault={send}>
			<textarea bind:this={inref}></textarea>
			<button type="submit">Send plaintext</button>
		</form>

		<form on:submit|preventDefault={sendArrayBuffer}>
			<textarea bind:this={inarrbufref}>0xf3,0x0f,0xab,0xca,0,3,0,0,0,0</textarea>
			<button type="submit">Send Uint8Array</button>
		</form>

		<button on:click={sendBuf}>Send 0xf3,0x0f,0xab,0xca,0,3,0,0,0,0</button>

		<h3>OUTPUT:</h3>
		<textarea bind:this={outref}></textarea>

		<input type="range" bind:value={sliderValue} on:change={sliderChange} />
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
	form {
		margin: 16px 0;
		display: flex;
		flex-direction: row;
	}
	button {
		margin: 0;
		height: 50px;
		display: inline-block;
	}
</style>