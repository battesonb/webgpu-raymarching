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

const AMBIENT_INTENSITY: f32 = 0.3;
const SKY_COLOR: vec3f = vec3f(0.54, 0.7, 1.0);
const NEAR_PLANE_DISTANCE: f32 = 1;
const MAX_STEPS: i32 = 100;
const EPSILON: f32 = 0.001;
const MIN_DIST: f32 = 0.1;
const MAX_DIST: f32 = 100;

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
  return sphere(p - vec3f(0, 0, 1.5), 0.5);
}

fn calc_normal(p: vec3f) -> vec3f {
  let k = vec2f(1, -1);
  return normalize(
    k.xyy * scene(p + k.xyy * EPSILON) +
    k.yyx * scene(p + k.yyx * EPSILON) +
    k.yxy * scene(p + k.yxy * EPSILON) +
    k.xxx * scene(p + k.xxx * EPSILON)
  );
}

fn shortest_dist_to_surface(p: vec3f, ray_dir: vec3f, start: f32, end: f32) -> f32 {
  var depth = start;

  for (var i = 0; i < MAX_STEPS; i++) {
    let dist = scene(p + ray_dir * depth);
    if (abs(dist) < EPSILON) {
      return depth;
    }
    depth += dist;
    if (depth >= end) {
      return end;
    }
  }

  return end;
}

fn raymarch(p: vec3f, ray_dir: vec3f) -> vec3f {
  let dist = shortest_dist_to_surface(p, ray_dir, MIN_DIST, MAX_DIST);

  if (dist > MAX_DIST - EPSILON) {
    return SKY_COLOR;
  }

  let pos = p + ray_dir * dist;

  let light_pos = vec3f(0, 10, 3);
  let light_dir = normalize(light_pos - pos);

  let normal = calc_normal(pos);
  let ratio = dot(normal, light_dir);
  let diffuse = ratio * vec3f(1.0, 0.25, 0.2);
  return diffuse + AMBIENT_INTENSITY * SKY_COLOR;
}

@fragment
fn fragmentMain(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let cam_dir = normalize(vec3f(0, -1, 1));
  let cam_pos = vec3f(0, 1.5, 0);

  let ray_dir = calc_ray_dir(cam_dir, pos.xy);
  let color = raymarch(cam_pos, ray_dir);

  return vec4(color, 1);
}
