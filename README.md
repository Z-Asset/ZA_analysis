# Z Research · Analysis Stage

模型训练与结论：端到端分析、模型训练、估计。资产定价 + 机器学习/深度学习研究工作流的一部分。

## 安装

```bash
dsh plugin --profile <你的profile> add zresearch-analysis
```

或从 npm：

```bash
npm install zresearch-analysis
```

## 用法

安装后，在 DSH 会话中按需触发（模型会根据任务自动加载对应 skill）：

- 文献综述：问「帮我做文献综述 / 找相关论文」
- 数据处理：问「帮我找数据 / 评估数据集」
- 模型训练：问「跑回归 / 训练 ML 模型 / 横截面收益预测」
- 写报告：问「写论文 / 起草章节」
- 做 PPT：问「做演讲 PPT / Beamer / job market talk」

## skill 结构

```
skills/zresearch-analysis/
├── SKILL.md              # 主 skill 定义
└── references/           # 角色定义 + 领域校准
    ├── agents/           # worker/critic 角色
    └── domain/           # domain-profile(资产定价+ML/DL)
```

## 领域

面向实证资产定价 + ML/DL：因子模型、横截面收益预测、GMM/SDF、预测回归、机器学习、深度学习。领域校准见 `references/domain/domain-profile.md`。

## License

MIT
