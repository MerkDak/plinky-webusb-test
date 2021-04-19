import { PatchLoadMachine, PatchSaveMachine } from './PatchMachines';
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

const patchLoadMachine = createMachine(PatchLoadMachine, (ctx) => ({ ...ctx }));
const patchSaveMachine = createMachine(PatchSaveMachine, (ctx) => ({ ...ctx }));

// ██████╗  ██████╗ ██████╗ ████████╗
// ██╔══██╗██╔═══██╗██╔══██╗╚══██╔══╝
// ██████╔╝██║   ██║██████╔╝   ██║   
// ██╔═══╝ ██║   ██║██╔══██╗   ██║   
// ██║     ╚██████╔╝██║  ██║   ██║   
// ╚═╝      ╚═════╝ ╚═╝  ╚═╝   ╚═╝   

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

// ██████╗  █████╗ ████████╗ ██████╗██╗  ██╗    ████████╗ ██████╗          ██╗███████╗ ██████╗ ███╗   ██╗
// ██╔══██╗██╔══██╗╚══██╔══╝██╔════╝██║  ██║    ╚══██╔══╝██╔═══██╗         ██║██╔════╝██╔═══██╗████╗  ██║
// ██████╔╝███████║   ██║   ██║     ███████║       ██║   ██║   ██║         ██║███████╗██║   ██║██╔██╗ ██║
// ██╔═══╝ ██╔══██║   ██║   ██║     ██╔══██║       ██║   ██║   ██║    ██   ██║╚════██║██║   ██║██║╚██╗██║
// ██║     ██║  ██║   ██║   ╚██████╗██║  ██║       ██║   ╚██████╔╝    ╚█████╔╝███████║╚██████╔╝██║ ╚████║
// ╚═╝     ╚═╝  ╚═╝   ╚═╝    ╚═════╝╚═╝  ╚═╝       ╚═╝    ╚═════╝      ╚════╝ ╚══════╝ ╚═════╝ ╚═╝  ╚═══╝

function parseJSONFromPatch(patch) {
  let patchJSON = {
    arp: false,
    latch: false,
    loopStart: 0,
    loopLength: 8,
    params: [],
  };
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
    //console.log(param, len, idx, "BUF", buf, arr);
    patchJSON.params.push({
      name: param,
      buffer:     buf,
      value:      arr[0],
      enum:       null,
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

  //
  // Go through the bitfield in the last 16 bytes to set flags
  //
  // u8 flags;
  // - if flags & 1 is true, then arp is on
  // - if flags & 2 is true, then latch is on
  // s8 loopstart_step_no_offset;
  // - 0-63 which step the pattern starts on in the current pattern (normally 0)
  // s8 looplen_step;
  // - how long the pattern is, (normally 8)
  // u8 paddy[16-3];
  // - reserved for future use
  //

  const field = patch.slice(patch.byteLength-16, patch.byteLength);
  patchJSON.arp        = (new Uint8Array(field)[0] & 1) > 0;
  patchJSON.latch      = (new Uint8Array(field)[0] & 2) > 0;
  patchJSON.loopStart  = new Int8Array(field)[1];
  patchJSON.loopLength = new Int8Array(field)[2];

  console.log('bitfield', field, patchJSON);

  return patchJSON;
}

async function connect(ctx) {
  ctx.port = await Serial.requestPort(WebUSBPlinky);
  await ctx.port.connect();
  return ctx;
}

// ███╗   ███╗ █████╗  ██████╗██╗  ██╗██╗███╗   ██╗███████╗
// ████╗ ████║██╔══██╗██╔════╝██║  ██║██║████╗  ██║██╔════╝
// ██╔████╔██║███████║██║     ███████║██║██╔██╗ ██║█████╗  
// ██║╚██╔╝██║██╔══██║██║     ██╔══██║██║██║╚██╗██║██╔══╝  
// ██║ ╚═╝ ██║██║  ██║╚██████╗██║  ██║██║██║ ╚████║███████╗
// ╚═╝     ╚═╝╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝╚═╝╚═╝  ╚═══╝╚══════╝

export function createPlinkyMachine(initialContext = {}) {

  const states = {
    disconnected: state(
      transition('connect', 'connecting'),
      transition('parsePatch', 'disconnected', reduce((ctx, ev) => {
        console.log('foo', ev, ctx);
        if(ev.patch) {
          const patch = ev.patch;
          const arrayBuffer = patch.buffer.slice(patch.byteOffset, patch.byteLength + patch.byteOffset);
          const patchJSON = parseJSONFromPatch(arrayBuffer);
          return { ...ctx, patchJSON, patch: arrayBuffer }
        }
        return { ...ctx };
      }))
    ),
    connecting: invoke(
      connect,
      transition('done', 'connected'),
      transition('error', 'error', reduce((ctx, ev) => {
        console.log(ev.error);
        return { ...ctx, error: ev.error };
      }))
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
        ctx.patchJSON = {};
        return { ...ctx }
      }))
    ),
    loadPatch: invoke(
      patchLoadMachine,
      transition('done', 'connected', reduce((ctx, ev) => {
        const patch = Uint8Array.from(Array.prototype.concat(...ev.data.result.map(a => Array.from(a))));
        const arrayBuffer = patch.buffer.slice(patch.byteOffset, patch.byteLength + patch.byteOffset);
        const patchJSON = parseJSONFromPatch(arrayBuffer);
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