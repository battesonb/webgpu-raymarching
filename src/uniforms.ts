import {Vec3} from "./vec3";

export class Uniforms {
  public width: number;
  public height: number;
  public time: number;
  public shapeCount: number;
  public commandCount: number;
  public camDir: Vec3;
  public camPos: Vec3;
  public lightPos: Vec3;

  constructor(width: number, height: number, time: number) {
    this.width = width;
    this.height = height;
    this.time = time;
    this.shapeCount = 0;
    this.commandCount = 0;
    this.camDir = new Vec3(0, -1.4, 1);
    this.camPos = new Vec3(0, 1.5, -0.25);
    this.lightPos = new Vec3(0, 3, 0);
  }

  buffer(): Float32Array {
    // must be multiple of 16 bytes
    return new Float32Array([
      this.width,
      this.height,
      this.time,
      this.shapeCount,
      this.commandCount,
      0,
      0,
      0,
      this.camDir.x,
      this.camDir.y,
      this.camDir.z,
      0,
      this.camPos.x,
      this.camPos.y,
      this.camPos.z,
      0,
      this.lightPos.x,
      this.lightPos.y,
      this.lightPos.z,
      0,
    ]);
  }
}
