
precision highp float;

uniform ivec3 u_count;
uniform sampler2D u_types;
uniform int u_texLength;

varying vec2 f_uv;

@import ../utils/grid;
@import ../utils/precond_grad;

void main() {
  ivec3 idx = UVtoXYZ(f_uv, u_texLength, u_count);
  gl_FragColor = vec4(
    AMAT(idx, idx + ivec3(1,0,0), u_count, u_texLength, u_types),
    AMAT(idx, idx + ivec3(0,1,0), u_count, u_texLength, u_types),
    AMAT(idx, idx + ivec3(0,0,1), u_count, u_texLength, u_types),
    ADIAG(idx, u_count, u_texLength, u_types)
  );

  

}