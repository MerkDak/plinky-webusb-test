import {
  action,
  createMachine,
  state as final,
  guard,
  immediate,
  interpret,
  invoke,
  reduce,
  state,
  transition,
} from 'robot3';

// ██╗      ██████╗  █████╗ ██████╗ 
// ██║     ██╔═══██╗██╔══██╗██╔══██╗
// ██║     ██║   ██║███████║██║  ██║
// ██║     ██║   ██║██╔══██║██║  ██║
// ███████╗╚██████╔╝██║  ██║██████╔╝
// ╚══════╝ ╚═════╝ ╚═╝  ╚═╝╚═════╝ 

function getHeader(ctx, ev) {
  const data = new Uint8Array(ev.data);
  // Keep all results in an array until the end, when we can concat them all into a single ArrayBuffer
  ctx.result = [];
  // Set the header
  ctx.header = data;
  // Slot to load from is in 5th index
  ctx.slot = data[5];
  // We're going to be counting how many bytes we have read to know when to stop
  ctx.processedBytes = 0;
  // Header contains how many bytes are going to be sent
  ctx.bytesToProcess = data[8]+data[9]*256;
  console.log(`Loading from slot: ${ctx.slot} - Expecting ${ctx.bytesToProcess} bytes (header: ${ctx.header})`);
  return ctx;
}

function hasHeader(ctx, ev) {
  console.log('hasHeader', ctx, ev);
  const data = new Uint8Array(ev.data);
  if(!data) return false;
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

function readBytes(ctx, ev) {
  const data = new Uint8Array(ev.data);
  ctx.result.push(data);
  ctx.processedBytes += data.byteLength;
  return ctx;
}

function hasMoreData(ctx) {
  return ctx.processedBytes >= ctx.bytesToProcess;
}

async function sendLoadRequest(ctx) {
  console.log('sendLoadRequest', ctx.port, 'patchNumber', ctx.patchNumber);
  // [0xf3,0x0f,0xab,0xca,  0,   32,             0,0,0,0 ]
  //  header                get  current preset  padding ]
  const buf = new Uint8Array([0xf3,0x0f,0xab,0xca,0,ctx.patchNumber,0,0,0,0]);
  ctx.port.send(buf);
  return true;
}

export const PatchLoadMachine = {
  idle: state(
    immediate('getHeader', action(sendLoadRequest)),
  ),
  getHeader: state(
    transition('data', 'header', guard(hasHeader)),
  ),
  header: state(
    immediate('read', reduce(getHeader))
  ),
  read: state(
    immediate('finished', guard(hasMoreData)),
    transition('data', 'read', reduce(readBytes)),
  ),
  finished: final()
};

// ███████╗ █████╗ ██╗   ██╗███████╗
// ██╔════╝██╔══██╗██║   ██║██╔════╝
// ███████╗███████║██║   ██║█████╗  
// ╚════██║██╔══██║╚██╗ ██╔╝██╔══╝  
// ███████║██║  ██║ ╚████╔╝ ███████╗
// ╚══════╝╚═╝  ╚═╝  ╚═══╝  ╚══════╝

async function sendWriteRequest(ctx) {
  console.log('sendWriteRequest', ctx.port, 'patchNumber', ctx.patchNumber);
  // [0xf3,0x0f,0xab,0xca,  1,   32,             0,0,0,0 ]
  //  header                set  current preset  padding ]
  //(header: 243,15,171,202,1,9,0,0,16,6)
  let arr = new ArrayBuffer(4); // an Int32 takes 4 bytes
  let view = new DataView(arr);
  view.setUint32(0, ctx.bytesToProcess, true);
  const len = new Uint8Array(arr);
  const buf = new Uint8Array([0xf3,0x0f,0xab,0xca,1,ctx.patchNumber,0,0,len[0],len[1]]);
  console.log('sending buf', buf, "ctx.bytesToProcess", ctx.bytesToProcess, "len.byteLength", len.byteLength, "len", len);
  //ctx.port.send(buf);
  return true;
}

async function sendBytes(ctx, ev) {
  const data = new Uint8Array(ctx.data.slice());
  ctx.port.send(data);
  //ctx.result.push(data);
  ctx.processedBytes += data.byteLength;
  return ctx;
}

export const PatchSaveMachine = {
  idle: state(
    immediate('setHeader', reduce(ctx => {
      const data = new Uint8Array(ctx.patch);
      console.log('ctx', ctx, data.byteLength);
      return { ...ctx, processedBytes: 0, bytesToProcess: data.byteLength, data } 
    })),
  ),
  setHeader: state(
    immediate('write', action(sendWriteRequest))
  ),
  getDataFromPatch: state(
    immediate('write', reduce((ctx) => {
      return { ...ctx };
    }))
  ),
  write: state(
    immediate('finished', guard(hasMoreData)),
    immediate('getDataFromPatch', action(sendBytes)),
  ),
  finished: final()
}
