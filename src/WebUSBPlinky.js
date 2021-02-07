import { Port } from './WebUSB';

export class WebUSBPlinky extends Port {

  onReceive(data) {

    let textDecoder = new TextDecoder();
    console.log(textDecoder.decode(data));
    if(this.outref) this.outref.value = textDecoder.decode(data)
    if (data.getInt8() === 13) {
      //currentReceiverLine = null;
    } else {
      //appendLine('receiver_lines', textDecoder.decode(data));
    }

  }

  onReceiveError(error) {
    console.error(error);
  }

}
