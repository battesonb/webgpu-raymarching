import {assertDefined} from "./assertions";
import {CommandType, Commands} from "./command";
import shaderSource from "./shader.wgsl?raw";
import {ShapeType, Shapes} from "./shapes";
import {Uniforms} from "./uniforms";
import {Vec3} from "./vec3";

const SCREEN_WIDTH = 800;
const SCREEN_HEIGHT = 600;

const canvas = document.querySelector("canvas")!;
canvas.width = SCREEN_WIDTH;
canvas.height = SCREEN_HEIGHT;

assertDefined(navigator.gpu, "WebGPU is not supported on this browser");
const adapter = await navigator.gpu.requestAdapter();
assertDefined(adapter, "No appropriate GPUAdapter found");

const device = await adapter.requestDevice();

const context = canvas.getContext("webgpu")!;
const canvasFormat = navigator.gpu.getPreferredCanvasFormat();
context.configure({
  device,
  format: canvasFormat,
});

const vertexBufferLayout: GPUVertexBufferLayout = {
  stepMode: "vertex",
  arrayStride: 8,
  attributes: [
    { // pos
      format: "float32x2",
      offset: 0,
      shaderLocation: 0,
    },
  ],
};

const bindGroupLayout = device.createBindGroupLayout({
  label: "bind group layout",
  entries: [
    {
      binding: 0,
      visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
      buffer: {
        type: "uniform"
      },
    },
    {
      binding: 1,
      visibility: GPUShaderStage.FRAGMENT,
      buffer: {
        type: "read-only-storage",
      }
    },
    {
      binding: 2,
      visibility: GPUShaderStage.FRAGMENT,
      buffer: {
        type: "read-only-storage",
      }
    },
  ]
});

const pipelineLayout = device.createPipelineLayout({
  label: "pipeline layout",
  bindGroupLayouts: [bindGroupLayout],
});

const shaderModule = device.createShaderModule({
  label: "shader module",
  code: shaderSource,
});

const pipeline = device.createRenderPipeline({
  vertex: {
    module: shaderModule,
    entryPoint: "vertex_main",
    buffers: [vertexBufferLayout],
  },
  fragment: {
    module: shaderModule,
    entryPoint: "fragment_main",
    targets: [{format: canvasFormat}]
  },
  layout: pipelineLayout,
  primitive: {
    topology: "triangle-list",
    frontFace: "ccw",
    cullMode: "back",
  },
});

const shapes = new Shapes();
const shapesBuffer = device.createBuffer({
  label: "shapes buffer",
  size: shapes.buffer().byteLength,
  usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
});

const commands = new Commands();
const commandsBuffer = device.createBuffer({
  label: "commands buffer",
  size: commands.buffer().byteLength,
  usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
});

const uniforms = new Uniforms(SCREEN_WIDTH, SCREEN_HEIGHT, performance.now());
const uniformsArray = uniforms.buffer();
const uniformsBuffer = device.createBuffer({
  label: "uniforms buffer",
  size: uniformsArray.byteLength,
  usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
});
device.queue.writeBuffer(uniformsBuffer, 0, uniformsArray);

const bindGroup = device.createBindGroup({
  label: "bind group",
  layout: bindGroupLayout,
  entries: [
    {
      binding: 0,
      resource: {buffer: uniformsBuffer},
    },
    {
      binding: 1,
      resource: {buffer: shapesBuffer},
    },
    {
      binding: 2,
      resource: {buffer: commandsBuffer},
    }
  ],
});

const vertexArray = new Float32Array([
  // x, y
  -1, -1,
  1, 1,
  -1, 1,
  -1, -1,
  1, -1,
  1, 1
]);
const vertexBuffer = device.createBuffer({
  label: "vertex buffer",
  size: vertexArray.buffer.byteLength,
  usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
});
device.queue.writeBuffer(vertexBuffer, 0, vertexArray);

function render() {
  const now = performance.now() / 1000;
  uniforms.time = now;
  uniforms.camPos.y = 2 + Math.sin(now);
  uniforms.lightPos.x = 3 * Math.sin(now * 2);
  uniforms.lightPos.z = 3 * Math.sin(now * 2);

  commands.clear();
  shapes.clear();

  shapes.push({type: ShapeType.Plane, normal: new Vec3(0, 1, 0), offset: 0, color: new Vec3(0.35, 0.7, 0.4)});
  const radius = 0.05;
  const objects = 10;
  const delta = Math.PI * 2 / objects;
  for (let i = 0; i < objects; i++) {
      shapes.push({type: ShapeType.Sphere, position: new Vec3(Math.cos(now + i * delta), radius + 0.1 + (1 + Math.sin(now * 2)) * 0.1, 1.25 + Math.sin(now + i * delta)), radius: radius + i * 0.02, color: new Vec3(Math.abs(Math.cos(now + i)) * 0.8, 0.5, Math.abs(Math.sin(now + i)) * 0.8)});
  }

  let smoothMinValue = (1 + Math.sin(now)) * 0.5;
  for (let i = 0; i < objects - 1; i++) {
    commands.push({type: CommandType.SmoothMin, value: smoothMinValue});
  }
  commands.push({type: CommandType.Union});
  commands.push({type: CommandType.Accumulate});

  uniforms.commandCount = commands.length();
  uniforms.shapeCount = shapes.length();
  const uniformsArray = uniforms.buffer();
  device.queue.writeBuffer(uniformsBuffer, 0, uniformsArray);

  device.queue.writeBuffer(commandsBuffer, 0, commands.buffer());
  device.queue.writeBuffer(shapesBuffer, 0, shapes.buffer());

  const encoder = device.createCommandEncoder();
  {
    const pass = encoder.beginRenderPass({
      colorAttachments: [{
        view: context.getCurrentTexture().createView(),
        storeOp: "store",
        loadOp: "load",
      }],
    });

    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bindGroup);
    pass.setVertexBuffer(0, vertexBuffer);
    pass.draw(6, 1);

    pass.end();
  }

  {
    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);
  }

  requestAnimationFrame(render);
}

requestAnimationFrame(render);
