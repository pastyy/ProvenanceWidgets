export const keepOpenProvenanceView = event => {
  const temporalButton = event.currentTarget.querySelector(
    '.provenance-button[data-provenance-state="temporal"]',
  );

  if (temporalButton) event.stopPropagation();
};
