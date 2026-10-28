# Widget Scalability API

本文档定义所有 widget 共用的 `scalability` 配置规范，适用于 playground 中的
七种 widget 和 `SuperProvenanceWidget`。现有 SingleSlider 方案作为通用接口的
基础；每个组件都需要 temporal 和 aggregate 两套 scalability 方案。
字段命名和枚举值沿用
`scalability_api.json`；该 JSON 是接口草案，包含注释和伪类型表达式，不能直接
作为严格 JSON 解析。

这是一份开发目标规范，不代表所有组件已经实现全部配置。当前接入情况见文末
开发进度表。各组件的数据含义、策略表现、适用参数和默认值差异，在开发对应
组件时补充；尚未确定的差异不在这里提前定案。

## 总体配置

所有组件的目标接口都使用可选的 `scalability` 配置，共用以下结构：

```ts
type ScalabilityOptions = {
  temporal_view?: TemporalViewScalability;
  aggregate_view?: AggregateViewScalability;
};
```

`SingleSliderScalability` 是通用配置的现有类型别名。其他组件沿用同一基础结构，
在需要时定义组件专属扩展；`SuperProvenanceWidget` 也纳入这一目标接口，
其自身配置作用于跨组件视图，子 widget 的配置作用于各自的视图，具体联动规则
在开发该组件时补充。当前 SuperProvenance 尚未接入 `scalability` 属性。

`temporal_view` 和 `aggregate_view` 彼此独立：

- 可以只配置其中一个视图；未配置的视图使用默认行为。
- 两个视图可以使用不同的 `strategy`。
- `strategy` 非必填；未提供时暂定默认为 `zoom_in`。
- 只有与当前 `strategy` 对应的 `*_options` 生效，其他策略选项应被忽略，
  但可以保留在配置对象中。

### 策略范围与组件差异

- 每个组件的两个视图都需要规划 `clipping`、`zoom_in`、`smoothing` 三种
  基础策略。后续可扩展更多策略，并同步更新接口枚举、选项说明和进度表。
- 共用配置结构不意味着所有组件使用完全相同的算法。例如，Slider 的连续数值、
  选择类 widget 的离散选项、InputText 的文本和 SuperProvenance 的跨组件状态，
  需要各自的数据适配和展示方式。
- 组件差异应在开发时明确，包括缩放维度、裁剪单位、平滑对象、聚合条目、触发
  指标和默认值。尤其不能直接把数值曲线平滑用于类别标签或文本。
- 若某个通用参数不适用，应在该组件的补充说明中写明限制或替代方案；进度表
  保留对应任务并记录决策，不因尚未实现而省略。

### 默认值规则

- JSON 中已经明确给出的默认值优先保留。
- JSON 中出现 `width / k` 但没有定义 `k`；暂定 `k = 10`，因此默认值为
  `width / 10`。
- 完全没有给出默认值的数值型字段，暂定为 `10`。
- `window_options.window_size` 的默认值是条目总数，`window_start` 的默认值
  是 `0`，这两个明确规则优先于通用的数值默认值 `10`。
- 所有计数、阈值和显示窗口大小都应归一化为至少为 `1` 的整数；索引应为非负整数，
  并在实际条目范围内进行边界裁剪。由 `width / 10` 计算出的结果也必须经过
  相同的整数化和下限处理。
- 平滑算法参数遵循 Smoothing 节中的默认值和约束，不套用上述通用数值默认值
  或整数化规则。

## Temporal view

`temporal_view` 控制当前组件的时间/交互历史视图；对 SuperProvenance，则是
跨组件的时间/交互历史视图。

```ts
type TemporalViewScalability = {
  strategy?: "zoom_in" | "clipping" | "smoothing";
  zoom_in_options?: TemporalZoomInOptions;
  clipping_options?: ClippingOptions;
  smoothing_options?: SmoothingOptions;
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
  };
};
```

- `modes` 指定放大维度：交互维度 (`interactions`)、值维度 (`values`)，
  或交互与值组成的二维区域 (`interactions-values`)。对 SingleSlider，值维度
  对应 Slider 数值；其他组件的值维度含义和适用模式在开发时补充。
- `modes` 可包含 1～3 个不重复的选项，通用草案默认包含全部三个选项；
  组件若需要限制支持的模式，应明确记录。
- `visibility` 默认 `all-active`；`after-trigger` 表示达到阈值后才启用缩放工具，
  `off` 表示始终关闭缩放工具。
- `trigger.type` 默认 `interaction`。
- `trigger.threshold` 在 `interaction` 下表示交互次数，默认 `50`；在 `time`
  下表示秒数，默认 `3600`。
- `auto_zoom` 表示达到阈值时是否自动放大，默认 `false`。

### Clipping

当 `strategy === "clipping"` 时使用：

```ts
type ClippingOptions = {
  trigger?: {
    type?: "interaction" | "time";
    threshold?: number;
  };
};
```

- `trigger.type` 默认 `interaction`。
- `threshold` 的单位由 `type` 决定；在 `interaction` 下表示交互次数，
  默认 `50`；在 `time` 下表示秒数，默认 `3600`。

### Smoothing

当 `strategy === "smoothing"` 时使用：

```ts
type SmoothingOptions = {
  method?:
    | {
        type: "savgol";
        window_size?: number;
        degree?: number;
      }
    | {
        type: "gaussian";
        sigma?: number;
        truncate?: number;
      }
    | {
        type: "bspline";
        degree?: number;
        smoothing_factor?: number;
        knot_spacing?: number;
      };
  trigger?: {
    type?: "interaction" | "time";
    threshold?: number;
  };
};
```

- `method` 默认为 `{ type: "savgol", window_size: 5, degree: 3 }`。
- Gaussian 和 B-spline 的距离使用 `data_domain`，不提供单位字段；Savgol 的
  `window_size` 使用数值网格采样点单位。阶数、`truncate` 和 `smoothing_factor` 是无量纲参数。
- `trigger.type` 默认 `interaction`。
- `trigger.threshold` 在 `interaction` 下默认 `50` 次交互，在 `time` 下默认 `3600` 秒。
- Savitzky-Golay 使用 vendored `js-savgol-filter`，默认 `window_size: 5`、`degree: 3`。
- Gaussian 默认 `sigma: 2`、`truncate: 3`。
- B-spline 默认 `degree: 3`、`smoothing_factor: 0.5`、`knot_spacing: 10`。
- 提供 `method` 对象时，`type` 必填；其余算法参数均可省略，使用上述对应默认值。

| 算法参数 | 含义 | 默认值 | 约束 |
| --- | --- | --- | --- |
| `savgol.window_size` | 完整窗口的采样点数，对应库的 `2*M+1` | `5` | 大于等于 `3` 的奇数整数 |
| `savgol.degree` | 多项式系数个数，对应库的 `N+1`；`3` 表示二次拟合 | `3` | 正整数，且小于 `window_size` |
| `gaussian.sigma` | 标准差，使用数据域单位 | `2` | 正有限数 |
| `gaussian.truncate` | 支持半径是标准差的几倍；实际半径为 `truncate * sigma` | `3` | 正有限数 |
| `bspline.degree` | 样条阶数，`3` 表示三次样条 | `3` | `1` 到 `5` 的整数 |
| `bspline.smoothing_factor` | 归一化平滑强度，值越大越平滑 | `0.5` | `[0, 1]` 中的有限数 |
| `bspline.knot_spacing` | 内部结点之间的距离，使用数据域单位 | `10` | 正有限数 |

- Savitzky-Golay 的 `window_size` 作用于适配后的数值采样网格，内部转换为
  `M = (window_size - 1) / 2`、`N = degree - 1`。不再接受 `window_length`、
  `polyorder` 或直接传入 `M`、`N`。窗口超过采样点数或 `degree >= window_size`
  时保留未平滑数据，不自动调整窗口。前 `(window_size+1)/2` 个和后
  `(window_size-1)/2` 个值沿用原值。Savgol 的 `degree` 是系数个数，
  与 B-spline 中表示最高次数的 `degree` 定义不同。
- `smoothing_factor` 是本 API 的归一化控制参数，不是某个拟合库的原始残差上限；
  Slider 的样条系数曲率惩罚映射见 [SMOOTHING.md](../src/shared/logic/scalability/SMOOTHING.md)。
- 算法数值参数缺失或无效时使用对应默认值；距离参数的小数不得被强制取整。
  默认距离是组件已明确数据域中的初始值，不表示数据域宽度的百分比。
- `interaction` 按已记录的交互事件计数，`time` 按已记录历史的经过秒数计算；
  aggregate 触发器不按不同聚合条目的数量计数。
- 具体平滑的数据对象由组件定义；上述数值方法不能直接解释为对类别或文本
  本身进行平滑，适配方案在该组件开发时补充。

Slider temporal smoothing 使用独立于 aggregate smoothing 的视图适配器：

- SingleSlider 平滑历史中的记录值；RangeSlider 平滑 center 和 span，再重建并裁剪
  为有序的 low/high 端点。
- Gaussian 和 B-spline 在 interaction 模式下的平滑距离使用历史记录顺序单位；
  time 模式下使用经过秒数。Savgol 的 `window_size` 始终按适配后网格的采样点数计。
  非均匀时间历史会先适配到均匀数值网格，再应用所选算法。
- 数值计算与显示最多使用 2049 个采样点，不依赖像素宽度，也不修改原始记录或 provenance。
- 达到 trigger 前保留现有点、连线、tooltip 和历史恢复交互；达到 trigger 后，以带纵向
  recency gradient 的非交互曲线替换这些 marks 和命中区域。
- temporal 与 aggregate smoothing 独立解析；启用其中一个视图不会激活或修改另一个视图。

## Aggregate view

`aggregate_view` 控制当前组件的聚合历史视图。SingleSlider 按数值统计交互
次数；RangeSlider 的聚合平滑统计每个数值被历史区间覆盖的次数。选择类 widget
可按选项聚合。InputText 和 SuperProvenance 的具体聚合条目与统计口径，在开发
对应组件时补充。

```ts
type AggregateViewScalability = {
  strategy?: "zoom_in" | "clipping" | "smoothing";
  zoom_in_options?: AggregateZoomInOptions;
  clipping_options?: AggregateClippingOptions;
  smoothing_options?: SmoothingOptions;
  window_options?: WindowOptions;
};
```

### Aggregate zoom-in

```ts
type AggregateZoomInOptions = {
  trigger?: {
    type?: "interaction" | "time" | "on_range_over";
    threshold?: number;
    tool_visible_before_trigger?: boolean;
    auto_zoom_on_trigger?: boolean;
  };
};
```

- `interaction`：聚合交互次数超过阈值。
- `time`：经过指定时间。
- `on_range_over`：聚合交互次数的统计范围超过阈值，其中 range 定义为
  `max(interactionCount) - min(interactionCount)`，不是 RangeSlider 的数值范围。
- `threshold` 未在 JSON 中给出默认值，暂定为 `10`。
- `tool_visible_before_trigger`、`auto_zoom_on_trigger` 的默认行为与 temporal
  zoom-in 相同，分别为 `true`、`false`。

### Aggregate clipping

```ts
type AggregateClippingOptions = {
  trigger?: {
    type?: "interaction" | "time";
    threshold?: number;
  };
};
```

- `trigger.type` 默认 `interaction`。
- `threshold` 未定义默认值，暂定为 `10`。

### Aggregate smoothing

使用与 temporal view 相同的 `SmoothingOptions` 结构：

- `method` 默认为 `{ type: "savgol", window_size: 5, degree: 3 }`。
- Gaussian 和 B-spline 的距离使用聚合数据域单位；Savgol 的 `window_size` 按网格采样点数计。
  其他参数、约束和默认规则与 Smoothing 节相同。
- `trigger.type` 默认 `interaction`。
- `trigger.threshold` 在 `interaction` 下默认 `50` 次交互，在 `time` 下默认 `3600` 秒。
- Savitzky-Golay 默认 `window_size: 5`、`degree: 3`。
- Gaussian 默认 `sigma: 2`、`truncate: 3`。
- B-spline 默认 `degree: 3`、`smoothing_factor: 0.5`、`knot_spacing: 10`。
- SingleSlider 和 RangeSlider 已实现 `savgol`、`gaussian` 和 `bspline`。达到 trigger
  之前，柱形图及其交互保持不变；达到 trigger 后，平滑曲线替换柱形图及其交互命中区域，
  曲线下方通过横向 linear gradient 延续原柱形图的 recency 颜色编码，并与柱形图共用
  x 轴和计数比例尺；不支持的方法不会静默回退为
  Savitzky-Golay。
- SingleSlider 平滑数值频次，未发生交互的数值按零频次参与拟合；RangeSlider
  平滑历史区间的覆盖次数，而不是分别平滑低、高端点的频次。
- 采样遵循 Slider 数据域和 `step`，不依赖像素宽度，数值计算最多使用 2049 个
  采样点。需要缩减采样网格时对来源区间取平均；Savgol 保留前 `(window_size+1)/2`
  个和后 `(window_size-1)/2` 个原始值。
- Gaussian 在边界对可用核权重重新归一化。B-spline 使用端点重复的样条基和带
  惩罚的最小二乘拟合；`smoothing_factor: 0` 表示不加惩罚，`1` 表示最佳拟合
  直线。过密的结点请求会受采样点数上限限制。
- 详细规则见 [Slider smoothing 语义](../src/shared/logic/scalability/SMOOTHING.md)。

### Window options

```ts
type WindowOptions = {
  window_size?: number;
  window_start?: number;
};
```

`window_options` 位于 `aggregate_view` 下，但不依赖 `aggregate_view.strategy`：
无论聚合视图采用 `zoom_in`、`clipping` 还是 `smoothing`，都可以使用它进行
值窗口分页或滚动。

- `window_size` 是当前窗口显示的条目数。条目可以是数值、选项或其他组件
  定义的聚合条目；SingleSlider 的数值/聚合值只是其中一种例子。
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
5. 平滑距离与采样转换必须遵循组件明确的数据域，不依赖像素宽度；两个视图采用
   不同数据域时，应分别说明含义，不能隐式混用。
6. 所有默认值都应在配置归一化阶段确定，渲染层只消费归一化后的配置。

## 开发进度表

以下覆盖 playground 中的七种 widget 加一个 SuperProvenance 组件，按
“组件 × 视图 × 策略”追踪。目前共 8 × 2 × 3 = 48 项基础策略任务，
每个组件的 temporal 和 aggregate 方案均必须完成；新增策略时增加对应列。
`aggregate_view.window_options` 不属于独立策略，其进度记录在 aggregate 行的
备注中。

状态含义：`待开发` = 尚未接入对应配置；`开发中` = 正在开发；`部分实现` =
已有部分行为，但仍有接口能力未接入；`已实现（待验证）` = 已找到对应接入代码，
尚未完成该项验收；`已验证` = 对应组件、视图和策略已完成验证，需附验证依据。
接口草案、类型声明或共享算法存在，不等于某个 widget 已完成接入。

当前状态根据 2026-10-18 的工作区代码检查填写。Slider aggregate 与 temporal
smoothing 已完成专项数值和 SVG 渲染测试；在浏览器交互与响应式布局验收完成前，仍标记为
“已实现（待验证）”。

| 组件 | 视图 | clipping | zoom_in | smoothing | 备注 / 待补充差异 |
| --- | --- | --- | --- | --- | --- |
| SingleSlider（导出名 `Singleslider`） | temporal | 已验证 | 已实现（待验证） | 已实现（待验证） | clipping 保留最近的交互/时间窗口，并在 footprint 按钮显示隐藏数量。 |
| SingleSlider | aggregate | 已验证 | 待开发 | 已实现（待验证） | clipping 仅使用窗口内记录重建数值频次；window_options 保持独立。 |
| RangeSlider（导出名 `Rangeslider`） | temporal | 已验证 | 已实现（待验证） | 已实现（待验证） | clipping 保留最近的区间历史点；smoothing 保持端点有序。 |
| RangeSlider | aggregate | 已验证 | 待开发 | 已实现（待验证） | clipping 仅使用窗口内区间重建覆盖次数；window_options 保持独立。 |
| CheckboxGroup | temporal | 部分实现 | 部分实现 | 待开发 | clipping 仅支持 interaction 模式的 interaction；现有 zoom_in 仅保留基础 brush，尚未读取 zoom_in_options。 |
| CheckboxGroup | aggregate | 待开发 | 待开发 | 待开发 | 选项 / 多选组合的聚合语义待明确；策略与 window_options 待接入。 |
| RadioGroup | temporal | 部分实现 | 部分实现 | 待开发 | clipping 仅支持 interaction 模式的 interaction；现有 zoom_in 仅保留基础 brush，尚未读取 zoom_in_options。 |
| RadioGroup | aggregate | 待开发 | 待开发 | 待开发 | 按选项聚合；策略与 window_options 待接入。 |
| InputText | temporal | 待开发 | 待开发 | 待开发 | 尚未向 Chart 传递 scalability；文本值的缩放与平滑语义待明确。 |
| InputText | aggregate | 待开发 | 待开发 | 待开发 | 文本聚合口径、策略与 window_options 待开发。 |
| SingleSelectDropdown | temporal | 部分实现 | 部分实现 | 待开发 | clipping 仅支持 interaction 模式的 interaction；现有 zoom_in 仅保留基础 brush，尚未读取 zoom_in_options。 |
| SingleSelectDropdown | aggregate | 待开发 | 待开发 | 待开发 | 按选项聚合；策略与 window_options 待接入。 |
| MultiSelectDropdown | temporal | 部分实现 | 部分实现 | 待开发 | clipping 仅支持 interaction 模式的 interaction；现有 zoom_in 仅保留基础 brush，尚未读取 zoom_in_options。 |
| MultiSelectDropdown | aggregate | 待开发 | 待开发 | 待开发 | 选项 / 多选组合的聚合语义待明确；策略与 window_options 待接入。 |
| SuperProvenanceWidget | temporal | 待开发 | 待开发 | 待开发 | 尚未接入 scalability；跨组件事件、状态及与子 widget 的联动规则待明确。 |
| SuperProvenanceWidget | aggregate | 待开发 | 待开发 | 待开发 | 跨组件聚合口径、策略与 window_options 待开发。 |

当前状态的代码依据：

- Slider 配置传递与 temporal zoom-in：[SingleSlider.js](../src/widgets/SingleSlider.js)、
  [RangeSlider.js](../src/widgets/RangeSlider.js)、[Chart.js](../src/widgets/Chart.js)。
- Slider aggregate 平滑：
  [sliderAggregateSmoothing.js](../src/shared/logic/scalability/views/sliderAggregateSmoothing.js)、
  [SMOOTHING.md](../src/shared/logic/scalability/SMOOTHING.md)、
  [sliderAggregateSmoothing.test.js](../tests/sliderAggregateSmoothing.test.js)。
- Slider temporal 平滑：
  [sliderTemporalSmoothing.js](../src/shared/logic/scalability/views/sliderTemporalSmoothing.js)、
  [SMOOTHING.md](../src/shared/logic/scalability/SMOOTHING.md)、
  [sliderTemporalSmoothing.test.js](../tests/sliderTemporalSmoothing.test.js)。
- 四种选择类 widget 的策略分派与现有限制：
  [selectionTemporal.js](../src/shared/logic/scalability/views/selectionTemporal.js)、
  [CLIPPING.md](../src/shared/logic/scalability/CLIPPING.md)。
- 尚未接入配置的组件：[InputText.js](../src/widgets/InputText.js)、
  [SuperProvenanceWidget.js](../src/widgets/SuperProvenanceWidget.js)。

开发单个组件时，应同步补充该组件的接口差异、更新对应策略状态和备注，并在
标记“已验证”时记录测试或 playground 验收依据。共享能力实现后，仍须逐个
确认组件接入，不能一次性将所有组件标记为完成。
