import { useState } from "react";

// Import the source entry directly so this playground always exercises the
// current checkout, without requiring a package build or npm link.
import {
  CheckboxGroup,
  InputText,
  MultiSelectDropdown,
  ProvenanceProvider,
  RadioGroup,
  Rangeslider,
  SingleSelectDropdown,
  Singleslider,
  SuperProvenanceWidget,
} from "../../src/index.ts";

import WidgetCard from "./WidgetCard.jsx";
import { configurePlaygroundScalability } from "./scalabilityControls.js";

const cityOptions = [
  { label: "New York", value: "New York" },
  { label: "London", value: "London" },
  { label: "Paris", value: "Paris" },
  { label: "Mumbai", value: "Mumbai" },
];

const toppingOptions = [
  { label: "Cheese", value: "Cheese" },
  { label: "Mushroom", value: "Mushroom" },
  { label: "Peppers", value: "Peppers" },
  { label: "Olives", value: "Olives" },
  { label: "Onions", value: "Onions" },
  { label: "Pineapple", value: "Pineapple" },
];

const meatOptions = [
  { label: "Chicken", value: "Chicken" },
  { label: "Beef", value: "Beef" },
  { label: "Lamb", value: "Lamb" },
];

const checkboxScalability = {
  temporal_view: {
    strategy: "smoothing",
    smoothing_options: {
      // 整条历史 bar 的横向模糊强度（标准差，占 bar 总宽度的百分比）。
      // 0 = 不模糊；例如 0.5 / 1.2 / 3，越大越模糊，不受小块宽度限制。
      blur_radius: 1.2,
    },
    zoom_in_options: {
      visibility: "all-active",
      trigger: { type: "interaction", threshold: 10 },
    },
    clipping_options: {
      trigger: { type: "interaction", threshold: 10 },
    },
  },
  aggregate_view: {
    strategy: "none",
    clipping_options: {
      trigger: { type: "interaction", threshold: 10 },
    },
  },
};

const radioScalability = {
  temporal_view: {
    strategy: "zoom_in",
    smoothing_options: {
      // 整条历史 bar 的横向模糊强度（标准差，占 bar 总宽度的百分比）。
      // 0 = 不模糊；例如 0.5 / 1.2 / 3，越大越模糊，不受小块宽度限制。
      blur_radius: 1.2,
    },
    zoom_in_options: {
      visibility: "all-active",
      trigger: { type: "interaction", threshold: 10 },
    },
    clipping_options: {
      trigger: { type: "interaction", threshold: 10 },
    },
  },
  aggregate_view: {
    strategy: "none",
    clipping_options: {
      trigger: { type: "interaction", threshold: 10 },
    },
  },
};

const singleSelectScalability = {
  temporal_view: {
    strategy: "zoom_in",
    smoothing_options: {
      // 整条历史 bar 的横向模糊强度（标准差，占 bar 总宽度的百分比）。
      // 0 = 不模糊；例如 0.5 / 1.2 / 3，越大越模糊，不受小块宽度限制。
      blur_radius: 1.2,
    },
    zoom_in_options: {
      visibility: "all-active",
      trigger: { type: "interaction", threshold: 10 },
    },
    clipping_options: {
      trigger: { type: "interaction", threshold: 10 },
    },
  },
  aggregate_view: {
    strategy: "clipping",
    clipping_options: {
      trigger: { type: "interaction", threshold: 10 },
    },
  },
};

const multiSelectScalability = {
  temporal_view: {
    strategy: "zoom_in",
    smoothing_options: {
      // 整条历史 bar 的横向模糊强度（标准差，占 bar 总宽度的百分比）。
      // 0 = 不模糊；例如 0.5 / 1.2 / 3，越大越模糊，不受小块宽度限制。
      blur_radius: 1.2,
    },
    zoom_in_options: {
      visibility: "all-active",
      trigger: { type: "interaction", threshold: 10 },
    },
    clipping_options: {
      trigger: { type: "interaction", threshold: 10 },
    },
  },
  aggregate_view: {
    strategy: "none",
    clipping_options: {
      trigger: { type: "interaction", threshold: 10 },
    },
  },
};

const checkboxHistoryValues = [
  [],
  ["Chicken"],
  ["Lamb"],
  ["Chicken", "Beef"],
  ["Chicken", "Lamb"],
  ["Beef", "Lamb"],
  ["Chicken", "Beef", "Lamb"],
];

const checkboxHistoryValueKey = value => JSON.stringify(value);

const shuffleCheckboxHistoryValues = () => {
  const shuffled = [...checkboxHistoryValues];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [
      shuffled[swapIndex],
      shuffled[index],
    ];
  }
  return shuffled;
};

const createRandomCheckboxSequence = length => {
  const sequence = [];

  while (sequence.length < length) {
    const batch = shuffleCheckboxHistoryValues();
    const previous = sequence.at(-1);

    if (
      previous &&
      checkboxHistoryValueKey(batch[0]) === checkboxHistoryValueKey(previous)
    ) {
      const swapIndex = batch.findIndex(
        value => checkboxHistoryValueKey(value) !== checkboxHistoryValueKey(previous),
      );
      [batch[0], batch[swapIndex]] = [batch[swapIndex], batch[0]];
    }

    sequence.push(...batch);
  }

  return sequence.slice(0, length);
};

const checkboxHistoryIntervals = [90, 120, 75, 160, 110, 95, 130, 80, 180, 100];

const getCheckboxHistoryInterval = index => {
  const phase = index % 50;
  if (phase < 14) return checkboxHistoryIntervals[index % checkboxHistoryIntervals.length];
  if (phase < 24) return 450 + (index % 5) * 90;
  if (phase < 42) return 1400 + (index % 7) * 240;
  return 7000 + (index % 4) * 1800;
};

const createPlaygroundCheckboxHistory = () => {
  let elapsed = Date.parse("2024-03-05T03:44:00.000Z");
  const sequence = createRandomCheckboxSequence(100);

  return Array.from({ length: 100 }, (_, index) => {
    if (index > 0) elapsed += getCheckboxHistoryInterval(index);
    return {
      value: sequence[index],
      timestamp: new Date(elapsed).toISOString(),
      source: "history",
      kind: "interaction",
    };
  });
};

const playgroundCheckboxProvenance = {
  schemaVersion: 2,
  widgetId: "checkbox-group",
  widgetType: "checkbox-group",
  mode: "interaction",
  data: createPlaygroundCheckboxHistory(),
};

const createDemoProvenance = (widgetId, widgetType, values) => ({
  schemaVersion: 2,
  widgetId,
  widgetType,
  mode: "interaction",
  sampleIntervalMs: 1000,
  data: values.map((value, index) => ({
    value,
    timestamp: new Date(
      Date.parse("2024-03-05T03:44:00.000Z") + index * 60000,
    ).toISOString(),
    source: "history",
    kind: "interaction",
  })),
});

const playgroundInputTextProvenance = createDemoProvenance(
  "input-text",
  "input-text",
  ["alpha", ""],
);
const playgroundRadioProvenance = createDemoProvenance(
  "radiobutton-group",
  "radio-group",
  ["Mushroom", "Cheese"],
);
const singleSliderHistory = Array.from({ length: 54 }, (_, index) =>
  Math.max(0, Math.min(100, Math.round(
    48 + 25 * Math.sin(index * 0.73) + 9 * Math.sin(index * 0.19),
  ))),
);
// const singleSliderHistory = [50, 25];
const playgroundSingleSliderProvenance = createDemoProvenance(
  "single-slider",
  "single-slider",
  singleSliderHistory,
);
const rangeSliderHistory = Array.from({ length: 64 }, (_, index) => {
  const center = 50 + 23 * Math.sin(index * 0.31);
  const halfWidth = 10 + (index % 6) * 3;
  return [
    Math.max(0, Math.round(center - halfWidth)),
    Math.min(100, Math.round(center + halfWidth)),
  ];
});
const playgroundRangeSliderProvenance = createDemoProvenance(
  "range-slider",
  "range-slider",
  rangeSliderHistory,
);
const playgroundSingleSelectProvenance = createDemoProvenance(
  "single-select-dropdown",
  "dropdown",
  ["London", "New York"],
);
const playgroundMultiSelectProvenance = createDemoProvenance(
  "multi-select-dropdown",
  "multiselect",
  [["Paris"], ["New York", "London"]],
);

const singleSliderOptions = {
  floor: 0,
  ceil: 100,
  showTicks: true,
  tickStep: 5,
};

const rangeSliderOptions = {
  floor: 0,
  ceil: 100,
  showTicks: true,
  tickStep: 15,
};

const sliderClipping = {
  temporal_view: {
    strategy: "smoothing",
    clipping_options: {
      trigger: { type: "interaction", threshold: 20 },
    },
  },
  aggregate_view: {
    strategy: "smoothing",
    clipping_options: {
      trigger: { type: "interaction", threshold: 10 },
    },
  },
};

const provenanceComponents = [
  "single-slider",
  "range-slider",
  "input-text",
  "checkbox-group",
  "radiobutton-group",
  "single-select-dropdown",
  "multi-select-dropdown",
];

export default function PlaygroundPage() {
  const [strategyOverrides, setStrategyOverrides] = useState({});
  const configure = (id, defaults) =>
    configurePlaygroundScalability(defaults, strategyOverrides[id]);
  // Slider controls change only the strategy; preserve all existing options.
  const configureSlider = (id, defaults) => ({
    ...defaults,
    ...Object.fromEntries(["aggregate_view", "temporal_view"].map(view => [view, {
      ...defaults[view],
      strategy: strategyOverrides[id]?.[view] ?? defaults[view]?.strategy,
    }])),
  });
  const controls = id => ({
    strategies: strategyOverrides[id],
    onStrategyChange: (view, strategy) => setStrategyOverrides(previous => ({
      ...previous, [id]: { ...previous[id], [view]: strategy },
    })),
  });
  const [checkboxSelection, setCheckboxSelection] = useState(
    () => playgroundCheckboxProvenance.data.at(-1).value,
  );
  const [inputValue, setInputValue] = useState("");
  const [ingredient, setIngredient] = useState("Cheese");
  const [singleSliderValue, setSingleSliderValue] = useState(
    () => singleSliderHistory.at(-1),
  );
  const [rangeSliderValue, setRangeSliderValue] = useState(
    () => rangeSliderHistory.at(-1),
  );
  const [city, setCity] = useState(cityOptions[0]);
  const [cities, setCities] = useState(cityOptions.slice(0, 2));
  return (
    <ProvenanceProvider>
      <main className="playground-page">
        <header className="playground-page__header">
          <p>Local component workspace</p>
          <h1>ProvenanceWidgets Playground</h1>
        </header>

        <div className="super-provenance-demo">
          <SuperProvenanceWidget
            id="playground-superprovenance"
            components={provenanceComponents}
            default
          >
            <div className="playground-grid">
            <WidgetCard {...controls("checkbox-group")} defaultStrategies={{ temporal_view: "smoothing", aggregate_view: "none" }} supportsSmoothing={["temporal_view"]} id="checkbox-group" title="Checkbox Group">
              <CheckboxGroup
                id="checkbox-group"
                data={meatOptions}
                optionLabel="label"
                optionValue="value"
                provenance={playgroundCheckboxProvenance}
                scalability={configure("checkbox-group", checkboxScalability)}
                selected={checkboxSelection}
                onSelectedChange={setCheckboxSelection}
                dataLabel="Meat"
              />
            </WidgetCard>

            <WidgetCard {...controls("input-text")} defaultStrategies={{ temporal_view: "zoom_in", aggregate_view: "clipping" }} supportsSmoothing={false} id="input-text" title="Input Text">
              <InputText
                id="input-text"
                placeholder="Search and press Enter"
                value={inputValue}
                onChange={setInputValue}
                provenance={playgroundInputTextProvenance}
                scalability={configure("input-text", {
                  temporal_view: {
                    strategy: "zoom_in",
                    zoom_in_options: {
                      modes: ["interactions"],
                      visibility: "after-trigger",
                      trigger: {
                        type: "interaction",
                        threshold: 10,
                        auto_zoom: true,
                      },
                    },
                    clipping_options: {
                      trigger: { type: "interaction", threshold: 10 },
                    },
                  },
                  aggregate_view: {
                    strategy: "clipping",
                    clipping_options: {
                      trigger: { type: "interaction", threshold: 10 },
                    },
                  },
                })}
                dataLabel="Search"
              />
            </WidgetCard>

            <WidgetCard {...controls("radiobutton-group")} defaultStrategies={{ temporal_view: "zoom_in", aggregate_view: "none" }} supportsSmoothing={["temporal_view"]} id="radiobutton-group" title="Radiobutton Group">
              <RadioGroup
                id="radiobutton-group"
                data={toppingOptions}
                optionLabel="label"
                optionValue="value"
                selected={ingredient}
                onSelectedChange={setIngredient}
                provenance={playgroundRadioProvenance}
                scalability={configure("radiobutton-group", radioScalability)}
                dataLabel="Pizza topping"
              />
            </WidgetCard>

            <WidgetCard {...controls("single-slider")} defaultStrategies={{ temporal_view: "smoothing", aggregate_view: "smoothing" }} supportsSmoothing={true} id="single-slider" title="Single Slider">
              <Singleslider
                id="single-slider"
                value={singleSliderValue}
                onChange={setSingleSliderValue}
                options={singleSliderOptions}
                provenance={playgroundSingleSliderProvenance}
                dataLabel="Single value"
                scalability={configureSlider("single-slider", {
                  "temporal_view": {
                    "strategy": "smoothing", // "clipping" or "zoom_in" or "smoothing"
                    "clipping_options": sliderClipping.temporal_view.clipping_options,
                    "smoothing_options": {
                      "method": {
                        "type": "savgol", // "gaussian" or "bspline"
                        "options": { "window_size": 200, "degree": 1 }
                      },
                      "trigger": { "type": "interaction", "threshold": 20 }
                    },
                    "zoom_in_options": {
                      "modes": ["interactions", "interactions-values", "values"],
                      "visibility": "all-active", // "all-active" or "after-trigger"
                      "trigger": {
                        "type": "interaction",  // "interaction" or "time"
                        "threshold": 10,
                        "auto_zoom": true
                      }
                    }
                  },
                  "aggregate_view": {
                    "strategy": "smoothing", // "clipping" or "zoom_in" or "smoothing"
                    "smoothing_options": {
                      "method": {
                        "type": "savgol",
                        "options": { "window_size": 9, "degree": 8 }
                      },
                      "trigger": { "type": "interaction", "threshold": 10 }
                    },
                    // "window_options": {
                    //   "window_size": 50,
                    //   "window_start": 10
                    // }
                  }
                })}
              />
            </WidgetCard>

            <WidgetCard {...controls("single-select-dropdown")} defaultStrategies={{ temporal_view: "zoom_in", aggregate_view: "clipping" }} supportsSmoothing={["temporal_view"]} id="single-select-dropdown" title="Single Select Dropdown">
              <SingleSelectDropdown
                id="single-select-dropdown"
                options={cityOptions}
                optionLabel="label"
                dataKey="value"
                selected={city}
                onSelectedChange={setCity}
                provenance={playgroundSingleSelectProvenance}
                scalability={configure("single-select-dropdown", singleSelectScalability)}
                filter
                showClear
                dataLabel="City"
              />
            </WidgetCard>

            <WidgetCard {...controls("multi-select-dropdown")} defaultStrategies={{ temporal_view: "zoom_in", aggregate_view: "none" }} supportsSmoothing={["temporal_view"]} id="multi-select-dropdown" title="Multi Select Dropdown">
              <MultiSelectDropdown
                id="multi-select-dropdown"
                options={cityOptions}
                optionLabel="label"
                dataKey="value"
                selected={cities}
                onSelectedChange={setCities}
                provenance={playgroundMultiSelectProvenance}
                scalability={configure("multi-select-dropdown", multiSelectScalability)}
                filter
                showClear
                dataLabel="Cities"
              />
            </WidgetCard>

            <WidgetCard {...controls("range-slider")} defaultStrategies={{ temporal_view: "smoothing", aggregate_view: "smoothing" }} supportsSmoothing={true} id="range-slider" title="Range Slider">
              <Rangeslider
                id="range-slider"
                value={rangeSliderValue}
                onChange={setRangeSliderValue}
                options={rangeSliderOptions}
                provenance={playgroundRangeSliderProvenance}
                scalability={configureSlider("range-slider", sliderClipping)}
                dataLabel="Range"
              />
            </WidgetCard>
            </div>
          </SuperProvenanceWidget>
        </div>
      </main>
    </ProvenanceProvider>
  );
}
