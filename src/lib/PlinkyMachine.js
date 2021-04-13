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
import { Port, Serial } from './webusb/WebUSB';

import { IRLPlinky } from './webusb/IRLPlinky';
import { MachineStore } from './MachineStore';
import { createPatchReceivingMachine } from './PatchMachine';

export function createPlinkyMachine(data = {}) {

  async function connect(ctx) {
  
    try {
      ctx.port = await Serial.requestPort(IRLPlinky);
      ctx.port.connect();
      //ctx.listener = ctx.port.addEventListener('data', dataListener);
      return ctx;
    }
    catch(err) {
      console.error(err);
      throw err;
    }
  }

  function isConnected(ctx) {
    return ctx && !!ctx.port;
  }

  async function loadPatch(ctx) {

    let waiting = true;

    function machineIsFinished() {
      waiting = false;
    }

    const patchMachine = createPatchReceivingMachine({
      patchNumber: ctx.patchNumber,
      port: ctx.port
    });

    console.log('loadPatch created patchMachine', patchMachine);

    const listener = ctx.port.addEventListener('data', (data) => {
      console.log('loadPatch data event', data);
      //patchMachine.context();
      patchMachine.send('data');
    });

    console.log('created listener', listener, ctx.port, ctx.port.addEventListener);

    console.log("loadPatch", patchMachine);

    // [0xf3,0x0f,0xab,0xca,  0,   32,             0,0,0,0 ]
    //  header                get  current preset  padding 
    ctx.port.send(new Uint8Array([0xf3,0x0f,0xab,0xca,0,ctx.patchNumber,0,0,0,0]));
    return patchMachine;

  }

  const states = {
    disconnected: state(transition('connect', 'connecting')),
    connecting: invoke(
      connect, 
      transition('done', 'connected', guard(isConnected)),
      transition('error', 'error'),
    ),
    connected: state(
      transition('load', 'loadPatch'),
      transition('save', 'savePatch'),
    ),
    loadPatch: invoke(
      loadPatch,
      transition('done', 'connected', guard(isConnected)),
      transition('error', 'error')
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

  const initialContext = Object.assign(data, {
    patchNumber: 0,
    patch: null,
    queue: []
  });

  const machine = createMachine(states, context);

  return MachineStore(machine, initialContext);
}
