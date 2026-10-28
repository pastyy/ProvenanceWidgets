/** Shared selection styling for a rectangle and its derived detail chart. */
export const rectangleZoomStyle = {
    backgroundColor: "rgba(113, 231, 251, 0.12)",
    // An inset border preserves the plot's coordinate system and dimensions.
    boxShadow: "inset 0 0 0 2px #17a2b8",
};

/** Shared D3 brush colors and direction-aware cursors. */
export function styleZoomBrush(group, direction) {
    group.selectAll(".overlay")
        .attr("fill", "rgba(113, 231, 251, 0.06)")
        .style("cursor", direction === "x" ? "ew-resize" : "ns-resize");
    group.selectAll(".selection")
        .attr("fill", "#71e7fb").attr("fill-opacity", 0.24)
        .attr("stroke", "#17a2b8").attr("stroke-width", 1.5)
        .style("cursor", "move");
    group.selectAll(".handle")
        .attr("fill", "#17a2b8").attr("fill-opacity", 0.8)
        .style("cursor", direction === "x" ? "ew-resize" : "ns-resize");
}
