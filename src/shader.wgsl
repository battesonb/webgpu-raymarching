struct VertexInput {
  @location(0) pos: vec2f,
};

struct VertexOutput {
  @builtin(position) clip_pos: vec4f,
};

struct Uniforms {
  dimensions: vec2f,
  time: f32,
};

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

@vertex
fn vertexMain(in: VertexInput) -> VertexOutput {
  var output: VertexOutput;
  output.clip_pos = vec4f(in.pos, 0, 1);
  return output;
}

@fragment
fn fragmentMain(in: VertexOutput) -> @location(0) vec4f {
  return vec4(1, 0, 0, 1);
}
