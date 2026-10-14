export const sliderSmoothingParameters = {
  savgol: [
    { name: "window_length", hint: "Data-domain width (> 0)", min: 0, step: "any", positive: true },
    { name: "polyorder", hint: "Polynomial order (integer ≥ 0)", min: 0, step: 1, integer: true },
  ],
  gaussian: [
    { name: "sigma", hint: "Data-domain standard deviation (> 0)", min: 0, step: "any", positive: true },
    { name: "truncate", hint: "Support radius in σ multiples (> 0)", min: 0, step: "any", positive: true },
  ],
  bspline: [
    { name: "degree", hint: "Spline degree (integer 1–5)", min: 1, max: 5, step: 1, integer: true },
    { name: "smoothing_factor", hint: "Strength (0–1; 1 = fitted line)", min: 0, max: 1, step: "any" },
    { name: "knot_spacing", hint: "Data-domain knot spacing (> 0)", min: 0, step: "any", positive: true },
  ],
};

/** Empty/invalid edits stay in the form but never replace the last valid method. */
export function parseSmoothingParameter(parameter, rawValue) {
  if (String(rawValue).trim() === "") return null;
  const value = Number(rawValue);
  if (!Number.isFinite(value) || value < parameter.min ||
      (parameter.max !== undefined && value > parameter.max) ||
      (parameter.positive && value <= 0) ||
      (parameter.integer && !Number.isInteger(value))) return null;
  return value;
}
