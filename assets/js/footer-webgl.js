(function () {
  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function hexToRgb(hex) {
    const cleaned = hex.replace("#", "").trim();
    if (cleaned.length === 3) {
      const r = parseInt(cleaned[0] + cleaned[0], 16);
      const g = parseInt(cleaned[1] + cleaned[1], 16);
      const b = parseInt(cleaned[2] + cleaned[2], 16);
      return [r, g, b];
    }
    if (cleaned.length !== 6) return [255, 255, 255];
    return [
      parseInt(cleaned.slice(0, 2), 16),
      parseInt(cleaned.slice(2, 4), 16),
      parseInt(cleaned.slice(4, 6), 16),
    ];
  }

  function readCssColor(rootStyle, name, fallback) {
    const value = rootStyle.getPropertyValue(name).trim();
    if (!value) return fallback;
    if (value.startsWith("#")) return value;
    return fallback;
  }

  function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(info || "Shader compile failed");
    }
    return shader;
  }

  function createProgram(gl, vertexSource, fragmentSource) {
    const program = gl.createProgram();
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const info = gl.getProgramInfoLog(program);
      gl.deleteProgram(program);
      throw new Error(info || "Program link failed");
    }
    return program;
  }

  function initFooterWebGL(footerLayer) {
    const canvas = footerLayer.querySelector(".footer-webgl");
    const textCanvas = footerLayer.querySelector(".footer-webgl-text");
    if (!canvas) return;

    const gl = canvas.getContext("webgl", {
      alpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      preserveDrawingBuffer: false,
    });
    if (!gl) return;
    const textGl = textCanvas
      ? textCanvas.getContext("webgl", { alpha: true, antialias: false, depth: false, stencil: false })
      : null;

    const rootStyle = getComputedStyle(document.documentElement);
    const bg = readCssColor(rootStyle, "--bg", "#f4f3f1");
    const ink = readCssColor(rootStyle, "--ink", "#222a41");
    const inkDeep = readCssColor(rootStyle, "--ink-deep", "#171d30");
    const blue = readCssColor(rootStyle, "--blue", "#b7d3fa");
    const white = readCssColor(rootStyle, "--white", "#ffffff");

    const colors = {
      bg: hexToRgb(bg).map((v) => v / 255),
      ink: hexToRgb(ink).map((v) => v / 255),
      inkDeep: hexToRgb(inkDeep).map((v) => v / 255),
      blue: hexToRgb(blue).map((v) => v / 255),
      white: hexToRgb(white).map((v) => v / 255),
    };

    const vertexSource = "\n" +
      "attribute vec2 a_position;\n" +
      "void main() {\n" +
      "  gl_Position = vec4(a_position, 0.0, 1.0);\n" +
      "}\n";

    const fragmentSource = "\n" +
      "precision highp float;\n" +
      "uniform vec2 u_resolution;\n" +
      "uniform float u_time;\n" +
      "uniform vec3 u_ink;\n" +
      "uniform vec3 u_inkDeep;\n" +
      "uniform vec3 u_blue;\n" +
      "uniform vec3 u_white;\n" +
      "\n" +
      "float hash(vec2 p) {\n" +
      "  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);\n" +
      "}\n" +
      "\n" +
      "float noise(vec2 p) {\n" +
      "  vec2 i = floor(p);\n" +
      "  vec2 f = fract(p);\n" +
      "  float a = hash(i);\n" +
      "  float b = hash(i + vec2(1.0, 0.0));\n" +
      "  float c = hash(i + vec2(0.0, 1.0));\n" +
      "  float d = hash(i + vec2(1.0, 1.0));\n" +
      "  vec2 u = f * f * (3.0 - 2.0 * f);\n" +
      "  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;\n" +
      "}\n" +
      "\n" +
      "void main() {\n" +
      "  vec2 uv = gl_FragCoord.xy / u_resolution;\n" +
      "  vec2 p = uv * 2.0 - 1.0;\n" +
      "  float t = u_time * 0.45;\n" +
      "  float colIndex = floor(uv.x * 12.0);\n" +
      "  float colCenter = (colIndex + 0.5) / 12.0;\n" +
      "  float colPos = fract(uv.x * 12.0);\n" +
      "  float edgeDist = min(colPos, 1.0 - colPos);\n" +
      "  float edgeMask = 1.0 - smoothstep(0.0, 0.35, edgeDist);\n" +
      "  float colShift = -(colIndex * 20.0) / u_resolution.y;\n" +
      "  float refract = 0.0;\n" +
      "  float micro = 0.0;\n" +
      "  p.y += colShift;\n" +
      "  float flow = sin(p.x * 2.2 + t) * 0.34;\n" +
      "  float surface = p.y + flow;\n" +
      "  float band = smoothstep(0.18, -0.38, surface);\n" +
      "  float contrastBand = pow(band, 2.2);\n" +
      "  vec3 base = mix(u_inkDeep, u_ink, uv.y * 0.55);\n" +
      "  vec3 wave = mix(base, u_blue, contrastBand * 0.75);\n" +
      "  float highlight = smoothstep(0.55, 0.95, band) * 0.55;\n" +
      "  float glow = smoothstep(0.2, 0.85, band) * (1.0 - smoothstep(0.6, 1.0, band));\n" +
      "  vec3 color = mix(wave, u_white, highlight) + u_blue * glow * 0.35 + u_white * glow * 0.18;\n" +
      "  gl_FragColor = vec4(color, 1.0);\n" +
      "}\n";

    const textFragmentSource = "\n" +
      "precision highp float;\n" +
      "uniform vec2 u_resolution;\n" +
      "uniform float u_time;\n" +
      "uniform vec3 u_ink;\n" +
      "uniform vec3 u_inkDeep;\n" +
      "uniform vec3 u_blue;\n" +
      "uniform vec3 u_white;\n" +
      "uniform sampler2D u_text;\n" +
      "uniform vec2 u_texel;\n" +
      "\n" +
      "float hash(vec2 p) {\n" +
      "  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);\n" +
      "}\n" +
      "\n" +
      "float noise(vec2 p) {\n" +
      "  vec2 i = floor(p);\n" +
      "  vec2 f = fract(p);\n" +
      "  float a = hash(i);\n" +
      "  float b = hash(i + vec2(1.0, 0.0));\n" +
      "  float c = hash(i + vec2(0.0, 1.0));\n" +
      "  float d = hash(i + vec2(1.0, 1.0));\n" +
      "  vec2 u = f * f * (3.0 - 2.0 * f);\n" +
      "  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;\n" +
      "}\n" +
      "\n" +
      "void main() {\n" +
      "  vec2 uv = gl_FragCoord.xy / u_resolution;\n" +
      "  vec2 p = uv * 2.0 - 1.0;\n" +
      "  float t = u_time * 0.45;\n" +
      "  float flow = sin(p.x * 2.2 + t) * 0.34;\n" +
      "  float surface = p.y + flow;\n" +
      "  float band = smoothstep(0.18, -0.38, surface);\n" +
      "  float contrastBand = pow(band, 2.2);\n" +
      "  vec3 base = mix(u_inkDeep, u_ink, uv.y * 0.55);\n" +
      "  vec3 wave = mix(base, u_blue, contrastBand * 0.75);\n" +
      "  float highlight = smoothstep(0.55, 0.95, band) * 0.55;\n" +
      "  float glow = smoothstep(0.2, 0.85, band) * (1.0 - smoothstep(0.6, 1.0, band));\n" +
      "  vec3 bg = mix(wave, u_white, highlight) + u_blue * glow * 0.35 + u_white * glow * 0.18;\n" +
      "  float alpha = texture2D(u_text, uv).a;\n" +
      "  float luminance = dot(bg, vec3(0.2126, 0.7152, 0.0722));\n" +
      "  float mixFactor = smoothstep(0.35, 0.85, luminance);\n" +
      "  vec3 textColor = mix(u_white, u_ink, mixFactor);\n" +
      "  gl_FragColor = vec4(textColor, alpha);\n" +
      "}\n";

    let program;
    try {
      program = createProgram(gl, vertexSource, fragmentSource);
    } catch (error) {
      return;
    }
    let textProgram = null;
    if (textGl) {
      try {
        textProgram = createProgram(textGl, vertexSource, textFragmentSource);
      } catch (error) {
        textProgram = null;
      }
    }

    const positionLocation = gl.getAttribLocation(program, "a_position");
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    let textBuffer = null;
    let textPositionLocation = null;
    if (textGl && textProgram) {
      textPositionLocation = textGl.getAttribLocation(textProgram, "a_position");
      textBuffer = textGl.createBuffer();
      textGl.bindBuffer(textGl.ARRAY_BUFFER, textBuffer);
      textGl.bufferData(textGl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), textGl.STATIC_DRAW);
    }

    const uniforms = {
      resolution: gl.getUniformLocation(program, "u_resolution"),
      time: gl.getUniformLocation(program, "u_time"),
      ink: gl.getUniformLocation(program, "u_ink"),
      inkDeep: gl.getUniformLocation(program, "u_inkDeep"),
      blue: gl.getUniformLocation(program, "u_blue"),
      white: gl.getUniformLocation(program, "u_white"),
    };
    const textUniforms = textProgram
      ? {
          resolution: textGl.getUniformLocation(textProgram, "u_resolution"),
          time: textGl.getUniformLocation(textProgram, "u_time"),
          ink: textGl.getUniformLocation(textProgram, "u_ink"),
          inkDeep: textGl.getUniformLocation(textProgram, "u_inkDeep"),
          blue: textGl.getUniformLocation(textProgram, "u_blue"),
          white: textGl.getUniformLocation(textProgram, "u_white"),
          text: textGl.getUniformLocation(textProgram, "u_text"),
          texel: textGl.getUniformLocation(textProgram, "u_texel"),
        }
      : null;

    const jokeTop = footerLayer.querySelector(".site-footer__joke-top");
    const jokeBottom = footerLayer.querySelector(".site-footer__joke-bottom");
    let textTexture = null;
    let textCanvas2d = null;
    let textCtx = null;
    let textDirty = true;
    let rafId = 0;
    let isActive = footerLayer.classList.contains("footer--active");
    let lastTime = 0;

    function resize() {
      const rect = canvas.getBoundingClientRect();
      const dpr = clamp(window.devicePixelRatio || 1, 1, 2);
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      gl.viewport(0, 0, canvas.width, canvas.height);
      if (textCanvas && textGl) {
        textCanvas.width = canvas.width;
        textCanvas.height = canvas.height;
        textGl.viewport(0, 0, textCanvas.width, textCanvas.height);
        textDirty = true;
      }
    }

    function initTextCanvas() {
      if (!textCanvas || !textGl || !textProgram) return;
      textCanvas2d = document.createElement("canvas");
      textCtx = textCanvas2d.getContext("2d");
      textTexture = textGl.createTexture();
      textGl.bindTexture(textGl.TEXTURE_2D, textTexture);
      textGl.texParameteri(textGl.TEXTURE_2D, textGl.TEXTURE_WRAP_S, textGl.CLAMP_TO_EDGE);
      textGl.texParameteri(textGl.TEXTURE_2D, textGl.TEXTURE_WRAP_T, textGl.CLAMP_TO_EDGE);
      textGl.texParameteri(textGl.TEXTURE_2D, textGl.TEXTURE_MIN_FILTER, textGl.LINEAR);
      textGl.texParameteri(textGl.TEXTURE_2D, textGl.TEXTURE_MAG_FILTER, textGl.LINEAR);
      textGl.pixelStorei(textGl.UNPACK_FLIP_Y_WEBGL, true);
    }

    function drawTextMask() {
      if (!textCanvas || !textCtx || !textCanvas2d || !jokeTop || !jokeBottom) return;
      const footerRect = footerLayer.getBoundingClientRect();
      if (!footerRect.width || !footerRect.height) return;
      const dpr = canvas.width / footerRect.width;
      textCanvas2d.width = canvas.width;
      textCanvas2d.height = canvas.height;
      textCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      textCtx.clearRect(0, 0, footerRect.width, footerRect.height);

      const topRect = jokeTop.getBoundingClientRect();
      const bottomRect = jokeBottom.getBoundingClientRect();
      const topStyle = getComputedStyle(jokeTop);
      const bottomStyle = getComputedStyle(jokeBottom);

      textCtx.fillStyle = "#ffffff";
      textCtx.textBaseline = "top";
      textCtx.textAlign = "left";

      textCtx.font = `${topStyle.fontWeight} ${topStyle.fontSize} ${topStyle.fontFamily}`;
      textCtx.fillText(jokeTop.textContent || "", topRect.left - footerRect.left, topRect.top - footerRect.top);

      textCtx.font = `${bottomStyle.fontWeight} ${bottomStyle.fontSize} ${bottomStyle.fontFamily}`;
      textCtx.fillText(
        jokeBottom.textContent || "",
        bottomRect.left - footerRect.left,
        bottomRect.top - footerRect.top
      );
    }

    function updateTextTexture() {
      if (!textCanvas || !textGl || !textTexture || !textCanvas2d) return;
      if (!textDirty) return;
      drawTextMask();
      textGl.bindTexture(textGl.TEXTURE_2D, textTexture);
      textGl.texImage2D(textGl.TEXTURE_2D, 0, textGl.RGBA, textGl.RGBA, textGl.UNSIGNED_BYTE, textCanvas2d);
      textDirty = false;
    }

    function render(time, force) {
      if (!isActive && !force) {
        rafId = 0;
        return;
      }
      const now = time ? time * 0.001 : 0;
      lastTime = now;
      gl.useProgram(program);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.enableVertexAttribArray(positionLocation);
      gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
      gl.uniform2f(uniforms.resolution, canvas.width, canvas.height);
      gl.uniform1f(uniforms.time, now);
      gl.uniform3f(uniforms.ink, colors.ink[0], colors.ink[1], colors.ink[2]);
      gl.uniform3f(uniforms.inkDeep, colors.inkDeep[0], colors.inkDeep[1], colors.inkDeep[2]);
      gl.uniform3f(uniforms.blue, colors.blue[0], colors.blue[1], colors.blue[2]);
      gl.uniform3f(uniforms.white, colors.white[0], colors.white[1], colors.white[2]);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (textGl && textProgram && textCanvas && textUniforms && textBuffer) {
        updateTextTexture();
        textGl.enable(textGl.BLEND);
        textGl.blendFunc(textGl.SRC_ALPHA, textGl.ONE_MINUS_SRC_ALPHA);
        textGl.useProgram(textProgram);
        textGl.bindBuffer(textGl.ARRAY_BUFFER, textBuffer);
        textGl.enableVertexAttribArray(textPositionLocation);
        textGl.vertexAttribPointer(textPositionLocation, 2, textGl.FLOAT, false, 0, 0);
        textGl.uniform2f(textUniforms.resolution, textCanvas.width, textCanvas.height);
        textGl.uniform1f(textUniforms.time, now);
        textGl.uniform3f(textUniforms.ink, colors.ink[0], colors.ink[1], colors.ink[2]);
        textGl.uniform3f(textUniforms.inkDeep, colors.inkDeep[0], colors.inkDeep[1], colors.inkDeep[2]);
        textGl.uniform3f(textUniforms.blue, colors.blue[0], colors.blue[1], colors.blue[2]);
        textGl.uniform3f(textUniforms.white, colors.white[0], colors.white[1], colors.white[2]);
        textGl.uniform2f(textUniforms.texel, 1 / textCanvas.width, 1 / textCanvas.height);
        textGl.activeTexture(textGl.TEXTURE0);
        textGl.bindTexture(textGl.TEXTURE_2D, textTexture);
        textGl.uniform1i(textUniforms.text, 0);
        textGl.clearColor(0, 0, 0, 0);
        textGl.clear(textGl.COLOR_BUFFER_BIT);
        textGl.drawArrays(textGl.TRIANGLES, 0, 3);
      }
      rafId = requestAnimationFrame(render);
    }

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (media.matches) {
      resize();
      initTextCanvas();
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => {
          textDirty = true;
        });
      }
      render(0, true);
      return;
    }

    const observer = new MutationObserver(() => {
      const nextActive = footerLayer.classList.contains("footer--active");
      if (nextActive === isActive) return;
      isActive = nextActive;
      if (isActive && !rafId) {
        resize();
        rafId = requestAnimationFrame(render);
      }
    });

    observer.observe(footerLayer, { attributes: true, attributeFilter: ["class"] });

    resize();
    initTextCanvas();
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        textDirty = true;
      });
    }
    render(0, true);
    rafId = requestAnimationFrame(render);

    window.addEventListener("resize", () => {
      resize();
      if (!rafId && isActive) {
        rafId = requestAnimationFrame(render);
      }
    });
  }

  window.initFooterWebGL = initFooterWebGL;
})();
