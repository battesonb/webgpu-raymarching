export class Uniforms {
  public width: number;
  public height: number;
  public time: number;

  constructor(width: number, height: number, time: number) {
    this.width = width;
    this.height = height;
    this.time = time;
  }

  buffer(): Float32Array {
    // must be multiple of 16 bytes
    return new Float32Array([
      this.width,
      this.height,
      this.time,
      0
    ]);
  }
}
