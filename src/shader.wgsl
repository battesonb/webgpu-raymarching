struct VertexInput {
  @location(0) pos: vec2f,
};

struct Uniforms {
  dimensions: vec2f,
  time: f32,
  shape_count: f32,
  command_count: f32,
  cam_dir: vec3f,
  cam_pos: vec3f,
  light_pos: vec3f,
};

struct Shape {
  id: f32,
  a: f32,
  b: f32,
  c: f32,
  d: f32,
  e: f32,
  f: f32,
  color: vec3f,
}

struct Command {
  id: f32,
  a: f32,
}

struct Sdf {
  dist: f32,
  color: vec3f,
}

@group(0) @binding(0) var<uniform>       uniforms: Uniforms;
@group(0) @binding(1) var<storage, read> shapes:   array<Shape>;
@group(0) @binding(2) var<storage, read> commands: array<Command>;

@vertex
fn vertex_main(in: VertexInput) -> @builtin(position) vec4f {
  return vec4f(in.pos, 0, 1);
}

const AMBIENT_INTENSITY: f32 = 0.5;
const SKY_BOTTOM_COLOR: vec3f = vec3f(0.92, 0.95, 1);
const SKY_TOP_COLOR: vec3f = vec3f(0.54, 0.7, 1.0);
const NEAR_PLANE_DISTANCE: f32 = 1;
const MAX_STEPS: i32 = 50;
const MAX_SHADOW_STEPS: i32 = 16;
const EPSILON: f32 = 0.01;
const MIN_DIST: f32 = 0.1;
const MAX_DIST: f32 = 10;
const MIN_DIST_SHADOW: f32 = 0.1;
const MAX_DIST_SHADOW: f32 = 8.0;

fn sky_color(ray_dir: vec3f) -> vec3f {
  let t = 0.5 * (ray_dir.y + 1.0);
  return (1.0 - t) * SKY_BOTTOM_COLOR + t * SKY_TOP_COLOR;
}

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

fn box(p: vec3f, b: vec3f) -> f32 {
  let q = abs(p) - b;
  return length(max(q, vec3f(0))) + min(max(q.x, max(q.y, q.z)), 0.0);
}

fn plane(p: vec3f, normal: vec3f, offset: f32) -> f32 {
  return dot(p, normal) + offset;
}

fn cylinder(p: vec3f, h: f32, r: f32) -> f32
{
  let d = abs(vec2(length(p.xz),p.y)) - vec2(r,h);
  return min(max(d.x,d.y),0.0) + length(max(d,vec2f(0, 0)));
}

fn sdf_min(a: Sdf, b: Sdf) -> Sdf {
  if a.dist < b.dist {
    return a;
  }
  return b;
}

fn sdf_max(a: Sdf, b: Sdf) -> Sdf {
  if a.dist > b.dist {
    return a;
  }
  return b;
}

fn sdf_smooth_min(a: Sdf, b: Sdf, k: f32) -> Sdf {
  let total_dist = abs(a.dist - b.dist);
  let h = max(k - total_dist, 0.0) / k;
  let dist = min(a.dist, b.dist) - h * h * k * (1.0 / 4.0);
  let a_dist = abs(a.dist - dist);
  let ratio = saturate(a_dist / total_dist);
  return Sdf(dist, a.color * (1 - ratio) + b.color * ratio);
}

fn shape_sdf(p: vec3f, shape: Shape) -> Sdf {
  let color = shape.color;
  switch u32(shape.id) {
    case 0: { // composite
      return Sdf(shape.a, color);
    }
    case 1: { // box
      return Sdf(box(p - vec3f(shape.a, shape.b, shape.c), vec3f(shape.d, shape.e, shape.f)), color);
    }
    case 2: {
      return Sdf(cylinder(p - vec3f(shape.a, shape.b, shape.c), shape.d, shape.e), color);
    }
    case 3: { // plane
      return Sdf(plane(p, vec3f(shape.a, shape.b, shape.c), shape.d), color);
    }
    case 4: { // sphere
      return Sdf(sphere(p - vec3f(shape.a, shape.b, shape.c), shape.d), color);
    }
    default: {
      return Sdf(MAX_DIST + EPSILON, color);
    }
  }
}

fn composite_shape(sdf: Sdf) -> Shape {
  return Shape(0, sdf.dist, 0, 0, 0, 0, 0, sdf.color);
}

fn default_sdf() -> Sdf {
  return Sdf(MAX_DIST + EPSILON, vec3f(1, 1, 1));
}

fn scene(p: vec3f) -> Sdf {
  let shape_count = i32(uniforms.shape_count);
  if (shape_count == 0) {
    default_sdf();
  }

  var acc = default_sdf();
  var stack_pointer: i32 = shape_count - 1;
  var top_of_stack: Shape = shapes[stack_pointer];
  stack_pointer -= 1; // point to the second item on the stack.
  let command_count = i32(uniforms.command_count);
  for (var i = 0; i < command_count; i++) {
    let command = commands[i];
    switch u32(command.id) {
      case 0: { // accumulate
        acc = sdf_min(acc, shape_sdf(p, top_of_stack));
        if (stack_pointer > 0) {
          top_of_stack = shapes[stack_pointer];
          stack_pointer -= 1;
        }
      }
      case 1: { // union
        top_of_stack = composite_shape(sdf_min(shape_sdf(p, top_of_stack), shape_sdf(p, shapes[stack_pointer])));
        stack_pointer -= 1;
      }
      case 2: { // intersection
        top_of_stack = composite_shape(sdf_max(shape_sdf(p, top_of_stack), shape_sdf(p, shapes[stack_pointer])));
        stack_pointer -= 1;
      }
      case 3: { // subtraction
        var a = shape_sdf(p, top_of_stack);
        a.dist = -a.dist;
        top_of_stack = composite_shape(sdf_max(a, shape_sdf(p, shapes[stack_pointer])));
        stack_pointer -= 1;
      }
      case 4: { // smooth_min
        top_of_stack = composite_shape(sdf_smooth_min(shape_sdf(p, top_of_stack), shape_sdf(p, shapes[stack_pointer]), command.a));
        stack_pointer -= 1;
      }
      default: { // unknown
        return Sdf(0, vec3f(1, 1, 1));
      }
    }
  }
  return acc;
}

fn calc_normal(p: vec3f) -> vec3f {
  let h = 0.001;
  let k = vec2f(1,-1);
  return normalize(k.xyy * scene(p + k.xyy * h).dist + 
                   k.yyx * scene(p + k.yyx * h).dist + 
                   k.yxy * scene(p + k.yxy * h).dist + 
                   k.xxx * scene(p + k.xxx * h).dist);
}

fn closest_sdf(p: vec3f, ray_dir: vec3f, start: f32, end: f32) -> Sdf {
  var depth = start;

  for (var i = 0; i < MAX_STEPS; i++) {
    let sdf = scene(p + ray_dir * depth);
    if (abs(sdf.dist) < EPSILON) {
      return Sdf(depth, sdf.color);
    }
    depth += sdf.dist;
    if (depth >= end) {
      return Sdf(end, sdf.color);
    }
  }

  return Sdf(end, vec3f(1, 1, 1));
}

fn shadow(p: vec3f, light_dir: vec3f, start: f32, end: f32) -> f32 {
  var t = start;
  var res = 1.0;
  let k = 32.0;
  for (var i = 0; i < MAX_SHADOW_STEPS; i++) {
    let sdf = scene(p + light_dir * t);
    if (sdf.dist < EPSILON) {
      return 0.0;
    }
    res = min(res, k * sdf.dist / t);
    t += sdf.dist;
  }
  return res;
}

fn occlusion(p: vec3f, normal: vec3f) -> f32 {
    var occ = 0.0;
    var sca = 1.0;
    for(var i = 0; i < 5; i++)
    {
        let depth = 0.01 + 0.1 * f32(i * i);
        let ao_pos = p + normal * depth;
        let dist = scene(ao_pos).dist;
        occ += clamp(-(dist - depth), 0, 1) * sca;
        sca *= 0.65;
    }
    return clamp(1.5 - 1.5 * occ, 0.0, 1.0);
}

fn raymarch(p: vec3f, ray_dir: vec3f) -> vec3f {
  let sdf = closest_sdf(p, ray_dir, MIN_DIST, MAX_DIST);

  if (sdf.dist > MAX_DIST - EPSILON) {
    return sky_color(ray_dir);
  }

  let fog_ratio = sdf.dist / MAX_DIST;

  let pos = p + ray_dir * sdf.dist;

  let light_dir = normalize(uniforms.light_pos - pos);

  let normal = calc_normal(pos);
  let reflected = reflect(ray_dir, normal);
  var self_shadow = max(0, dot(normal, light_dir));
  let cast_shadow = shadow(pos, light_dir, MIN_DIST_SHADOW, MAX_DIST_SHADOW);
  let diffuse = self_shadow * cast_shadow;
  let specular = pow(clamp(dot(reflected, light_dir), 0.0, 1.0 ), 16.0);
  let fresnel = pow(clamp(1.0 + dot(normal, ray_dir), 0.0, 1.0), 2.0);
  let sky_box = smoothstep(-0.1, 0.1, reflected.y);
  let occlusion = occlusion(pos, normal);

  var acc = vec3f(0, 0, 0);
  acc += diffuse;
  acc += specular * diffuse * occlusion;
  acc += fresnel * occlusion;
  acc += AMBIENT_INTENSITY * occlusion;
  acc += sky_box * diffuse * 0.2 * occlusion;

  return (1 - fog_ratio) * sdf.color * acc + sky_color(ray_dir) * fog_ratio;
}

@fragment
fn fragment_main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let cam_dir = normalize(uniforms.cam_dir);
  let cam_pos = uniforms.cam_pos;

  let ray_dir = calc_ray_dir(cam_dir, pos.xy);
  let color = raymarch(cam_pos, ray_dir);

  return vec4(color, 1);
}
