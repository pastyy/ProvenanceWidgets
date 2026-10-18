/**
 * Savitzky-Golay local polynomial least squares on a uniform data-domain grid.
 * QR avoids squaring the Vandermonde matrix's condition number. Cache weights
 * for the centered window and the shifted windows at either end of the grid.
 */
function fittingBasis(length, order) {
    const basis = [];
    const upper = Array.from({ length: order + 1 }, () => []);
    const scale = Math.max(1, length - 1);
    const center = (length - 1) / 2;
    for (let degree = 0; degree <= order; degree += 1) {
        const column = Array.from({ length }, (_, index) =>
            ((index - center) / scale) ** degree);
        // Reorthogonalize for stability when callers request higher orders.
        for (let pass = 0; pass < 2; pass += 1) {
            for (let previous = 0; previous < degree; previous += 1) {
                const projection = column.reduce((sum, value, index) =>
                    sum + value * basis[previous][index], 0);
                upper[previous][degree] = (upper[previous][degree] ?? 0) + projection;
                for (let index = 0; index < length; index += 1) {
                    column[index] -= projection * basis[previous][index];
                }
            }
        }
        const norm = Math.sqrt(column.reduce((sum, value) => sum + value * value, 0));
        if (norm < 1e-12) return null;
        upper[degree][degree] = norm;
        basis.push(column.map(value => value / norm));
    }
    return { basis, upper, scale, center };
}

function fittingWeights(fit, evaluationIndex) {
    const { basis, upper, scale, center } = fit;
    const position = (evaluationIndex - center) / scale;
    // Solve R^T a = [1, x, x^2, ...] for the requested evaluation position.
    const coefficients = [];
    for (let degree = 0; degree < basis.length; degree += 1) {
        let value = position ** degree;
        for (let previous = 0; previous < degree; previous += 1) {
            value -= upper[previous][degree] * coefficients[previous];
        }
        coefficients.push(value / upper[degree][degree]);
    }
    return Array.from({ length: basis[0].length }, (_, index) => basis.reduce((sum, column, degree) =>
        sum + column[index] * coefficients[degree], 0));
}

export function smoothSavgol(samples, { window_length = 4, polyorder = 2 } = {}) {
    if (samples.length < 2) return samples.map(sample => ({ ...sample }));
    const spacing = samples[1].value - samples[0].value;
    if (!(spacing > 0) || !Number.isInteger(polyorder) || polyorder < 0) {
        return samples.map(sample => ({ ...sample }));
    }
    let length = Math.max(1, Math.round(window_length / spacing));
    if (length % 2 === 0) length += 1;
    let minimum = polyorder + 1;
    if (minimum % 2 === 0) minimum += 1;
    const maximum = samples.length % 2 === 0 ? samples.length - 1 : samples.length;
    length = Math.min(maximum, Math.max(length, minimum));
    if (length <= polyorder) return samples.map(sample => ({ ...sample }));

    const fit = fittingBasis(length, polyorder);
    if (!fit) return samples.map(sample => ({ ...sample }));

    const half = Math.floor(length / 2);
    const weights = new Map();
    return samples.map((sample, index) => {
        const start = Math.max(0, Math.min(samples.length - length, index - half));
        const evaluationIndex = index - start;
        if (!weights.has(evaluationIndex)) {
            weights.set(evaluationIndex, fittingWeights(fit, evaluationIndex));
        }
        const coefficients = weights.get(evaluationIndex);
        const count = coefficients?.reduce((sum, weight, offset) =>
            sum + weight * samples[start + offset].count, 0);
        return { value: sample.value, count: Number.isFinite(count) ? count : sample.count };
    });
}
