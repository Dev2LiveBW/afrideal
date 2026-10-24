/**
 * The pixel size of a JPEG, PNG or WebP, read from its header.
 *
 * Shared by `npm run images` (to refuse a download that is too small or not
 * square) and `npm run catalogue:audit` (to measure the photos on disk). Reading
 * the header keeps both scripts free of an image library: they only ever need
 * the dimensions, never the pixels.
 *
 * Returns null for anything it does not recognise, so a caller can report
 * "unreadable" rather than crash on one odd file.
 */
export function imageSize(buffer) {
  if (!buffer || buffer.length < 24) return null;

  // PNG: the IHDR chunk always comes first, width and height big-endian.
  if (buffer.readUInt32BE(0) === 0x89504e47) {
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  }

  // JPEG: walk the markers to the first start-of-frame (SOF0 to SOF15, except
  // the DHT, JPG and DAC markers that share the range).
  if (buffer[0] === 0xff && buffer[1] === 0xd8) {
    let offset = 2;
    while (offset + 9 < buffer.length) {
      if (buffer[offset] !== 0xff) {
        offset += 1;
        continue;
      }
      const marker = buffer[offset + 1];
      if (marker === 0xff) {
        offset += 1;
        continue;
      }
      const length = buffer.readUInt16BE(offset + 2);
      const isFrame = marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker);
      if (isFrame) {
        return { width: buffer.readUInt16BE(offset + 7), height: buffer.readUInt16BE(offset + 5) };
      }
      offset += 2 + length;
    }
    return null;
  }

  // WebP: lossy (VP8), lossless (VP8L) and extended (VP8X) headers.
  if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
    const chunk = buffer.toString('ascii', 12, 16);
    if (chunk === 'VP8 ') {
      return { width: buffer.readUInt16LE(26) & 0x3fff, height: buffer.readUInt16LE(28) & 0x3fff };
    }
    if (chunk === 'VP8L') {
      const bits = buffer.readUInt32LE(21);
      return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
    }
    if (chunk === 'VP8X') {
      return { width: buffer.readUIntLE(24, 3) + 1, height: buffer.readUIntLE(27, 3) + 1 };
    }
  }

  return null;
}
