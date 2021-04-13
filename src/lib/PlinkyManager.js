import { IRLPlinky } from './webusb/IRLPlinky';
import { Serial } from './webusb/WebUSB';
import { createPatchReceivingMachine } from './PatchMachine';
import { createPlinkyMachine } from './PlinkyMachine';

export class PlinkyManager {
  
  constructor() {
    this.machine = createPlinkyMachine();
    const [store, send] = this.machine;
    this.service = {
      store,
      send
    }
    this.port = null;
    this.queue = [];
  }

  async loadPatch(patchNumber) {
    
  }
  
  /**
   * Connect to the IRL Plinky device.
   */
  async connect() {
    try {
      this.port = await Serial.requestPort(IRLPlinky);
      this.port.connect();
      //this.port.addEventListener('data', this.onData);
      // Advance the state machine
      this.service.send('connect');
      console.log(this.port);
    }
    catch(err) {
      console.error(err);
    }
  }

  onData(data) {
    console.log('onData', data);
    this.queue.push(data);
  }

  loadPatch(patchNumber) {
    // [0xf3,0x0f,0xab,0xca,  0,   32,             0,0,0,0 ]
    //  header                get  current preset  padding ]
    console.log(this.port);
    const buf = new Uint8Array([0xf3,0x0f,0xab,0xca,0,patchNumber,0,0,0,0]);
    this.port.send(buf);
  }

  savePatchToDevice(patchNumber) {
    //
  }

}