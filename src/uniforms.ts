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
    return new Float32Array([
      this.width,
      this.height,
      this.time
    ]);
  }
}
