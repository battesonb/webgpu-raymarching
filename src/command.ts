/**
 * Commands execute on top of the shape array as if it where a stack.
 *
 * Let's say we have a shape array [A, B, C] with commands [UNION,
 * INTERSECTION]. We would go through the steps:
 *
 * 1. [A, B, C]
 * 2. [A, UNION(C, B)]
 * 3. [INTERSECTION(UNION(C, B), A)]
 */
export enum CommandType {
  /**
   * Takes the value on top of the stack and unions it with the value in the
   * virtual register. If the register has not been initialized, the value is
   * simply set.
   */
  Accumulate = 0,
  /**
   * The union of two SDFs.
   */
  Union,
  /**
   * The intersection of two SDFs.
   */
  Intersection,
  /**
   * Subtract the second SDF from the first SDF.
   */
  Subtraction,
  /**
   * A union operation which smooths between two SDFs.
   */
  SmoothMin,
}

export type Command =
  | {type: CommandType.Accumulate}
  | {type: CommandType.Union}
  | {type: CommandType.Intersection}
  | {type: CommandType.Subtraction}
  | {type: CommandType.SmoothMin, value: number};

export function commandInBuffer(command: Command): number[] {
  const buffer = [command.type.valueOf()];
  switch (command.type) {
    case CommandType.SmoothMin:
      buffer.push(command.value);
      break;
    default:
      buffer.push(0);
      break;
  }
  return buffer;
}


const MAX_COMMANDS = 100;
const FLOATS = 2;

export class Commands {
  private commands: Command[];
  private _buffer: number[];

  constructor() {
    this.commands = [];
    this._buffer = Array.from({length: MAX_COMMANDS * FLOATS}).map(_ => 0);
  }

  push(command: Command) {
    this.commands.push(command);
  }

  clear() {
    this.commands.length = 0;
  }

  length() {
    return Math.min(this.commands.length, MAX_COMMANDS);
  }

  buffer() {
    for (let i = 0; i < this.length(); i++) {
      const command = commandInBuffer(this.commands[i]);
      for (let j = 0; j < command.length; j++) {
        this._buffer[i * FLOATS + j] = command[j];
      }
    }
    return new Float32Array(this._buffer);
  }
}

