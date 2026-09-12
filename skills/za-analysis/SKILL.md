---
name: za-analysis
description: 模型训练与结论 —— 端到端数据分析、模型训练与估计。当用户要「跑回归」「训练 ML/DL 模型」「做横截面收益预测」「因子模型估计」「复现结果」或提到 fixest/modelsummary/sklearn/pytorch、Fama-MacBeth、portfolio sorts 时使用。
whenToUse: 端到端分析、模型训练与估计、结果产出、代码评审。
---

# 模型训练与结论阶段

端到端分析。本 skill 附带三个角色定义，派发时读取并**完整采纳其角色设定**：
- `references/agents/coder.md` — 研究编码者（R/Python/Julia）
- `references/agents/data-engineer.md` — 数据工程师（清洗+图）
- `references/agents/coder-critic.md` — 代码评审者
- 编码标准：`references/domain/coding-standards-r.md`、`references/domain/coding-standards-python.md`

## 工作流

1. **Pre-Code Report（必做）**：先证明读了策略备忘，列出识别/估计策略、关键变量、数据源、估计器、命名映射（paper 名 ↔ code 名），再动代码
2. **数据准备**（若需）：Data-engineer 清洗、处理缺失、生成描述统计与图
3. **主分析**：Coder 实现——载入 → 主规格 → 稳健性 → 出版级输出（表进 `paper/tables/`、图进 `paper/figures/`），产出 `results_summary.md`（所有估计值+SE+关键统计）
4. **代码评审**：coder-critic 跑 12 类清单（策略对齐、sanity check、稳健性充分、结构、console 卫生、可复现、函数、图质量、序列化、注释、错误处理、打磨）
5. **修问题**：Critical/Major 重派 Coder（最多 3 轮）再复审
6. **呈现结果**

## 资产定价/ML-DL 要点
- 同时报统计 + 经济显著性（alpha、Sharpe、certainty-equivalent return）
- 预测回归报 OOS R^2（Campbell-Thompson），基准 Goyal-Welch 历史均值
- Newey-West HAC（重叠期）；价值加权主结果、等权稳健性
- ML/DL 必须文档化：调参协议（walk-forward/nested CV）、特征集、train/valid/test 切分、与线性基准（OLS/elastic-net）对比
- 报告交易成本/换手率/容量；Harvey-Liu-Zhu t≈3.0 数据窥探门槛
- 特征重要性可解释（SHAP/permutation/按经济类别分组）

## 原则
- Reproduce, don't guess；show your work（先描述统计再回归）
- 序列化每个计算对象供下游 writer 用
- Coder 创作、coder-critic 批判，永不跳过
