import {assertDefined} from "./assertions";
import shaderSource from "./shader.wgsl?raw";
import {Uniforms} from "./uniforms";

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
    }
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
    entryPoint: "vertexMain",
    buffers: [vertexBufferLayout],
  },
  fragment: {
    module: shaderModule,
    entryPoint: "fragmentMain",
    targets: [{format: canvasFormat}]
  },
  layout: pipelineLayout,
  primitive: {
    topology: "triangle-list",
    frontFace: "ccw",
    cullMode: "back",
  },
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
  uniforms.time = performance.now();
  const uniformsArray = uniforms.buffer();
  device.queue.writeBuffer(uniformsBuffer, 0, uniformsArray);

  const encoder = device.createCommandEncoder();
  {
    const pass = encoder.beginRenderPass({
      colorAttachments: [{
        view: context.getCurrentTexture().createView(),
        storeOp: "store",
        clearValue: [0.54, 0.7, 1.0, 1.0],
        loadOp: "clear",
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
