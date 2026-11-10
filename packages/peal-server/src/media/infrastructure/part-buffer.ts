/**
 * Bytes on their way to the store, cut into parts of one size as they
 * arrive: chunks are kept as they came and copied once, into the part they
 * end up in, so a file of any size holds one part in memory at most.
 */
export class PartBuffer {
  readonly #partSize: number;

  #chunks: Uint8Array[] = [];

  #size = 0;

  constructor(partSize: number) {
    this.#partSize = partSize;
  }

  /** How many bytes wait for a part. */
  get size(): number {
    return this.#size;
  }

  push(chunk: Uint8Array): void {
    if (chunk.byteLength > 0) {
      this.#chunks.push(chunk);
      this.#size += chunk.byteLength;
    }
  }

  /** Whether a whole part waits. */
  get hasPart(): boolean {
    return this.#size >= this.#partSize;
  }

  /** The next whole part, when one waits. */
  takePart(): Uint8Array<ArrayBuffer> {
    return this.#take(Math.min(this.#partSize, this.#size));
  }

  /** Everything that waits: the last part, shorter than the others. */
  takeRest(): Uint8Array<ArrayBuffer> {
    return this.#take(this.#size);
  }

  #take(length: number): Uint8Array<ArrayBuffer> {
    const part = new Uint8Array(length);
    const kept: Uint8Array[] = [];
    let filled = 0;

    for (const chunk of this.#chunks) {
      const room = length - filled;

      if (room === 0) {
        kept.push(chunk);
      } else if (chunk.byteLength <= room) {
        part.set(chunk, filled);
        filled += chunk.byteLength;
      } else {
        part.set(chunk.subarray(0, room), filled);
        filled += room;
        kept.push(chunk.subarray(room));
      }
    }

    this.#chunks = kept;
    this.#size -= length;

    return part;
  }
}
