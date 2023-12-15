struct VertexInput {
  @location(0) pos: vec2f,
};

struct Uniforms {
  dimensions: vec2f,
  time: f32,
};

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

@vertex
fn vertexMain(in: VertexInput) -> @builtin(position) vec4f {
  return vec4f(in.pos, 0, 1);
}

@fragment
fn fragmentMain(@builtin(position) framebuffer_position: vec4f) -> @location(0) vec4f {
  let p = framebuffer_position.xy / uniforms.dimensions;
  let q = p - vec2(0.5, 0.5);
  let d = length(q);
  let r = 0.5;
  let color = step(r * r, d);

  return vec4(color, 0, 0, 1);
}
