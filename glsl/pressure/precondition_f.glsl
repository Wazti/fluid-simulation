
precision highp float;

uniform sampler2D u_A;
uniform sampler2D u_Pre;
uniform sampler2D u_types;
uniform int u_texLength;
uniform int u_iter;
uniform ivec3 u_count;

varying vec2 f_uv;

@import ../utils/grid;
@import ../utils/precond_grad;

#define GET(grid, uv, c) (uv.x < 0.0 ? 0.0 : texture2D(grid, uv)[c])
#define Aplusi(uv) GET(u_A, uv, 0)
#define Aplusj(uv) GET(u_A, uv, 1)
#define Aplusk(uv) GET(u_A, uv, 2)
#define Adiag(uv) GET(u_A, uv, 3)
#define precon(uv) GET(u_Pre, uv, 0)

void main() {
    if (texture2D(u_types, f_uv)[0] != 1.0) discard;
    ivec3 idx = UVtoXYZ(f_uv, u_texLength, u_count);
    if (idx.x > u_iter || idx.y > u_iter || idx.z > u_iter) discard;
    if (!checkIdx(idx, u_count - 1)) discard;

    vec2 mI = XYZtoUV(idx - ivec3(1,0,0), u_texLength, u_count);
    vec2 mJ = XYZtoUV(idx - ivec3(0,1,0), u_texLength, u_count);
    vec2 mK = XYZtoUV(idx - ivec3(0,0,1), u_texLength, u_count);
    if (!checkIdx(idx - ivec3(1,0,0), u_count-1)) mI[0] = -1.0;
    if (!checkIdx(idx - ivec3(0,1,0), u_count-1)) mJ[0] = -1.0;
    if (!checkIdx(idx - ivec3(0,0,1), u_count-1)) mK[0] = -1.0; 

    float diag = Adiag(f_uv);
    float e = diag - pow(Aplusi(mI) * precon(mI), 2.0) - pow(Aplusj(mJ) * precon(mJ), 2.0) - pow(Aplusk(mK) * precon(mK), 2.0);
  if (e < 0.25 * diag) {
    e = diag;
  }
  e = 1.0 / sqrt(e);
  gl_FragColor = vec4(e, e, e, 1.0);
}