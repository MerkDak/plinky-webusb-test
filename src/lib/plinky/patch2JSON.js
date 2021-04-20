import { EParams, PlinkyParams } from './params';

function getParam(id) {
  console.log(PlinkyParams);
  return PlinkyParams.find(param => {
    return param.id === id;
  });
}

export function patch2JSON(patch) {
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
    const plinkyParam = getParam(param) || { name: param };
    patchJSON.params.push({
      id:           param,
      name:         plinkyParam.name,
      description:  plinkyParam.description,
      buffer:       buf,
      value:        arr[0],
      enum:         null,
      mods: {
        env:        arr[1],
        pressure:   arr[2],
        a:          arr[3],
        b:          arr[4],
        x:          arr[5],
        y:          arr[6],
        random:     arr[7],
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