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

const SKY_COLOR: vec3f = vec3f(0.54, 0.7, 1.0);
const NEAR_PLANE_DISTANCE: f32 = 1;
const MAX_STEPS: i32 = 25;

fn calc_ray_dir(cam_dir: vec3f, framebuffer_position: vec2f) -> vec3f {
  let cam_right = normalize(cross(cam_dir, vec3f(0, 1, 0)));
  let cam_up = normalize(cross(cam_right, cam_dir));
  var p = 2.0 * (framebuffer_position / uniforms.dimensions) - 1.0;
  p.y *= -1;
  p.x *= uniforms.dimensions.x / uniforms.dimensions.y;
  return normalize(vec3f(
    p.x * cam_right +
    p.y * cam_up +
    NEAR_PLANE_DISTANCE * cam_dir
  ));
}

fn sphere(p: vec3f, r: f32) -> f32 {
  return length(p) - r;
}

fn scene(p: vec3f) -> f32 {
  return sphere(p - vec3f(0, 0, 1), 0.5);
}

fn raymarch(p: vec3f, ray_dir: vec3f) -> vec3f {
  var step = 0;
  var pos = p;
  var dist = scene(pos);

  while (abs(dist) > 0.001 && step < MAX_STEPS) {
    pos = pos + ray_dir * dist;
    dist = scene(pos);
    step += 1;
  }

  if (step < MAX_STEPS) {
    return vec3f(1, 0, 0);
  } else {
    return SKY_COLOR;
  }
}

@fragment
fn fragmentMain(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let ray_dir = calc_ray_dir(vec3f(0, 0, 1), pos.xy);
  let color = raymarch(vec3f(0, 0, 0), ray_dir);

  return vec4(color, 1);
}
