# BazaarPlusPlus Site

本上下文定义 BazaarPlusPlus 网站中英雄统计与分析所使用的统一领域语言。

## Language

**Hero Analysis（英雄分析）**:
从已发布的英雄统计数据中得到的排行、趋势、对局和阶段结论；该概念独立于具体页面布局。
_Avoid_: Hero read model, dashboard data

**Hero Metrics Dataset（英雄指标数据集）**:
一组已发布、可用于英雄分析的逐日原始统计数据，并明确哪些日期可用；它不绑定具体 schema 版本或传输格式。
_Avoid_: analyzer-v4 payload, dashboard data

**Analysis Scope（分析范围）**:
一次英雄分析所采用的时间窗口与评分分段组合；它描述哪些数据参与分析，而不是数据如何展示或写入 URL。
_Avoid_: filters, query params

**Dataset Coverage（数据集覆盖）**:
预期日期与实际可用日期之间的关系；缺失日期必须明确呈现，绝不按零值数据处理。
_Avoid_: load count, completeness flag
