import {
  Machine,
  SendFunction,
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

export function createPatchReceivingMachine(contextData) {

  function getHeader(ctx) {
    console.log('getHeader', ctx);
    // Keep chopping at the data coming in until we see a header
    if(ctx.queue.length === 0) return false;
    const data = ctx.queue.shift();
    if(!data) return false;
    if(data.byteLength !== 10) return false;
    if (data[0]!==0xf3) return false;
    if (data[1]!==0x0f) return false;
    if (data[2]!==0xab) return false;
    if (data[3]!==0xca) return false;
    if (data[4]!==1) return false;
    if (data[6]!==0) return false;
    if (data[7]!==0) return false;
    // Set the header
    ctx.header = header;
    ctx.slot = data[5];
    ctx.readBytes = 0;
    ctx.bytesToRead = data[8]+data[9]*256;
    return true;
  }

  function readBytes(ctx) {
    const data = ctx.queue.shift();
    ctx.result.push(data);
    ctx.readBytes += data.byteLength;
    console.log("readBytes", data, ctx);
    return ctx;
  }

  function hasMoreData(ctx) {
    console.log("hasMoreData", ctx.readBytes < ctx.bytesToRead);
    return ctx.readBytes < ctx.bytesToRead;
  }

  function finished(ctx) {
    console.log('finished', ctx);
    return ctx;
  }

  function hasHeader(ctx) {
    return !!ctx.header;
  }

  const states = {
    idle: state(
      transition('data', 'header')
    ),
    header: invoke(
      getHeader,
      transition('data', 'setBytes', guard(hasHeader)),
    ),
    read: invoke(
      readBytes,
      transition('read', 'read', guard(hasMoreData)),
      immediate('finished', action(finished)),
    ),
    finished: state()
  };
  
  console.log('states', states);

  const context = (ctx) => {
    return { ...ctx };
  };

  const initialContext = Object.assign(contextData, {
    readBytes: 0,
    bytesToRead: 0,
    bytesLeft: 0,
    header: null,
    queue: [],
    result: [],
  });

  const machine = createMachine(states, context);

  console.log('created patchmachine', context, initialContext);

  return machine;
}
