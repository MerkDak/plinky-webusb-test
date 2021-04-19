import { Port, Serial } from './webusb/WebUSB';
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

export class USBPlinky extends Port {

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
    const len = 16;
    const idx = index * len;
    const buf = patch.slice(idx, len*index+len);
    console.log(param, len, idx, "BUF", buf);
    JSONPatch.push({
      name: param,
      value: buf[0]+buf[1],
      mods: {
        env:      buf[2]+buf[3],
        pressure: buf[4]+buf[5],
        a:        buf[6]+buf[7],
        b:        buf[8]+buf[9],
        x:        buf[10]+buf[11],
        y:        buf[12]+buf[13],
        random:   buf[14]+buf[15],
      }
    });
  });
  return JSONPatch;
}

async function connect(ctx) {
  ctx.port = await Serial.requestPort(USBPlinky);
  await ctx.port.connect();
  return ctx;
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
        const patchJSON = parseJSONFromPatch(patch);
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