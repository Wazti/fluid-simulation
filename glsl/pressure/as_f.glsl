
precision highp float;

uniform sampler2D u_A;
uniform sampler2D u_types;
uniform sampler2D u_pcg;
uniform ivec3 u_count;
uniform int u_texLength;
uniform float u_scale;

varying vec2 f_uv;

@import ../utils/grid;
@import ../utils/precond_grad;

#define GET(grid, uv, c) (texture2D(grid, uv)[c])
#define Aplusi(uv) GET(u_A, uv, 0)
#define Aplusj(uv) GET(u_A, uv, 1)
#define Aplusk(uv) GET(u_A, uv, 2)
#define Adiag(uv) GET(u_A, uv, 3)

void main() {
  ivec3 idx = UVtoXYZ(f_uv, u_texLength, u_count);
  vec4 curr = texture2D(u_pcg, f_uv);
  if (!checkIdx(idx, u_count - 1)) {
    gl_FragColor = curr;
    return;
  }

  ivec3 mIi = idx - ivec3(1,0,0);
  ivec3 mJi = idx - ivec3(0,1,0);
  ivec3 mKi = idx - ivec3(0,0,1);
  ivec3 pIi = idx + ivec3(1,0,0);
  ivec3 pJi = idx + ivec3(0,1,0);
  ivec3 pKi = idx + ivec3(0,0,1);

  vec2 mI = XYZtoUV(mIi, u_texLength, u_count);
  vec2 mJ = XYZtoUV(mJi, u_texLength, u_count);
  vec2 mK = XYZtoUV(mKi, u_texLength, u_count);
  vec2 pI = XYZtoUV(pIi, u_texLength, u_count);
  vec2 pJ = XYZtoUV(pJi, u_texLength, u_count);
  vec2 pK = XYZtoUV(pKi, u_texLength, u_count);

  float val = 0.0;
  if (checkIdx(mIi, u_count - 1)) {
    val += Aplusi(mI) * GET(u_pcg, mI, 3);
  }
  if (checkIdx(mJi, u_count - 1)) {
    val += Aplusj(mJ) * GET(u_pcg, mJ, 3);
  }
  if (checkIdx(mKi, u_count - 1)) {
    val += Aplusk(mK) * GET(u_pcg, mK, 3);
  }

  val += Adiag(f_uv) * GET(u_pcg, f_uv, 3);
  
  if (checkIdx(pIi, u_count - 1)) {
    val += Aplusi(f_uv) * GET(u_pcg, pI, 3);
  }
  if (checkIdx(pJi, u_count - 1)) {
    val += Aplusj(f_uv) * GET(u_pcg, pJ, 3);
  }
  if (checkIdx(pKi, u_count - 1)) {
    val += Aplusk(f_uv) * GET(u_pcg, pK, 3);
  }

  curr[2] = u_scale * val;
  gl_FragColor = curr;
}