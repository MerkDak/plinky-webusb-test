import {
  Machine,
  SendFunction,
  action,
  createMachine,
  guard,
  immediate,
  interpret,
  reduce,
  state,
  transition,
} from 'robot3';

import { MachineStore } from './MachineStore';

export function createPatchReceivingMachine(data) {

  function hasHeader(ctx) {
    let data = ctx.data;
    if(!ctx.data) return false;
    if(data.byteLength !== 10) return false;
    if (data[0]!==0xf3) return false;
    if (data[1]!==0x0f) return false;
    if (data[2]!==0xab) return false;
    if (data[3]!==0xca) return false;
    if (data[4]!==1) return false;
    if (data[6]!==0) return false;
    if (data[7]!==0) return false;
    return true;
  }

  function getSlotAndBytesToRead(ctx) {
    let data = ctx.data;
    ctx.slot = data[5];
    ctx.readBytes = 0;
    ctx.bytesToRead = data[8]+data[9]*256;
    ctx.bytesLeft = data[8]+data[9]*256;
    return ctx;
  }

  function readAllBytes(ctx) {
    return ctx.bytesToRead === ctx.readBytes;
  }

  function readData(ctx) {
  }

  function sendPatchLoadingRequest(ctx) {
    // [0xf3,0x0f,0xab,0xca,  0,   32,             0,0,0,0 ]
    //  header                get  current preset  padding ]
    ctx.port.send(new Uint8Array[0xf3,0x0f,0xab,0xca,0,ctx.patchNumber,0,0,0,0]);
    return ctx;
  }

  const states = {
    idle: state(transition('load', 'header')),
    header: state(
      immediate('error', guard(hasHeader)),
      immediate('read', action(getSlotAndBytesToRead))
    ),
    read: state(
      transition('done', guard(readAllBytes)),
    ),
    error: state(
      transition('load', 'header'),
    ),
    done: state()
  };

  const context = (ctx) => {
    return { ...ctx };
  };

  const initialContext = Object.assign(data, {
    readBytes: 0,
    bytesToRead: 0,
    bytesLeft: 0,
  });

  const machine = createMachine(states, context);

  return MachineStore(machine, initialContext);
}
