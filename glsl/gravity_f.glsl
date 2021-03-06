
precision highp float;

uniform sampler2D gU_old;
uniform float u_t;

uniform sampler2D u_types;
uniform int u_texLength;
uniform ivec3 u_count;

varying vec2 f_uv;

@import ./utils/grid;

void main() {

    ivec3 idx = UVtoXYZ(f_uv, u_texLength, u_count);
    vec4 col = texture2D(gU_old, f_uv);

    for (int i = -1; i <= 1; ++i) {
        for (int j = -1; j <= 1; ++j) {
            for (int k = -1; k <= 1; ++k) {
                if (checkIdx(idx + ivec3(i,j,k), u_count - 1) && gridComponentAt(u_types, idx + ivec3(i,j,k), u_count, u_texLength, 0) == 1.0) {
                    col.g -= 9.81 * u_t;
                    gl_FragColor = vec4(col.rgb, 1.0);
                    return;
                }
            }
        }  
    }
    gl_FragColor = col;
}