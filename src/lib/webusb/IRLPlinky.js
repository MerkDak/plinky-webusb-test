import { Port } from './WebUSB';

export class IRLPlinky extends Port {

  onReceive(data) {
    console.log('Port data:', data);
    this.dispatchEvent(new CustomEvent('data', data.buffer));
  }

  onReceiveError(error) {
    console.error('Port error:', error);
    this.dispatchEvent(new CustomEvent('error', error));
  }

}
