import {
    Children,
    isValidElement,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import {
    SelectionProvenance,
    PROVENANCE_INSERT_EVENT,
} from "@provenance-widgets/core";
import useProvenanceController from "../provenance/hooks/useProvenanceController.js";
import useRevertedValue from "../provenance/hooks/useRevertedValue.js";
import useWidgetRegistry from "../provenance/hooks/useWidgetRegistry.js";
import Checkbox from "./Checkbox.js";
import CheckboxGroupContext, {
    useCheckboxGroup,
} from "../shared/contexts/CheckboxGroupContext.js";
import {
    callCheckboxGroupCallbacks,
    checkboxGroupValueKey,
    getCheckboxGroupCaller,
    getCheckboxKeysAtTimelinePoint,
    getCheckboxOptionLabel,
    getCheckboxOptionValue,
    getControlledCheckboxGroupValue,
    getInitialCheckboxGroupValue,
    isResolvableCheckboxGroupValue,
    resolveCheckboxGroupValue,
    restoreCheckboxGroupTemporalValue,
} from "../shared/logic/checkboxGroupValue.js";
import { getSelectionTimeDomain, normalizeSelectionBrushRange } from "../shared/logic/selectionTimeline.js";
import { resolveTemporalBrushEnabled } from "../shared/logic/sliderTemporal.js";
import TemporalRangeSlider from "../shared/components/TemporalRangeSlider.js";
import useSelectionTemporalScalability from "../shared/hooks/useSelectionTemporalScalability.js";
import { shouldCommitSliderChange } from "../shared/logic/sliderInteraction.js";
import {
    getSelectionInteractionCount,
    getInteractionClippingWindow,
    interactionToAxisPosition,
    resolveTemporalZoomIn,
    isTemporalZoomToolVisible,
    temporalTriggerMetric,
    getTemporalAutoZoomRange,
    resolveTemporalZoomActions,
} from "../shared/logic/scalability/index.js";
import { DEFAULT_CHECKBOX_SCALABILITY } from "../types/scalability.ts";

export { useCheckboxGroup };

// Like Chart.js for sliders, this renderer owns its zoom calculation and state.
/** Checkbox history zoom uses a compressed interaction axis, preserving older history. */
function resolveCheckboxTemporalZoom({
    scalability, records = [], count = 0, mode = "interaction",
    brushRange = null, accepted = false, temporalBrush = true,
}) {
    const config = resolveTemporalZoomIn(scalability);
    // Checkbox values are categorical; only history-range zoom is supported.
    const enabled = config.enabled && config.zoomBy.includes("interactions") && temporalBrush;
    const entries = records.map((record, index) => [index, [{ time: record.timestamp }]]);
    const metric = temporalTriggerMetric(entries, config.trigger.type);
    const threshold = Number(config.trigger.threshold);
    // A zero baseline asks whether the threshold is reached for the current view.
    // The hook supplies the previous metric separately for one-time suggestions.
    const { crossed: triggered, shouldAutoZoom: auto } = resolveTemporalZoomActions({
        entries, trigger: config.trigger, enabled, accepted,
    });
    const canCompress = triggered && mode === "interaction" && config.trigger.type !== "on_time_over" && count > threshold;
    // Reaching the threshold alone must not change the axis in manual mode.
    const compressed = auto && canCompress;
    const blockSize = Math.max(1, Math.floor(threshold) || 1);
    const defaultAxis = getInteractionClippingWindow({ count, active: canCompress, threshold: blockSize });
    let targetRange = [0, 100];
    if (canCompress) {
        targetRange = defaultAxis.axisRange;
    } else if (triggered && entries.length > 1) {
        const [start] = getTemporalAutoZoomRange(entries, config.trigger);
        if (mode === "time") {
            const times = records.map(record => new Date(record.timestamp).getTime());
            const valid = times.filter(Number.isFinite);
            const min = Math.min(...valid);
            const max = Math.max(...valid);
            if (max > min && Number.isFinite(times[start])) {
                targetRange = [(times[start] - min) / (max - min) * 100, 100];
            }
        } else {
            targetRange = [count > 0 ? start / count * 100 : 0, 100];
        }
    }
    const selected = normalizeSelectionBrushRange(brushRange ?? (auto ? targetRange : [0, 100]));
    const axis = getInteractionClippingWindow({ count, active: compressed, threshold: blockSize, brushRange: selected });
    const ticks = [];
    if (compressed) {
        for (let n = blockSize; n <= axis.cutoff; n += blockSize) {
            ticks.push({ position: interactionToAxisPosition(n, axis), label: `n=${n}` });
        }
    }
    return {
        config, enabled, entries, metric, triggered, targetRange,
        showTemporalAxis: enabled && isTemporalZoomToolVisible({ entries, trigger: config.trigger }),
        compressed,
        axis,
        ticks,
        clipCount: compressed ? Math.floor(axis.cutoff / blockSize) : 0,
        brushRange: compressed ? axis.brushRange : selected,
        selectedRange: selected,
    };
}

/** Checkbox-only configuration/state; other selection widgets retain their behavior. */
function useCheckboxTemporalScalability(options) {
    // Clipping uses the same per-view props as RadioGroup and both dropdowns.
    // Keep the existing checkbox zoom defaults when clipping is not requested.
    const hasClipping = options.scalability?.temporal_view?.strategy === "clipping" ||
        options.scalability?.aggregate_view?.strategy === "clipping";
    options = { ...options, scalability: hasClipping ? options.scalability : DEFAULT_CHECKBOX_SCALABILITY };
    const selectionView = useSelectionTemporalScalability(options);
    const { id, mode, scalability, provenance, records, temporalBrush } = options;
    const count = getSelectionInteractionCount(provenance);
    const configKey = JSON.stringify([id, mode, temporalBrush, scalability?.temporal_view]);
    const [selection, setSelection] = useState(null);
    const [decision, setDecision] = useState(null);
    const [suggestion, setSuggestion] = useState(null);
    const previous = useRef(null);
    const accepted = decision?.key === configKey && decision.accepted;
    const initial = resolveCheckboxTemporalZoom({ ...options, count, accepted });
    // Entering a new compressed block follows the existing checkbox zoom behavior.
    const rangeKey = `${configKey}:${initial.axis.cutoff}`;
    const view = resolveCheckboxTemporalZoom({
        scalability, records, count, mode, temporalBrush, accepted,
        brushRange: selection?.key === rangeKey ? selection.value : null,
    });

    useEffect(() => {
        const prior = previous.current;
        const reset = !prior || prior.key !== configKey || count < prior.count || view.metric < prior.metric;
        if (reset) {
            setSelection(null);
            setDecision(null);
            setSuggestion(null);
        }
        const { shouldSuggest } = resolveTemporalZoomActions({
            entries: view.entries,
            trigger: view.config.trigger,
            enabled: view.enabled,
            previousMetric: reset ? 0 : prior.metric,
            accepted: !reset && accepted,
            suggestionHandled: !reset && decision?.key === configKey,
        });
        if (shouldSuggest) {
            setSuggestion(configKey);
        }
        previous.current = { key: configKey, count, metric: view.metric, triggered: view.triggered };
    }, [configKey, count, view.metric, view.triggered, view.config.trigger.auto_zoom_on_trigger, view.config.trigger.suggestion_on, decision]);

    const commit = value => {
        setSelection({ key: rangeKey, value });
        window.dispatchEvent(new CustomEvent("provenance-widgets", {
            detail: { id, widget: "checkbox-group", mode, interaction: "brush-end", data: { selection: value } },
        }));
    };
    const onChange = event => {
        const value = normalizeSelectionBrushRange(event.value);
        setSelection({ key: rangeKey, value });
        if (shouldCommitSliderChange(event)) commit(value);
    };
    const zoom = {
        enabled: view.compressed,
        showTemporalAxis: view.showTemporalAxis,
        brushRange: view.brushRange,
        suggestionVisible: suggestion === configKey && view.enabled,
        acceptSuggestion: () => {
            setDecision({ key: configKey, accepted: true });
            // Acceptance changes the axis mapping; let the accepted view choose
            // its target instead of carrying percentages from the old axis.
            setSelection(null);
            setSuggestion(null);
        },
        dismissSuggestion: () => {
            setDecision({ key: configKey, accepted: false });
            setSuggestion(null);
        },
        sliderProps: {
            startLabel: mode === "time" ? "t=0" : "n=0",
            nowLabel: view.compressed ? `now (${count})` : "now",
            // Hover needs the interaction mapping even when compression is off.
            // axis.active controls compression independently of tooltip availability.
            axis: mode === "interaction" ? view.axis : null,
            ticks: view.ticks,
            clipCount: view.clipCount,
            step: view.axis.axisStep,
            value: view.selectedRange,
            onChange,
            onSlideEnd: event => commit(normalizeSelectionBrushRange(event.value ?? view.selectedRange)),
        },
    };
    return view.config.enabled ? { ...selectionView, ...zoom } : selectionView;
}


const getChildValues = children =>
    Children.toArray(children)
        .filter(isValidElement)
        .map(child => child.props.value ?? child.props.label)
        .filter(value => value !== undefined);

const getCheckedChildValues = children =>
    Children.toArray(children)
        .filter(isValidElement)
        .filter(child =>
            child.props.checked === true ||
            child.props.defaultChecked === true
        )
        .map(child => child.props.value ?? child.props.label)
        .filter(value => value !== undefined);

const optionHasField = (options, field) =>
    typeof field === "string" &&
    options.some(option =>
        option !== null &&
        typeof option === "object" &&
        Object.prototype.hasOwnProperty.call(option, field)
    );

/**
 * Every interaction records the complete selected key array. This is
 * required for simultaneous changes, imported provenance, and restoring all
 * options active at a clicked Temporal position.
 */
const CheckboxGroup = (props) => {
    const {
        id,
        data,
        options,
        children,
        name,
        dataLabel,
        "data-label": legacyDataLabel,
        temporalBrush: temporalBrushProp,
        enableTemporalBrush,
        checkboxProps = {},
        style,
        className,
        styleClass,
        ...groupProps
    } = props;
    const optionData = data ?? options ?? [];
    const usesData =
        Array.isArray(optionData) && optionData.length > 0;
    const childValues = useMemo(
        () => getChildValues(children),
        [children]
    );
    const checkedChildValues = useMemo(
        () => getCheckedChildValues(children),
        [children]
    );
    const availableOptions = usesData
        ? optionData
        : childValues;
    const tooltipLabel = dataLabel ?? legacyDataLabel ?? id;
    const visualize = props.visualize ?? true;
    const temporalBrush = resolveTemporalBrushEnabled({
        temporalBrush: temporalBrushProp,
        enableTemporalBrush,
    });
    const legacyValueField =
        usesData &&
        !props.optionValue &&
        !props.valueField &&
        optionHasField(optionData, props.value)
            ? props.value
            : undefined;
    const legacyLabelField =
        usesData &&
        !props.optionLabel &&
        optionHasField(optionData, props.label)
            ? props.label
            : undefined;
    const config = useMemo(
        () => ({
            dataKey: props.dataKey,
            optionLabel:
                props.optionLabel ?? legacyLabelField,
            optionValue:
                props.optionValue ??
                props.valueField ??
                legacyValueField,
        }),
        [
            props.dataKey,
            props.optionLabel,
            props.optionValue,
            props.valueField,
            legacyLabelField,
            legacyValueField,
        ]
    );
    const contractProps = legacyValueField
        ? { ...props, value: undefined }
        : props;
    const initialValueRef = useRef(
        getInitialCheckboxGroupValue(
            contractProps,
            availableOptions,
            config,
            checkedChildValues
        )
    );
    const [revertedValue] = useRevertedValue(id);
    const {
        registerWidget,
        notifyWidget,
        restoreWidgetValue,
    } = useWidgetRegistry();
    const [showTimeline, setShowTimeline] = useState(false);
    const elementRef = useRef(null);
    const propsRef = useRef(props);
    const availableOptionsRef = useRef(availableOptions);
    const configRef = useRef(config);
    const checkboxRegistrationsRef = useRef(new Map());
    propsRef.current = props;
    availableOptionsRef.current = availableOptions;
    configRef.current = config;

    const strategyFactory = useMemo(
        () => () => {
            const strategy = new SelectionProvenance();
            strategy.tooltipLabel = tooltipLabel;
            strategy.tooltipIndexOffset = 1;
            return strategy;
        },
        [tooltipLabel]
    );

    const {
        currentValue,
        strategy,
        hasProvenance,
        provenance: serializedProvenance,
        mode: provenanceMode,
        recordInteraction,
        recordExternalChange,
        restoreValue,
    } = useProvenanceController({
        id,
        widgetType: "checkbox-group",
        value: initialValueRef.current,
        provenance: props.provenance,
        mode: props.mode,
        sampleIntervalMs: props.sampleIntervalMs,
        freeze: props.freeze,
        visualize,
        onProvenanceChange:
            props.onProvenanceChange ?? props.provenanceChange,
        strategyFactory,
    });
    const clipping = useCheckboxTemporalScalability({
        id,
        widget: "checkbox-group",
        scalability: props.scalability,
        mode: provenanceMode,
        provenance: strategy,
        records: serializedProvenance.data,
        temporalBrush,
        elementRef,
    });
    const [selection, setSelection] = useState(
        () => Array.isArray(currentValue) ? currentValue : []
    );
    const currentValueRef = useRef(currentValue);
    const selectionRef = useRef(selection);
    const serializedProvenanceRef = useRef(serializedProvenance);
    currentValueRef.current = currentValue;
    selectionRef.current = selection;
    serializedProvenanceRef.current = serializedProvenance;
    const currentValueKey = checkboxGroupValueKey(currentValue);
    const historyVersion = serializedProvenance.data
        .map(record => record.timestamp)
        .join("|");
    const timeDomain = useMemo(
        () => getSelectionTimeDomain(serializedProvenance.data),
        [historyVersion]
    );

    useEffect(() => {
        const restored = resolveCheckboxGroupValue(
            availableOptions,
            currentValue,
            config
        );
        selectionRef.current = restored;
        setSelection(restored);
    }, [
        currentValueKey,
        availableOptions,
        config,
    ]);

    const controlledSelection =
        getControlledCheckboxGroupValue(
            contractProps,
            availableOptions,
            config
        );
    const controlledPresent =
        controlledSelection !== undefined;
    const controlledValueKey = controlledPresent
        ? checkboxGroupValueKey(controlledSelection)
        : "__uncontrolled__";
    const previousControlledKeyRef =
        useRef(controlledValueKey);
    const previousProvenanceRef = useRef(props.provenance);
    const emittedValueKeyRef = useRef(null);

    useEffect(() => {
        const provenanceChanged =
            props.provenance !== previousProvenanceRef.current;
        const controlledChanged =
            controlledValueKey !==
            previousControlledKeyRef.current;

        if (controlledPresent && controlledChanged) {
            selectionRef.current = controlledSelection;
            setSelection(controlledSelection);
            if (
                emittedValueKeyRef.current === controlledValueKey ||
                provenanceChanged
            ) {
                emittedValueKeyRef.current = null;
            } else {
                recordExternalChange(controlledSelection, {
                    caller: getCheckboxGroupCaller(
                        currentValueRef.current,
                        controlledSelection
                    ),
                });
            }
        }
        previousControlledKeyRef.current = controlledValueKey;
        previousProvenanceRef.current = props.provenance;
    }, [
        controlledPresent,
        controlledSelection,
        controlledValueKey,
        props.provenance,
        recordExternalChange,
    ]);

    const applyRegisteredValue = useCallback(
        (nextValue, source = "history") => {
            if (
                !isResolvableCheckboxGroupValue(
                    nextValue,
                    availableOptionsRef.current,
                    configRef.current
                )
            ) {
                return false;
            }
            const restored = resolveCheckboxGroupValue(
                availableOptionsRef.current,
                nextValue,
                configRef.current
            );
            const changed = restoreValue(restored, {
                caller: getCheckboxGroupCaller(
                    currentValueRef.current,
                    restored
                ),
            });
            emittedValueKeyRef.current =
                checkboxGroupValueKey(restored);
            selectionRef.current = restored;
            setSelection(restored);
            callCheckboxGroupCallbacks(
                propsRef.current,
                restored,
                { source }
            );
            return changed;
        },
        [restoreValue]
    );

    const setCheckboxValue = useCallback(
        (value, checked, event) => {
            const nextCandidate = checked
                ? [...selectionRef.current, value]
                : selectionRef.current.filter(
                    selected =>
                        !Object.is(selected, value) &&
                        String(selected) !== String(value)
                );
            const nextValue = resolveCheckboxGroupValue(
                availableOptionsRef.current,
                nextCandidate,
                configRef.current
            );
            if (
                checkboxGroupValueKey(nextValue) ===
                checkboxGroupValueKey(selectionRef.current)
            ) {
                return false;
            }
            emittedValueKeyRef.current =
                checkboxGroupValueKey(nextValue);
            recordInteraction(nextValue, {
                caller: value,
            });
            selectionRef.current = nextValue;
            setSelection(nextValue);
            callCheckboxGroupCallbacks(
                propsRef.current,
                nextValue,
                event
            );
            return true;
        },
        [recordInteraction]
    );

    const registerCheckbox = useCallback((registration) => {
        const key = registration.value;
        checkboxRegistrationsRef.current.set(key, registration);
        return () => {
            if (
                checkboxRegistrationsRef.current.get(key) ===
                registration
            ) {
                checkboxRegistrationsRef.current.delete(key);
            }
        };
    }, []);

    useEffect(() => {
        if (!strategy) return undefined;
        strategy.hasUserInteracted = hasProvenance;
        strategy.tooltipLabel = tooltipLabel;
        strategy.tooltipIndexOffset = 1;
        notifyWidget(id);
        return undefined;
    }, [
        strategy,
        hasProvenance,
        tooltipLabel,
        id,
        notifyWidget,
    ]);

    useEffect(() => {
        if (!strategy) return undefined;
        const registration = {
            id,
            type: "checkbox-group",
            provenance: strategy,
            getProvenance: () => serializedProvenanceRef.current,
            elementRef,
            getValue: () => selectionRef.current,
            setValue: applyRegisteredValue,
            visualize,
            mode: provenanceMode,
            rendersOwnTemporalHeader: true,
            focus: () => {
                elementRef.current?.scrollIntoView?.({
                    behavior: "smooth",
                    block: "center",
                });
                elementRef.current
                    ?.querySelector?.('input[type="checkbox"]')
                    ?.focus?.();
            },
        };
        const unregister = registerWidget(registration);
        const refreshRegistry = () => notifyWidget(id);
        strategy.addEventListener(
            PROVENANCE_INSERT_EVENT,
            refreshRegistry
        );
        return () => {
            strategy.removeEventListener(
                PROVENANCE_INSERT_EVENT,
                refreshRegistry
            );
            unregister();
        };
    }, [
        strategy,
        id,
        applyRegisteredValue,
        registerWidget,
        notifyWidget,
        visualize,
        provenanceMode,
    ]);

    useEffect(() => {
        const handleToggle = event => {
            if (event.detail?.target !== id) return;
            setShowTimeline(Boolean(event.detail.open));
        };
        window.addEventListener(
            "provenance-timeline-toggle",
            handleToggle
        );
        return () => window.removeEventListener(
            "provenance-timeline-toggle",
            handleToggle
        );
    }, [id]);

    useEffect(() => {
        if (revertedValue === undefined) return;
        applyRegisteredValue(revertedValue, "history");
    }, [revertedValue, applyRegisteredValue]);

    const restoreTemporalAtContext = useCallback(
        context => {
            const keys = getCheckboxKeysAtTimelinePoint({
                provenance: clipping.temporalProvenance,
                point:
                    provenanceMode === "interaction" &&
                    context?.point !== undefined
                        ? Number(context.point) + 1
                        : context?.point,
                mode: provenanceMode,
            });
            return restoreCheckboxGroupTemporalValue({
                restoreWidgetValue,
                target: id,
                value: keys,
            });
        },
        [
            clipping.temporalProvenance,
            provenanceMode,
            restoreWidgetValue,
            id,
        ]
    );

    const renderedChildren = usesData
        ? optionData.map((option, index) => {
            const value = getCheckboxOptionValue(option, config);
            const label = getCheckboxOptionLabel(option, config);
            const optionProps =
                option && typeof option === "object"
                    ? option
                    : {};
            const legacyName =
                typeof props.name === "string"
                    ? optionProps[props.name]
                    : undefined;
            const legacyInputId =
                typeof props.inputId === "string"
                    ? optionProps[props.inputId]
                    : undefined;
            return (
                <Checkbox
                    key={String(value ?? index)}
                    {...checkboxProps}
                    {...optionProps}
                    value={value}
                    displayLabel={label}
                    name={
                        legacyName ??
                        optionProps.name ??
                        name ??
                        id
                    }
                    inputId={
                        legacyInputId ??
                        optionProps.inputId ??
                        `${id}-${String(value ?? index)}`
                    }
                    tabIndex={
                        optionProps.tabIndex ??
                        optionProps.tabindex ??
                        props.tabIndex ??
                        props.tabindex
                    }
                    ariaLabel={
                        optionProps.ariaLabel ??
                        props.ariaLabel
                    }
                    ariaLabelledBy={
                        optionProps.ariaLabelledBy ??
                        props.ariaLabelledBy
                    }
                    disabled={
                        optionProps.disabled ??
                        props.disabled
                    }
                    labelStyleClass={
                        optionProps.labelStyleClass ??
                        props.labelStyleClass
                    }
                />
            );
        })
        : children;

    const contextValue = useMemo(
        () => ({
            id,
            selected: selection,
            setCheckboxValue,
            registerCheckbox,
            provenance: showTimeline ? clipping.temporalProvenance : clipping.aggregateProvenance,
            hasProvenance,
            visualize,
            mode: provenanceMode,
            showTimeline,
            timeDomain: clipping.timeDomain ?? timeDomain,
            brushRange: clipping.brushRange,
            clipping: clipping.enabled,
            tooltipLabel,
            restoreTemporalAtContext,
        }),
        [
            id,
            selection,
            setCheckboxValue,
            registerCheckbox,
            clipping.temporalProvenance,
            clipping.aggregateProvenance,
            clipping.timeDomain,
            hasProvenance,
            visualize,
            provenanceMode,
            showTimeline,
            timeDomain,
            clipping.brushRange,
            clipping.enabled,
            tooltipLabel,
            restoreTemporalAtContext,
        ]
    );

    return (
        <CheckboxGroupContext.Provider value={contextValue}>
            <div
                ref={elementRef}
                id={id}
                role="group"
                aria-label={
                    groupProps["aria-label"] ?? tooltipLabel
                }
                data-widget-id={id}
                data-provenance-widget="checkbox-group"
                data-provenance-open={
                    showTimeline ? "true" : undefined
                }
                className={className ?? styleClass}
                style={style}
            >
                {visualize &&
                    hasProvenance &&
                    showTimeline &&
                    temporalBrush &&
                    clipping.showTemporalAxis && (
                    <div
                        data-timeline-axis={id}
                        data-provenance-chart-target={id}
                        style={{
                            marginLeft: "32px",
                            marginBottom: "12px",
                        }}
                    >
                        <TemporalRangeSlider
                                id={id}
                                label={tooltipLabel}
                                mode={provenanceMode}
                                {...clipping.sliderProps}
                        />
                    </div>
                )}
                {visualize && hasProvenance && clipping.suggestionVisible && (
                    <div role="status" aria-label="Zoom suggestion" style={{ marginLeft: "32px", marginBottom: "12px" }}>
                        <span>Zoom in to recent interactions?</span>{" "}
                        <button type="button" onClick={() => {
                            clipping.acceptSuggestion();
                            setShowTimeline(true);
                            window.dispatchEvent(new CustomEvent("provenance-timeline-visibility", {
                                detail: { target: id, open: true },
                            }));
                        }}>Zoom in</button>{" "}
                        <button type="button" onClick={clipping.dismissSuggestion}>Dismiss</button>
                    </div>
                )}
                {renderedChildren}
            </div>
        </CheckboxGroupContext.Provider>
    );
};

export default CheckboxGroup;
