
uniform sampler2D u_grid;
uniform vec3 u_direction;
uniform vec3 u_min;
uniform ivec3 u_count;
uniform float u_cellSize;
uniform mat4 u_viewProj;
uniform int u_texLength;
uniform int u_g;

attribute float v_id;

varying vec3 f_col;

@import ./utils/grid;

void main() {

  int idx = int(v_id / 2.0);

  vec3 pos;

  float scale = 0.05;
  ivec3 xyz = toXYZ(idx, u_count);

  f_col = u_direction;

  vec4 p = u_viewProj * vec4(pos, 1.0);
  p /= p[3];
  gl_Position = p;

  gl_PointSize = 1.0;
}