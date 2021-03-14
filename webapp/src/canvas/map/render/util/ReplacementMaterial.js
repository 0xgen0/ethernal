import { MeshMaterial, Program, utils } from 'pixi.js';

const vert = `
attribute vec2 aVertexPosition;
attribute vec2 aTextureCoord;

uniform mat3 projectionMatrix;
uniform mat3 translationMatrix;
uniform mat3 uTextureMatrix;

varying vec2 vTextureCoord;

void main(void)
{
    gl_Position = vec4((projectionMatrix * translationMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);

    vTextureCoord = (uTextureMatrix * vec3(aTextureCoord, 1.0)).xy;
}
`;

const frag_template = `
#define count __COLORS__
varying vec2 vTextureCoord;

uniform sampler2D uSampler;
uniform vec3 originalColor[count];
uniform vec3 newColor[count];
uniform float epsilon;

void main(void)
{
    vec4 currentColor = texture2D(uSampler, vTextureCoord);

    float doReplace = 0.0;
    float colorDistance;
    vec3 colorDiff;
    vec4 result = currentColor;

    for(int i = 0; i < count; i ++) {
      colorDiff = originalColor[i] - (currentColor.rgb / max(currentColor.a, 0.0000000001));
      colorDistance = length(colorDiff);
      doReplace = step(colorDistance, epsilon);

      if(doReplace > 0.5) {
          result = vec4(mix(currentColor.rgb, (newColor[i] + colorDiff) * currentColor.a, doReplace), currentColor.a);
          break;
      }
    }

    gl_FragColor = result;

}
`;

export default class ReplacementMaterial extends PIXI.MeshMaterial {
  /**
   *
   * @param {PIXI.Texture} texture
   * @param {[{original: number, target: number}]} colors
   */
  constructor(texture, colors) {
    colors = Array.isArray(colors) ? colors : [colors];
    const count = colors.length;
    const frag = frag_template.replace('__COLORS__', count);
    const orig = [];
    const target = [];

    for (let def of colors) {
      orig.push(...utils.hex2rgb(def.original));
      target.push(...utils.hex2rgb(def.target));
    }

    super(texture, {
      program: Program.from(vert, frag),
      uniforms: {
        originalColor: orig,
        newColor: target,
        epsilon: 0.1,
      },
    });
  }
}
