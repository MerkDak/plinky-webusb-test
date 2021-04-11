# Plinky WebUSB playground

## How this works

We have abstractions of the `Port` and `Serial` classes.

### `Serial` class

The `Serial` class handles:

- Getting a list of available ports (WebUSB devices)
- Requesting access to one of those ports

Connecting to a WebUSB device means passing the `WebUSBPlinky` constructor that extends `Port` to `Serial.requestPort()`:

```js
let port;

try {
  port = await Serial.requestPort(WebUSBPlinky);
  await port.connect();
}
catch(err) {
  console.error(err);
}
```

### `Port` class

The `Port` superclass handles:

In the `connect()` function:
- Defining the read loop
- Opening the device
- Setting the [endpoint](https://wicg.github.io/webusb/#endpoints)
- Selecting the device configuration
- Getting the endpoint alternates so they can be accessed via shared pointers
- Claiming the device
- Starting the read loop

Whenever the read loop receives data, it calls the `onReceive` function, which is implemented in the `WebUSBPlinky.js` file. If there is an error, it calls the `onReceiveError` function.

### `WebUSBPlinky` class

The `WebUSBPlinky` class implements:

- `onReceive`
- `onReceiveError`

### `WebPlinky` class

This class handles the abstraction and finite state machine to interface with Plinky through `WebUSBPlinky`. It is used to wire up the UI to the machine.