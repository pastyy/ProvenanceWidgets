# 第三方源码

此目录保存随本项目一起维护的第三方源码。Savitzky–Golay 已通过
`src/shared/logic/scalability/strategies/smoothing/savgol.js` 接入；用户 API 使用
`method.options.window_size`（默认 `5`）和 `method.options.degree`（默认 `3`），
由适配层转换为上游的 `M` 和 `N`。

## 目录约定

```text
vendor/
  package.json              # 让下方的 .js 默认按 CommonJS 解释
  README.md                 # 来源、下载及接入说明
  js-savgol-filter/          # gorlang/js-savgol-filter 的源码
  jl-array1/                # gorlang/jl-array1 的源码
```

两个源码目录为空时不会被 Git 跟踪；clone 会填充它们。不要在 clone 前向这两个
目录添加占位文件，否则 Git 会拒绝向非空目录 clone。

本项目根目录使用 `"type": "module"`，两个上游仓库使用 `require` 和
`module.exports`。因此保留这里的 `package.json`，让第三方源码使用 CommonJS。
它只是模块作用域声明，不是需要单独执行 `npm install` 的子项目。

## 下载

在本项目根目录运行以下 PowerShell 命令：

```powershell
git clone https://github.com/gorlang/js-savgol-filter.git .\vendor\js-savgol-filter
git clone https://github.com/gorlang/jl-array1.git .\vendor\jl-array1
git -C .\vendor\js-savgol-filter rev-parse HEAD
git -C .\vendor\jl-array1 rev-parse HEAD
```

将最后两条命令输出的完整 commit SHA 填到下面的来源表中，再进行本地修改。

| 源码 | 来源 | 导入 commit | 本地改动 |
| --- | --- | --- | --- |
| js-savgol-filter | https://github.com/gorlang/js-savgol-filter | 3effaa558c0f032b84611f0969bbec2c1add5c7d | 将 jl-array1 引用改为相邻源码的相对路径；算法未修改 |
| jl-array1 | https://github.com/gorlang/jl-array1 | bc81707812d306d1d9dc43d5d7af7febc53cd62c | 尚未修改 |

## 下载后的接入步骤

1. 记录上述两个 commit SHA，并保留上游源码、README、作者信息和许可证信息。
   当前已核查的上游版本在 package.json 中声明 MIT，但未包含独立 LICENSE 文件；
   不要把本项目的 LICENSE 当作上游许可证，也不要自行编造上游版权声明。
   若下载版本包含 LICENSE，一并保留。
2. 确认源码已下载到以上两个目录，且版本信息已记录，再删除这两个 clone 目录
   各自内部的 `.git` 目录。只删除 `vendor/js-savgol-filter/.git` 和
   `vendor/jl-array1/.git`，保留项目根目录的 `.git`。这样源码会由本项目直接
   跟踪，不会成为嵌套仓库或 Git submodule。
3. 不要在两个上游目录里运行 `npm install`。在本项目根目录运行：

   ```powershell
   npm install ml-matrix@^6.8.0
   ```

   将得到的 package.json 和 package-lock.json 改动一并纳入项目。
4. 在 `vendor/js-savgol-filter/js-savgol-filter.js` 中，将：

   ```js
   const {Array1} = require('jl-array1');
   ```

   改为直接引用相邻的 vendored 源码：

   ```js
   const {Array1} = require('../jl-array1/jl-array1.js');
   ```

   此方式不通过上游的 package.json 安装依赖，因此不需要修改它的
   `"jl-array1": "file:../jl-array1"` 声明。在来源表记录这项本地引用调整。
5. 保留 `src/shared/logic/scalability/strategies/smoothing/savgol.js` 作为适配层，
   从中导入 vendored 模块，转换输入输出数组，并调用
   `new SavgolFilter((window_size - 1) / 2, degree - 1)`。
   用户参数 `window_size = 2*M+1`、`degree = N+1`；`degree: 3` 对应二次多项式。
   不要直接从组件调用第三方库。之前的 `window_length` 和 `polyorder` 参数已移除。
6. 沿用上游边界行为：直接保留前 M+1 个、后 M 个原始值，且要求
   window_size 为大于等于 3 的奇数整数，degree 为小于 window_size 的正整数。
   适配层在组合无效或
   窗口超过采样点数时返回原始数据，不调整窗口。库构建会打包 ml-matrix，
   避免浏览器 ESM 中的动态 require。
7. 接入后执行数值与渲染测试，以及类型检查和构建：

   ```powershell
   node --test tests/sliderAggregateSmoothing.test.js tests/sliderAggregateSmoothingRender.test.js tests/sliderTemporalSmoothing.test.js tests/sliderTemporalSmoothingRender.test.js
   npm run verify
   ```

后续更新上游源码时，请重新核对版本、本地相对路径改动、参数约束及边界行为。
