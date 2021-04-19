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
  let JSONPatch = {};
  EParams.forEach((param, index) => {
    //JSONPatch[param] = 
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
    ),
    loadPatch: invoke(
      patchLoadMachine,
      transition('done', 'connected', reduce((ctx, ev) => {
        const patch = Uint8Array.from(Array.prototype.concat(...ev.data.result.map(a => Array.from(a))));
        const patchJson = parseJSONFromPatch(patch);
        return { ...ctx, patch };
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