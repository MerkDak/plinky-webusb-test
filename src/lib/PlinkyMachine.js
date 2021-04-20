import { PatchLoadMachine, PatchSaveMachine } from './PatchMachines';
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

import { MachineStore } from './MachineStore';
import { Port } from './webusb/WebUSBPort';
import { Serial } from './webusb/WebUSBSerial';
import { patch2JSON } from './patch2JSON';

const patchLoadMachine = createMachine(PatchLoadMachine, (ctx) => ({ ...ctx }));
const patchSaveMachine = createMachine(PatchSaveMachine, (ctx) => ({ ...ctx }));

class WebUSBPlinky extends Port {

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

// ███╗   ███╗ █████╗  ██████╗██╗  ██╗██╗███╗   ██╗███████╗
// ████╗ ████║██╔══██╗██╔════╝██║  ██║██║████╗  ██║██╔════╝
// ██╔████╔██║███████║██║     ███████║██║██╔██╗ ██║█████╗  
// ██║╚██╔╝██║██╔══██║██║     ██╔══██║██║██║╚██╗██║██╔══╝  
// ██║ ╚═╝ ██║██║  ██║╚██████╗██║  ██║██║██║ ╚████║███████╗
// ╚═╝     ╚═╝╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝╚═╝╚═╝  ╚═══╝╚══════╝

export async function connect(ctx) {
  ctx.port = await Serial.requestPort(WebUSBPlinky);
  await ctx.port.connect();
  return ctx;
}

export function createPlinkyMachine(initialContext = {}) {

  const states = {
    disconnected: state(
      transition('connect', 'connecting'),
      transition('parsePatch', 'disconnected', reduce((ctx, ev) => {
        if(ev.patch) {
          const patch = ev.patch;
          const arrayBuffer = patch.buffer.slice(patch.byteOffset, patch.byteLength + patch.byteOffset);
          const patchJSON = patch2JSON(arrayBuffer);
          return { ...ctx, patchJSON, patch: arrayBuffer }
        }
        return { ...ctx };
      }))
    ),
    connecting: invoke(
      connect,
      transition('done', 'connected'),
      transition('error', 'error', reduce((ctx, ev) =>
        ({ ...ctx, error: ev.error })
      ))
    ),
    connected: state(
      transition('loadPatch', 'loadPatch', reduce((ctx, ev) =>
        ({ ...ctx, patchNumber: ev.patchNumber })
      )),
      transition('savePatch', 'savePatch'),
      transition('clearPatch', 'clearPatch'),
      transition('error', 'error', reduce((ctx, ev) => {
        return { ...ctx, error: ev.error };
      }))
    ),
    clearPatch: state(
      immediate('connected', reduce((ctx) => {
        ctx.patch = null;
        ctx.patchJSON = {};
        return { ...ctx }
      }))
    ),
    loadPatch: invoke(
      patchLoadMachine,
      transition('done', 'connected', reduce((ctx, ev) => {
        const patch = Uint8Array.from(Array.prototype.concat(...ev.data.result.map(a => Array.from(a))));
        const arrayBuffer = patch.buffer.slice(patch.byteOffset, patch.byteLength + patch.byteOffset);
        const patchJSON = patch2JSON(arrayBuffer);
        return { ...ctx, patch: arrayBuffer, patchJSON };
      })),
      transition('error', 'error', reduce((ctx, ev) => {
        return { ...ctx, error: ev.error };
      }))
    ),
    savePatch: invoke(
      patchSaveMachine,
      transition('done', 'connected'),
      transition('error', 'error', reduce((ctx, ev) => {
        return { ...ctx, error: ev.error };
      }))
    ),
    error: state(
      transition('connect', 'connecting', reduce(ctx => {
        ctx.error = null;
        return { ...ctx };
      })),
    )
  };

  const context = (ctx) => {
    return { ...ctx };
  };

  const machine = createMachine(states, context);

  return MachineStore(machine, Object.assign(initialContext, {
    port: null,
    patch: null,
    patchJSON: {}
  }));
}

// ███████╗██╗███╗   ██╗ ██████╗ ██╗     ███████╗████████╗ ██████╗ ███╗   ██╗
// ██╔════╝██║████╗  ██║██╔════╝ ██║     ██╔════╝╚══██╔══╝██╔═══██╗████╗  ██║
// ███████╗██║██╔██╗ ██║██║  ███╗██║     █████╗     ██║   ██║   ██║██╔██╗ ██║
// ╚════██║██║██║╚██╗██║██║   ██║██║     ██╔══╝     ██║   ██║   ██║██║╚██╗██║
// ███████║██║██║ ╚████║╚██████╔╝███████╗███████╗   ██║   ╚██████╔╝██║ ╚████║
// ╚══════╝╚═╝╚═╝  ╚═══╝ ╚═════╝ ╚══════╝╚══════╝   ╚═╝    ╚═════╝ ╚═╝  ╚═══╝

export const PlinkyMachine = createPlinkyMachine({
  patchNumber: 0,
});