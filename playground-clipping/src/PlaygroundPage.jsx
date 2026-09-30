import { useState } from "react";

// Import the source entry directly so this playground always exercises the
// current checkout, without requiring a package build or npm link.
import {
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
import CheckboxGroup from "../../src/widgets/ClippedCheckboxGroup.js";

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

/*
 * Pre-generated checkbox history, commented out so the checkbox starts
 * empty and you can trigger clipping manually by clicking.
 * const checkboxHistoryValues = [
 *   [],
 *   ["Chicken"],
 *   ["Lamb"],
 *   ["Chicken", "Beef"],
 *   ["Chicken", "Lamb"],
 *   ["Beef", "Lamb"],
 *   ["Chicken", "Beef", "Lamb"],
 * ];
 *
 * const checkboxHistoryValueKey = value => JSON.stringify(value);
 *
 * const shuffleCheckboxHistoryValues = () => {
 *   const shuffled = [...checkboxHistoryValues];
 *   for (let index = shuffled.length - 1; index > 0; index -= 1) {
 *     const swapIndex = Math.floor(Math.random() * (index + 1));
 *     [shuffled[index], shuffled[swapIndex]] = [
 *       shuffled[swapIndex],
 *       shuffled[index],
 *     ];
 *   }
 *   return shuffled;
 * };
 *
 * const createRandomCheckboxSequence = length => {
 *   const sequence = [];
 *
 *   while (sequence.length < length) {
 *     const batch = shuffleCheckboxHistoryValues();
 *     const previous = sequence.at(-1);
 *
 *     if (
 *       previous &&
 *       checkboxHistoryValueKey(batch[0]) === checkboxHistoryValueKey(previous)
 *     ) {
 *       const swapIndex = batch.findIndex(
 *         value => checkboxHistoryValueKey(value) !== checkboxHistoryValueKey(previous),
 *       );
 *       [batch[0], batch[swapIndex]] = [batch[swapIndex], batch[0]];
 *     }
 *
 *     sequence.push(...batch);
 *   }
 *
 *   return sequence.slice(0, length);
 * };
 *
 * const checkboxHistoryIntervals = [90, 120, 75, 160, 110, 95, 130, 80, 180, 100];
 *
 * const getCheckboxHistoryInterval = index => {
 *   const phase = index % 50;
 *   if (phase < 14) return checkboxHistoryIntervals[index % checkboxHistoryIntervals.length];
 *   if (phase < 24) return 450 + (index % 5) * 90;
 *   if (phase < 42) return 1400 + (index % 7) * 240;
 *   return 7000 + (index % 4) * 1800;
 * };
 *
 * const createPlaygroundCheckboxHistory = () => {
 *   let elapsed = Date.parse("2024-03-05T03:44:00.000Z");
 *   const sequence = createRandomCheckboxSequence(100);
 *
 *   return Array.from({ length: 100 }, (_, index) => {
 *     if (index > 0) elapsed += getCheckboxHistoryInterval(index);
 *     return {
 *       value: sequence[index],
 *       timestamp: new Date(elapsed).toISOString(),
 *       source: "history",
 *       kind: "interaction",
 *     };
 *   });
 * };
 */

const playgroundCheckboxProvenance = {
  schemaVersion: 2,
  widgetId: "checkbox-group",
  widgetType: "checkbox-group",
  mode: "interaction",
  data: [],
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
const playgroundSingleSliderProvenance = createDemoProvenance(
  "single-slider",
  "single-slider",
  [50, 25],
);
const playgroundRangeSliderProvenance = createDemoProvenance(
  "range-slider",
  "range-slider",
  [[20, 80], [0, 100]],
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
  const [checkboxSelection, setCheckboxSelection] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [ingredient, setIngredient] = useState("Cheese");
  const [singleSliderValue, setSingleSliderValue] = useState(25);
  const [rangeSliderValue, setRangeSliderValue] = useState([0, 100]);
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
            <WidgetCard id="checkbox-group" title="Checkbox Group">
              <CheckboxGroup
                id="checkbox-group"
                scalability={{
                  temporal_view: {
                    strategy: "clipping",
                    clipping_options: {
                      trigger: { type: "on_interaction_over", threshold: 50 },
                    },
                  },
                }}
                data={meatOptions}
                optionLabel="label"
                optionValue="value"
                provenance={playgroundCheckboxProvenance}
                selected={checkboxSelection}
                onSelectedChange={setCheckboxSelection}
                dataLabel="Meat"
              />
            </WidgetCard>

            <WidgetCard id="input-text" title="Input Text">
              <InputText
                id="input-text"
                placeholder="Search and press Enter"
                value={inputValue}
                onChange={setInputValue}
                provenance={playgroundInputTextProvenance}
                dataLabel="Search"
              />
            </WidgetCard>

            <WidgetCard id="radiobutton-group" title="Radiobutton Group">
              <RadioGroup
                id="radiobutton-group"
                data={toppingOptions}
                optionLabel="label"
                optionValue="value"
                selected={ingredient}
                onSelectedChange={setIngredient}
                provenance={playgroundRadioProvenance}
                dataLabel="Pizza topping"
              />
            </WidgetCard>

            <WidgetCard id="single-slider" title="Single Slider">
              <Singleslider
                id="single-slider"
                value={singleSliderValue}
                onChange={setSingleSliderValue}
                options={singleSliderOptions}
                provenance={playgroundSingleSliderProvenance}
                dataLabel="Single value"
              />
            </WidgetCard>

            <WidgetCard id="single-select-dropdown" title="Single Select Dropdown">
              <SingleSelectDropdown
                id="single-select-dropdown"
                options={cityOptions}
                optionLabel="label"
                dataKey="value"
                selected={city}
                onSelectedChange={setCity}
                provenance={playgroundSingleSelectProvenance}
                filter
                showClear
                dataLabel="City"
              />
            </WidgetCard>

            <WidgetCard id="multi-select-dropdown" title="Multi Select Dropdown">
              <MultiSelectDropdown
                id="multi-select-dropdown"
                options={cityOptions}
                optionLabel="label"
                dataKey="value"
                selected={cities}
                onSelectedChange={setCities}
                provenance={playgroundMultiSelectProvenance}
                filter
                showClear
                dataLabel="Cities"
              />
            </WidgetCard>

            <WidgetCard id="range-slider" title="Range Slider">
              <Rangeslider
                id="range-slider"
                value={rangeSliderValue}
                onChange={setRangeSliderValue}
                options={rangeSliderOptions}
                provenance={playgroundRangeSliderProvenance}
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
