import {Vec3} from "./vec3";

export enum ShapeType {
  Composite = 0,
  Box,
  Cylinder,
  Plane,
  Sphere
}

/**
 * All the shapes that are supported by the GPU stack machine. Composite is a
 * special intermediate value that should not be used from the CPU-side, but it
 * is modelled for the sake of having its own unique ID.
 */
export type Shape =
  | {type: ShapeType.Composite, color: Vec3, value: number}
  | {type: ShapeType.Box, color: Vec3, position: Vec3, dimensions: Vec3}
  | {type: ShapeType.Cylinder, color: Vec3, position: Vec3, height: number, radius: number}
  | {type: ShapeType.Plane, color: Vec3, normal: Vec3, offset: number}
  | {type: ShapeType.Sphere, color: Vec3, position: Vec3, radius: number};

export function shapeInBuffer(shape: Shape): number[] {
  const buffer = [shape.type.valueOf()];
  switch (shape.type) {
    case ShapeType.Composite:
      buffer.push(
        shape.value,
        0,
        0,
        0,
        0,
        0,
      );
      break;
    case ShapeType.Box:
      buffer.push(
        shape.position.x,
        shape.position.y,
        shape.position.z,
        shape.dimensions.x,
        shape.dimensions.y,
        shape.dimensions.z,
      );
      break;
    case ShapeType.Cylinder:
      buffer.push(
        shape.position.x,
        shape.position.y,
        shape.position.z,
        shape.height,
        shape.radius,
        0,
      );
      break;
    case ShapeType.Plane:
      buffer.push(
        shape.normal.x,
        shape.normal.y,
        shape.normal.z,
        shape.offset,
        0,
        0,
      );
      break;
    case ShapeType.Sphere:
      buffer.push(
        shape.position.x,
        shape.position.y,
        shape.position.z,
        shape.radius,
        0,
        0,
      );
      break;
  }
  buffer.push(0, shape.color.x, shape.color.y, shape.color.z, 0);
  return buffer;
}

const MAX_SHAPES = 100;
const FLOATS = 12;

export class Shapes {
  private shapes: Shape[];
  private _buffer: number[];

  constructor() {
    this.shapes = [];
    this._buffer = Array.from({length: MAX_SHAPES * FLOATS}).map(_ => 0);
  }

  push(shape: Shape) {
    this.shapes.push(shape);
  }

  clear() {
    this.shapes.length = 0;
  }

  length() {
    return Math.min(this.shapes.length, MAX_SHAPES);
  }

  buffer() {
    for (let i = 0; i < this.length(); i++) {
      const shape = shapeInBuffer(this.shapes[i]);
      for (let j = 0; j < shape.length; j++) {
        this._buffer[i * FLOATS + j] = shape[j];
      }
    }
    return new Float32Array(this._buffer);
  }
}

