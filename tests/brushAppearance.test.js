import assert from "node:assert/strict";
import { test } from "node:test";
import { styleZoomBrush } from "../src/shared/components/brushAppearance.js";

for (const [direction, cursor] of [["x", "ew-resize"], ["y", "ns-resize"]]) {
    test(`${direction}-axis brush uses directional overlay and drag cursors with four-way selection hover`, () => {
        const selections = new Map();
        const group = {
            selectAll(selector) {
                const attributes = new Map();
                const styles = new Map();
                const selection = {
                    attributes,
                    styles,
                    attr(name, value) {
                        attributes.set(name, value);
                        return selection;
                    },
                    style(name, value) {
                        styles.set(name, value);
                        return selection;
                    },
                };
                selections.set(selector, selection);
                return selection;
            },
        };

        styleZoomBrush(group, direction);

        assert.equal(selections.get(".selection").styles.get("cursor"), "move");
        assert.equal(selections.get(".handle").styles.get("cursor"), cursor);
        const overlay = selections.get(".overlay");
        assert.equal(overlay.styles.get("cursor"), cursor);
        for (const gestureCursor of ["crosshair", "move", cursor]) {
            overlay.attr("cursor", gestureCursor);
            assert.equal(overlay.styles.get("cursor"), cursor);
        }
    });
}
