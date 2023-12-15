export class Vec3 {
  public x: number;
  public y: number;
  public z: number;

  constructor(x: number, y: number, z: number) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  static zero() {
    return Vec3.fill(0);
  }

  static fill(value: number) {
    return new Vec3(value, value, value);
  }
}

