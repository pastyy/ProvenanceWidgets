import assert from "node:assert/strict";
import { test } from "node:test";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { parseSmoothingParameter, sliderSmoothingParameters } from "../playground/src/sliderSmoothingParameters.js";

const require = createRequire(import.meta.url);
const compiled = await build({
  entryPoints: [fileURLToPath(new URL("../playground/src/SliderSmoothingControls.jsx", import.meta.url))],
  bundle: true, write: false, format: "esm", platform: "node", jsx: "automatic",
  plugins: [{ name: "shared-react", setup(builder) {
    builder.onResolve({ filter: /^react(?:\/.*)?$/ }, args => ({
      path: pathToFileURL(require.resolve(args.path)).href, external: true,
    }));
  } }],
});
const Controls = (await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString("base64")}`)).default;

test("only the selected algorithm's parameters are rendered with their current values", () => {
  const methods = [
    { type: "savgol", window_length: 7, polyorder: 2 },
    { type: "gaussian", sigma: 0.75, truncate: 3 },
    { type: "bspline", degree: 3, smoothing_factor: 0.1, knot_spacing: 3 },
  ];
  for (const method of methods) {
    const markup = renderToStaticMarkup(createElement(Controls, {
      method, onMethodChange: () => {}, onParameterChange: () => {},
    }));
    assert.equal((markup.match(/<input /g) ?? []).length, sliderSmoothingParameters[method.type].length);
    assert.match(markup, new RegExp(`<option value="${method.type}" selected=""`));
    for (const [type, parameters] of Object.entries(sliderSmoothingParameters)) {
      for (const { name } of parameters) {
        if (type === method.type) {
          assert.ok(markup.includes(`<span>${name}</span>`));
          assert.ok(markup.includes(`value="${method[name]}"`));
          assert.ok(markup.includes(`aria-describedby="${type}-${name}-hint"`));
        } else assert.ok(!markup.includes(`<span>${name}</span>`));
      }
    }
    assert.doesNotMatch(markup, /aria-invalid="true"/);
  }
});

test("distance fields accept decimal domain values, rejecting empty, zero and nonfinite edits", () => {
  for (const parameters of Object.values(sliderSmoothingParameters)) {
    for (const parameter of parameters.filter(item => item.positive)) {
      assert.equal(parseSmoothingParameter(parameter, "0.05"), 0.05);
      for (const value of ["", " ", "0", "-1", "NaN", "Infinity", "1e999"]) {
        assert.equal(parseSmoothingParameter(parameter, value), null);
      }
    }
  }
});

test("integer orders and bounded spline strength use their method-specific constraints", () => {
  const order = sliderSmoothingParameters.savgol.find(item => item.name === "polyorder");
  const degree = sliderSmoothingParameters.bspline.find(item => item.name === "degree");
  const strength = sliderSmoothingParameters.bspline.find(item => item.name === "smoothing_factor");
  assert.equal(parseSmoothingParameter(order, "0"), 0);
  assert.equal(parseSmoothingParameter(order, "2.5"), null);
  assert.equal(parseSmoothingParameter(degree, "1"), 1);
  assert.equal(parseSmoothingParameter(degree, "5"), 5);
  for (const value of ["0", "6", "1.5"]) assert.equal(parseSmoothingParameter(degree, value), null);
  for (const value of ["0", "0.1", "1"]) assert.equal(parseSmoothingParameter(strength, value), Number(value));
  for (const value of ["-0.1", "1.1", ""]) assert.equal(parseSmoothingParameter(strength, value), null);
});
