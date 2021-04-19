import { Port, Serial } from './WebUSB';
import {
  action,
  createMachine,
  guard,
  immediate,
  interpret,
  invoke,
  reduce,
  state,
  transition,
} from 'robot3';

import { EParams } from './params';
import { MachineStore } from './MachineStore';
import { PatchLoadMachine } from './PatchMachines';

const patchLoadMachine = createMachine(PatchLoadMachine, (ctx) => ({ ...ctx }));

export class WebUSBPlinky extends Port {

  onReceive(data) {
    console.log('Port data:', data.buffer);
    const { service } = PlinkyMachine;
    if(service.child) {
      service.child.send({
        type: 'data',
        data: data.buffer
      });
    }
    else {
      service.send({
        type: 'data',
        data: data.buffer
      });
    }
  }

  onReceiveError(error) {
    console.error('Port error:', error);
    const { send } = PlinkyMachine;
    send({
      type: 'error',
      data: error
    });
  }

}

function parseJSONFromPatch(patch) {
  let JSONPatch = [];
  // each parameter has 16 bytes;
  // first 2 bytes are the value, then the 7 mod matrix amounts
  EParams.forEach((param, index) => {
    // We have 16 bytes that we're looking at
    const len = 16;
    // Index to start slicing at
    const idx = index * len;
    // We have 16 bytes in the ArrayBuffer that we want
    const buf = patch.slice(idx, len*index+len);
    // Then convert it to an Int16Array to get range of -1024 to 1024
    // without having to do messy bit operations by hand! woot!
    const arr = new Int16Array(buf);
    console.log(param, len, idx, "BUF", buf, arr);
    JSONPatch.push({
      name: param,
      value:      arr[0],
      mods: {
        env:      arr[1],
        pressure: arr[2],
        a:        arr[3],
        b:        arr[4],
        x:        arr[5],
        y:        arr[6],
        random:   arr[7],
      }
    });
  });
  return JSONPatch;
}

async function connect(ctx) {
  ctx.port = await Serial.requestPort(WebUSBPlinky);
  await ctx.port.connect();
  return ctx;
}

function typedArrayToBuffer(array) {
  return array.buffer.slice(array.byteOffset, array.byteLength + array.byteOffset)
}

export function createPlinkyMachine(initialContext = {}) {

  const states = {
    disconnected: state(
      transition('connect', 'connecting')
    ),
    connecting: invoke(
      connect,
      transition('done', 'connected'),
      transition('error', 'disconnected')
    ),
    connected: state(
      transition('loadPatch', 'loadPatch', reduce((ctx, ev) => {
        console.log('ctx', ctx, ev);
        return { ...ctx, patchNumber: ev.patchNumber };
      })),
      transition('savePatch', 'savePatch'),
      transition('clearPatch', 'clearPatch'),
    ),
    clearPatch: state(
      immediate('connected', reduce((ctx) => {
        ctx.patch = null;
        ctx.patchJSON = null;
        return { ...ctx }
      }))
    ),
    loadPatch: invoke(
      patchLoadMachine,
      transition('done', 'connected', reduce((ctx, ev) => {
        const patch = Uint8Array.from(Array.prototype.concat(...ev.data.result.map(a => Array.from(a))));
        const arrayBuffer = patch.buffer.slice(patch.byteOffset, patch.byteLength + patch.byteOffset);
        const patchJSON = parseJSONFromPatch(arrayBuffer);
        return { ...ctx, patch, patchJSON };
      })),
      transition('error', 'error', reduce((ctx, ev) => {
        console.error(ctx, ev);
        return ctx;
      }))
    ),
    savePatch: state(
    ),
    error: state(
      transition('disconnect', 'disconnected'),
    )
  };

  const context = (ctx) => {
    return { ...ctx };
  };

  const machine = createMachine(states, context);

  return MachineStore(machine, Object.assign(initialContext, {
    port: null,
    patch: null,
  }));
}

export const PlinkyMachine = createPlinkyMachine({
  patchNumber: 0,
});