import { Port } from './WebUSB';

function toHex(str,hex){
  try{
    hex = unescape(encodeURIComponent(str))
    .split('').map(function(v){
      return v.charCodeAt(0).toString(16)
    }).join('')
  }
  catch(e){
    hex = str
    console.log('invalid text input: ' + str)
  }
  return hex
}

export class WebUSBPlinky extends Port {

  onReceive(data) {

    let textDecoder = new TextDecoder();
    console.log("RESPONSE:", textDecoder.decode(data), toHex(textDecoder.decode(data)));

    if(this.outref) this.outref.value = toHex(textDecoder.decode(data));
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

/*
export class WebPlinky {

  constructor({
    PlinkyDevice
  }) {

    this.PlinkyDevice = PlinkyDevice;

  }

  

}
*/