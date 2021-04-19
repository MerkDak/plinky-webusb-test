import { PlinkyMachine } from '../PlinkyMachine';
import { Port } from './WebUSB';

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
