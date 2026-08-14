import { useEffect, useRef } from 'react';
import { useStore } from '../../store';

interface ShaderBackgroundProps {
  className?: string;
  forceDark?: boolean;
}

const vsSource = `
  attribute vec4 aVertexPosition;
  void main() {
    gl_Position = aVertexPosition;
  }
`;

const fsSource = `
  precision highp float;
  uniform vec2 iResolution;
  uniform float iTime;
  uniform float uDark; /* 1 = dark theme, 0 = light theme */

  const float overallSpeed = 0.2;
  const float gridSmoothWidth = 0.015;
  const float axisWidth = 0.05;
  const float majorLineWidth = 0.025;
  const float minorLineWidth = 0.0125;
  const float majorLineFrequency = 5.0;
  const float minorLineFrequency = 1.0;
  const float scale = 5.0;
  const float minLineWidth = 0.01;
  const float maxLineWidth = 0.2;
  const float lineSpeed = 1.0 * overallSpeed;
  const float lineAmplitude = 1.0;
  const float lineFrequency = 0.2;
  const float warpSpeed = 0.2 * overallSpeed;
  const float warpFrequency = 0.5;
  const float warpAmplitude = 1.0;
  const float offsetFrequency = 0.5;
  const float offsetSpeed = 1.33 * overallSpeed;
  const float minOffsetSpread = 0.6;
  const float maxOffsetSpread = 2.0;
  const int linesPerGroup = 16;

  /* Light palette — matches the app's clean white/slate-50 surface (slate-50 #f8fafc,
     whisper of emerald-50 on the right), with soft muted emerald-teal lines */
  const vec3 bgColor1Light = vec3(0.980, 0.984, 0.988);
  const vec3 bgColor2Light = vec3(0.965, 0.985, 0.978);
  const vec3 lineColorLight = vec3(0.32, 0.64, 0.56);

  /* Dark palette — matches the app's slate-900 hero surface (#0f172a), easing to a
     deep teal-navy on the right, with subdued emerald lines (TICKSERA brand) */
  const vec3 bgColor1Dark = vec3(0.059, 0.090, 0.165);
  const vec3 bgColor2Dark = vec3(0.043, 0.115, 0.118);
  const vec3 lineColorDark = vec3(0.15, 0.55, 0.47);

  #define drawCircle(pos, radius, coord) smoothstep(radius + gridSmoothWidth, radius, length(coord - (pos)))
  #define drawSmoothLine(pos, halfWidth, t) smoothstep(halfWidth, 0.0, abs(pos - (t)))
  #define drawCrispLine(pos, halfWidth, t) smoothstep(halfWidth + gridSmoothWidth, halfWidth, abs(pos - (t)))
  #define drawPeriodicLine(freq, width, t) drawCrispLine(freq / 2.0, width, abs(mod(t, freq) - (freq) / 2.0))

  float drawCrispLineF(float pos, float halfWidth, float t) {
    return smoothstep(halfWidth + gridSmoothWidth, halfWidth, abs(pos - t));
  }
  float drawPeriodicLineF(float freq, float width, float t) {
    return drawCrispLineF(freq / 2.0, width, abs(mod(t, freq) - freq / 2.0));
  }
  float drawGridLines(float axis) {
    return drawCrispLineF(0.0, axisWidth, axis)
          + drawPeriodicLineF(majorLineFrequency, majorLineWidth, axis)
          + drawPeriodicLineF(minorLineFrequency, minorLineWidth, axis);
  }
  float drawGrid(vec2 space) {
    return min(1.0, drawGridLines(space.x) + drawGridLines(space.y));
  }
  float random(float t) {
    return (cos(t) + cos(t * 1.3 + 1.3) + cos(t * 1.4 + 1.4)) / 3.0;
  }
  float getPlasmaY(float x, float horizontalFade, float offset) {
    return random(x * lineFrequency + iTime * lineSpeed) * horizontalFade * lineAmplitude + offset;
  }

  void main() {
    vec2 fragCoord = gl_FragCoord.xy;
    vec4 fragColor;
    vec2 uv = fragCoord.xy / iResolution.xy;
    vec2 space = (fragCoord - iResolution.xy / 2.0) / iResolution.x * 2.0 * scale;

    float horizontalFade = 1.0 - (cos(uv.x * 6.28) * 0.5 + 0.5);
    float verticalFade   = 1.0 - (cos(uv.y * 6.28) * 0.5 + 0.5);

    space.y += random(space.x * warpFrequency + iTime * warpSpeed) * warpAmplitude * (0.5 + horizontalFade);
    space.x += random(space.y * warpFrequency + iTime * warpSpeed + 2.0) * warpAmplitude * horizontalFade;

    vec3 bgColor1 = mix(bgColor1Light, bgColor1Dark, uDark);
    vec3 bgColor2 = mix(bgColor2Light, bgColor2Dark, uDark);
    vec3 lineColor = mix(lineColorLight, lineColorDark, uDark);

    vec4 lines = vec4(0.0);

    for (int l = 0; l < linesPerGroup; l++) {
      float normalizedLineIndex = float(l) / float(linesPerGroup);
      float offsetTime     = iTime * offsetSpeed;
      float offsetPosition = float(l) + space.x * offsetFrequency;
      float rand           = random(offsetPosition + offsetTime) * 0.5 + 0.5;
      float halfWidth      = mix(minLineWidth, maxLineWidth, rand * horizontalFade) / 2.0;
      float offset         = random(offsetPosition + offsetTime * (1.0 + normalizedLineIndex)) * mix(minOffsetSpread, maxOffsetSpread, horizontalFade);
      float linePosition   = getPlasmaY(space.x, horizontalFade, offset);
      float line = drawSmoothLine(linePosition, halfWidth, space.y) / 2.0
                 + drawCrispLine(linePosition, halfWidth * 0.15, space.y);

      float circleX = mod(float(l) + iTime * lineSpeed, 25.0) - 12.0;
      vec2  circlePosition = vec2(circleX, getPlasmaY(circleX, horizontalFade, offset));
      float circle = drawCircle(circlePosition, 0.01, space) * 4.0;

      line = line + circle;
      lines += line * vec4(lineColor, 1.0) * rand;
    }

    fragColor  = vec4(mix(bgColor1, bgColor2, uv.x), 1.0);
    /* Soft vignette only in dark mode (edges melt into the navy); light mode stays
       clean and even so the hero reads as a crisp light surface */
    fragColor.rgb *= 1.0 - uDark * (1.0 - verticalFade);
    fragColor.a = 1.0;
    fragColor  += lines;

    gl_FragColor = fragColor;
  }
`;

function loadShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function initShaderProgram(gl: WebGLRenderingContext): WebGLProgram | null {
  const vs = loadShader(gl, gl.VERTEX_SHADER, vsSource);
  const fs = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);
  if (!vs || !fs) return null;
  const prog = gl.createProgram();
  if (!prog) return null;
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
  return prog;
}

export default function ShaderBackground({ className = 'absolute inset-0 w-full h-full', forceDark = false }: ShaderBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const storeDark = useStore(s => s.darkMode);
  const dark = forceDark || storeDark;
  const darkRef = useRef(dark);

  useEffect(() => {
    darkRef.current = dark;
  }, [dark]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl');
    if (!gl) return;

    const program = initShaderProgram(gl);
    if (!program) return;

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW
    );

    const vertexLoc   = gl.getAttribLocation(program, 'aVertexPosition');
    const resolutionLoc = gl.getUniformLocation(program, 'iResolution');
    const timeLoc       = gl.getUniformLocation(program, 'iTime');
    const darkLoc       = gl.getUniformLocation(program, 'uDark');

    const resizeCanvas = () => {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };

    const ro = new ResizeObserver(resizeCanvas);
    ro.observe(canvas);
    resizeCanvas();

    const startTime = Date.now();
    let animId: number;

    const render = () => {
      const t = (Date.now() - startTime) / 1000;
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(program);
      gl.uniform2f(resolutionLoc, canvas.width, canvas.height);
      gl.uniform1f(timeLoc, t);
      gl.uniform1f(darkLoc, darkRef.current ? 1.0 : 0.0);
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.vertexAttribPointer(vertexLoc, 2, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(vertexLoc);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
    };
  }, []);

  return <canvas ref={canvasRef} className={className} />;
}
