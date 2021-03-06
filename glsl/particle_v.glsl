
uniform mat4 u_viewProj;

attribute float v_id;
uniform sampler2D u_particles;
uniform int u_texLength;
uniform vec3 part_color;
varying vec3 f_col;
varying float size;
void main() {
    int pIdx = int(v_id) * 2;
    int vIdx = int(v_id) * 2 + 1;

    int pV = pIdx / u_texLength;
    int pU = pIdx - pV * u_texLength;

    int vV = vIdx / u_texLength;
    int vU = vIdx - vV * u_texLength;

    vec2 pUV = (vec2(pU, pV) + 0.01) / float(u_texLength);
    vec2 vUV = (vec2(vU, vV) + 0.01) / float(u_texLength);

    vec3 v_pos = texture2D(u_particles, pUV).rgb;
    vec3 v_vel = texture2D(u_particles, vUV).rgb;

    f_col = clamp(mix(part_color,part_color + 0.2, texture2D(u_particles, pUV).a) + vec3(length(v_vel) / 4.0), vec3(0,0,0), vec3(1,1,1));
    gl_Position = u_viewProj * vec4(v_pos, 1.0);
    gl_PointSize = 5.0;
}