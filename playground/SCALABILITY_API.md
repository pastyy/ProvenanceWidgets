# SingleSlider Scalability API

本文档定义 `SingleSlider` 的 `scalability` 配置接口。字段命名和枚举值沿用
`scalability_api.json`；该 JSON 是接口草案，包含注释和伪类型表达式，不能直接
作为严格 JSON 解析。

## 总体配置

`SingleSlider` 可接收一个可选的 `scalability` 配置：

```ts
type SingleSliderScalability = {
  temporal_view?: TemporalViewScalability;
  aggregate_view?: AggregateViewScalability;
};
```

`temporal_view` 和 `aggregate_view` 彼此独立：

- 可以只配置其中一个视图；未配置的视图使用默认行为。
- 两个视图可以使用不同的 `strategy`。
- `strategy` 非必填；未提供时暂定默认为 `zoom_in`。
- 只有与当前 `strategy` 对应的 `*_options` 生效，其他策略选项应被忽略，
  但可以保留在配置对象中。

### 默认值规则

- JSON 中已经明确给出的默认值优先保留。
- JSON 中出现 `width / k` 但没有定义 `k`；暂定 `k = 10`，因此默认值为
  `width / 10`。
- 完全没有给出默认值的数值型字段，暂定为 `10`。
- `window_options.window_size` 的默认值是条目总数，`window_start` 的默认值
  是 `0`，这两个明确规则优先于通用的数值默认值 `10`。
- 所有计数、阈值和窗口大小都应归一化为至少为 `1` 的整数；索引应为非负整数，
  并在实际条目范围内进行边界裁剪。由 `width / 10` 计算出的结果也必须经过
  相同的整数化和下限处理。

## Temporal view

`temporal_view` 控制 SingleSlider 的时间/交互历史视图。

```ts
type TemporalViewScalability = {
  strategy?: "zoom_in" | "clipping" | "smoothening";
  zoom_in_options?: TemporalZoomInOptions;
  clipping_options?: ClippingOptions;
  smoothening_options?: SmootheningOptions;
};
```

### Zoom-in

当 `strategy === "zoom_in"` 时使用 `zoom_in_options`：

```ts
type TemporalZoomInOptions = {
  modes?: Array<"interactions" | "values" | "interactions-values">;
  visibility?: "all-active" | "after-trigger" | "off";
  trigger?: {
    type?: "interaction" | "time";
    threshold?: number;
    auto_zoom?: boolean;
    suggestion?: boolean;
  };
};
```

- `modes` 指定放大维度：交互次数 (`interactions`)、Slider 数值 (`values`)，
  或交互次数与数值组成的二维区域 (`interactions-values`)。
- `modes` 可包含 1～3 个不重复的选项，默认包含全部三个选项。
- `visibility` 默认 `all-active`；`after-trigger` 表示达到阈值后才启用缩放工具，
  `off` 表示始终关闭缩放工具。
- `trigger.type` 默认 `interaction`。
- `trigger.threshold` 在 `interaction` 下表示交互次数，默认 `50`；在 `time`
  下表示秒数，默认 `3600`。
- `auto_zoom` 表示达到阈值时是否自动放大，默认 `false`。
- `suggestion` 仅在不自动放大时有意义；表示是否显示带确认按钮的放大建议，
  默认 `false`。

### Clipping

当 `strategy === "clipping"` 时使用：

```ts
type ClippingOptions = {
  trigger?: {
    type?: "on_interaction_over" | "on_time_over";
    threshold?: number;
  };
};
```

- `trigger.type` 默认 `on_interaction_over`。
- `threshold` 的单位由 `type` 决定；默认值为 `width / 10`。

### Smoothening

当 `strategy === "smoothening"` 时使用：

```ts
type SmootheningOptions = {
  method?: "savgol" | "gaussian" | "bspline";
  trigger?: {
    type?: "on_interaction_over" | "on_time_over";
    threshold?: number;
  };
  window_unit?: "pixel" | "data_domain";
  window_size?: number;
};
```

- `method` 默认为 `savgol`。
- `trigger.type` 默认 `on_interaction_over`。
- `trigger.threshold` 默认 `width / 10`。
- `window_unit` 默认为 `pixel`：窗口随页面像素尺寸变化；
  `data_domain` 则按数据域定义窗口。
- `window_size` 是平滑计算窗口大小，默认 `width / 10`。

## Aggregate view

`aggregate_view` 控制按 Slider 值聚合的历史视图，例如每个数值的交互次数或
聚合柱状条。

```ts
type AggregateViewScalability = {
  strategy?: "zoom_in" | "clipping" | "smoothening";
  zoom_in_options?: AggregateZoomInOptions;
  clipping_options?: AggregateClippingOptions;
  smoothening_options?: SmootheningOptions;
  window_options?: WindowOptions;
};
```

### Aggregate zoom-in

```ts
type AggregateZoomInOptions = {
  trigger?: {
    type?: "on_interaction_over" | "on_time_over" | "on_range_over";
    threshold?: number;
    tool_visible_before_trigger?: boolean;
    auto_zoom_on_trigger?: boolean;
    suggestion_on?: boolean;
  };
};
```

- `on_interaction_over`：聚合交互次数超过阈值。
- `on_time_over`：经过指定时间。
- `on_range_over`：聚合交互次数的统计范围超过阈值，其中 range 定义为
  `max(interactionCount) - min(interactionCount)`，不是 RangeSlider 的数值范围。
- `threshold` 未在 JSON 中给出默认值，暂定为 `10`。
- `tool_visible_before_trigger`、`auto_zoom_on_trigger`、`suggestion_on` 的
  默认行为与 temporal zoom-in 相同，分别为 `true`、`false`、`false`。

### Aggregate clipping

```ts
type AggregateClippingOptions = {
  trigger?: {
    type?: "on_interaction_over" | "on_time_over";
    threshold?: number;
  };
};
```

- `trigger.type` 默认 `on_interaction_over`。
- `threshold` 未定义默认值，暂定为 `10`。

### Aggregate smoothening

使用与 temporal view 相同的 `SmootheningOptions` 结构：

- `method` 默认 `savgol`。
- `trigger.type` 默认 `on_interaction_over`。
- `trigger.threshold` 默认 `width / 10`。
- `window_unit` 默认 `pixel`。
- `window_size` 未定义默认值，暂定为 `10`。

### Window options

```ts
type WindowOptions = {
  window_size?: number;
  window_start?: number;
};
```

`window_options` 位于 `aggregate_view` 下，但不依赖 `aggregate_view.strategy`：
无论聚合视图采用 `zoom_in`、`clipping` 还是 `smoothening`，都可以使用它进行
值窗口分页或滚动。

- `window_size` 是当前窗口显示的条目数。条目可以是 SingleSlider 的数值/聚合值。
  默认显示全部条目（总条目数）。
- `window_start` 是窗口起始索引，默认 `0`（第一个条目）。
- 窗口不得越过条目边界；当 `window_start + window_size` 超出范围时，应裁剪到
  最后一个有效条目。
- 该窗口机制只负责分段显示，不应丢弃被窗口隐藏的聚合数据。

## 实现不变量

1. Temporal 和 aggregate 的策略状态必须分别维护，切换一方不能改变另一方的
   策略或窗口。
2. `threshold` 的单位必须严格跟随 `trigger.type`；不能把秒数当成交互次数，
   也不能把 `on_range_over` 当作 Slider 数值范围。
3. `modes` 只影响 temporal zoom-in；aggregate zoom-in 不支持该字段。
4. 与当前策略不匹配的选项不得触发额外渲染或交互行为。
5. 平滑窗口的单位转换必须使用同一套像素/数据域坐标，不能在两个视图中使用
   不同的换算基准。
6. 所有默认值都应在配置归一化阶段确定，渲染层只消费归一化后的配置。
