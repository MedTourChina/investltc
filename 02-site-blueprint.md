# 站点蓝图 v3：入境 / 在岸投资渠道地图

> 配套：[`01-strategy.md`](01-strategy.md) ｜ 范围：钱进中国 + 中国赚的钱在中国投
> 产品 = **准入矩阵 + 渠道数据库 + 对比 + 剧本**，不是媒体。

---

## 1. 设计原则

1. **先方向，后产品。** 首页第一句话必须回答"这是给谁的、钱往哪个方向"。
2. **矩阵是入口，渠道页是深度。** 用户先看"我能不能"，再点进"怎么办"。
3. **四种状态，包括"未验证"。** ✅ / ⚠️ / ❌ / ❓。
4. **只比摩擦，不比收益。**
5. **每条记录可追溯**：日期、城市、验证方式、来源。
6. **无登录、无追踪、无付费墙。**

---

## 2. 信息架构

```
/                        首页：方向声明 + 矩阵预览 + 三步
/matrix                  准入矩阵（核心页，可按身份/资金来源筛选）
/check                   准入筛选（本地计算，可分享）
/channels/               渠道库
  /channels/{slug}/
/compare/                对比（?ids=a,b,c）
/playbooks/              开户剧本
  /playbooks/a-shares/
  /playbooks/bank-wealth/
  /playbooks/funds/
  /playbooks/inbound-funding/   钱怎么进来（经常项目 vs 资本项目）
/explainers/             概念解释
  /explainers/capital-vs-current-account/
  /explainers/usd-50k-quota/
  /explainers/nra-account/
  /explainers/qualified-investor/
  /explainers/withholding-tax/
/field-notes/            实测记录
/methodology/            口径、验证 SOP、利益冲突
/updates/                变更日志
/data/                   开源数据集 + GitHub
/about/
/legal/
```

导航：**Matrix ｜ Channels ｜ Playbooks ｜ Explainers ｜ Methodology**

---

## 3. 数据模型

```ts
type InvestorType = "non-resident-individual" | "resident-foreign-individual"
                  | "offshore-institution" | "onshore-fie";

type FundSource = "offshore-fx" | "offshore-cnh" | "onshore-rmb-income" | "onshore-rmb-asset-sale";

type AccessStatus = "open" | "conditional" | "closed" | "unknown";

type Channel = {
  id: string;                        // "a-share-account"
  name: string; nameZh: string;
  type: "bank" | "deposit" | "wealth-product" | "fund" | "equity" | "bond"
      | "reit" | "private-fund" | "insurance" | "gold" | "inbound-route";
  operator?: string;                 // 具体机构（渠道页才有）

  access: {
    investorType: InvestorType;
    status: AccessStatus;
    fundSources: FundSource[];
    conditions: string[];            // "需居留许可"、"需工作证明"、"需柜台风险评估"
    denialReasons?: string[];        // 常见被拒原因
  }[];

  minimums: { amount?: number; currency: string; note?: string };
  fees: { label: string; amount: string; note?: string }[];
  quota?: { label: string; amount?: string; note?: string };   // 5万美元、合格投资者门槛
  liquidity: { settlement: string; notes?: string };
  taxNote?: string;                  // 只提示，不判断
  friction: { documents: number; inPerson: number; language: number;
              minimum: number; exit: number };   // 1–5，由函数计算
  lastVerified: string;              // ISO，必填
  verifiedBy: "phone" | "branch" | "official-site" | "app" | "document";
  verifiedCity?: string;
  sources: { label: string; url?: string; date: string }[];
  fieldNotes: string[];
  caveats: string[];
};
```

**构建门禁：**
- `access[]` 至少覆盖 1 个投资者类型；缺 `lastVerified`/`sources` → 失败。
- 同一 `(channel, investorType, fundSource)` 唯一。
- `lastVerified` > 90 天 → "可能过时"；> 180 天 → 移出矩阵默认视图。
- 矩阵页由 `access[]` 自动生成，**不手工维护表格**。

---

## 4. 页面模板

### 4.1 首页

```
H1: Investing in China, if you're not Chinese.
Sub: Which channels a foreigner or foreign institution can actually use — and how money gets in.
Pill: Onshore only. We don't cover offshore accounts or moving money out.

[方向声明] Money in: from abroad → China | Earned in China → invest in China
[矩阵预览] 4 类投资者 × 6 个主要渠道，状态色块
[三步] Tell us who you are → See the matrix → Open the playbook
[最新实测] 2 条 field notes
[声明] No ads, no commissions, no advice. How we verify.
```

### 4.2 `/matrix`（核心）

- 顶部切换：投资者类型（4 个 tab）× 资金来源（4 个 chip）。
- 表格：行=渠道，列=状态；点单元格 → 抽屉显示条件/材料/最后验证。
- 移动端：卡片流，不是横向大表。
- 底部固定："Is this wrong? Tell us — we fix within 7 days."

### 4.3 `/check`

| 输入 | 选项 |
|---|---|
| 你是谁 | 境外个人 / 在华居住外籍个人 / 境外机构 / 境内外资企业 |
| 钱在哪 | 境外外汇 / 境外人民币 / 境内工资 / 境内卖房款 |
| 在华时长 | 不在华 / <6 月 / 6–12 月 / 1–3 年 / 3 年+ |
| 身份 | 工作签 / 学生签 / 家属签 / 永居 / 无 |
| 资金规模 | <5 万 / 5–50 万 / 50–300 万 / 300 万+ |
| 能否到店 | 能 / 只能线上 |
| 中文 | 不会 / 基础 / 流利 |

输出四组：✅ 现在就能开 ｜ ⚠️ 有条件 ｜ ❌ 不行 ｜ ❓ 未验证。每条带一句"为什么"和一个 next step。

**URL 参数编码全部输入**，可分享；无后端、无存储。

### 4.4 `/channels/{slug}`

```
名称 + 类型 + 状态徽章
一句话结论
准入表：投资者类型 × 状态 × 条件
材料清单（可勾选）
流程（线上/网点/耗时）
门槛与费用（含额度）
能投什么 / 流动性 / 税务提示
坑（caveats）+ 实测记录
最后验证 + 方式 + 城市 + 来源
免责 + 纠错
```

### 4.5 `/playbooks/inbound-funding/`（差异化页）

这是"钱进来"的核心剧本：

```
1. 先分清你有哪种钱：境外外汇 / CNH / 境内人民币
2. 个人能走的路：经常项目（5 万美元便利化额度）+ 真实用途；投资属资本项目 → 个人无通用通道
3. 机构能走的路：QFII/RQFII、北向通、CIBM、QFLP、FDI —— 各自门槛与成本
4. 常见误区：分拆汇款、虚假用途、地下钱庄 → 法律后果
5. 如果你只想投在岸：最现实的是"人在境内 + 境内人民币"
6. 如果做不到：替代方案（互认基金、境外上市中概 ETF）——标注"这是境外产品，不在本站范围"
```

**这一页要写得像"劝退指南"**：先把不能做的说清楚，剩下的才可信。

### 4.6 `/explainers/`

每个概念一页，300–600 词，配一张图：

- 经常项目 vs 资本项目
- 5 万美元额度到底管什么（不管什么）
- NRA 账户是什么、谁能开
- 合格投资者认定
- 预提税与申报（只讲规则，不做个案）

---

## 5. 首批渠道（8 个，全部待实测）

| id | 渠道 | 主要投资者 | 关键待验证点 |
|---|---|---|---|
| `bank-account` | 银行结算/NRA 账户 | I1/I2/I4 | 非居民开户材料、NRA 用途限制 |
| `deposit` | 存款/大额存单 | 全部 | 起存、利率、境外个人能否买 |
| `bank-wealth` | 银行理财/结构性存款 | I2/I4 | 风险评估问卷语言、是否对境外个人开放 |
| `public-fund` | 公募基金 | I2 | 代销渠道、外国人能否线上申购 |
| `a-share` | A 股账户 | I2 | 居留许可+工作证明、是否必须到店 |
| `savings-bond` | 储蓄国债 | I2 | 柜面/APP、额度 |
| `northbound` | 北向通 | I1/I3 | 香港券商开户、额度、税务 |
| `qfii` | QFII/RQFII | I3 | 托管、备案、成本（解释页为主） |

**后续（第 2 季度）：** 交易所债券、REITs、私募、保险储蓄、黄金、CIBM、QFLP。

---

## 6. 对比维度（12 项）

适用投资者 ｜ 资金来源 ｜ 准入状态 ｜ 材料数 ｜ 是否到店 ｜ 最低金额 ｜ 主要费用 ｜ 额度限制 ｜ 流动性 ｜ 税务提示 ｜ 中文要求 ｜ 最后验证

**不出现：** 预期收益、历史回报、推荐指数。

---

## 7. 技术栈

**Astro 5 + Tailwind 4 + TS + YAML 数据 → GitHub → Cloudflare Pages**

```
china-inbound-invest/
├─ data/
│  ├─ channels/*.yaml
│  ├─ field-notes/*.yaml
│  └─ schema.ts
├─ src/
│  ├─ pages/{index,matrix,check,compare}.astro
│  ├─ pages/channels/[slug].astro
│  ├─ pages/playbooks/*.astro
│  ├─ pages/explainers/*.astro
│  ├─ lib/eligibility.ts      // 纯函数
│  ├─ lib/friction.ts
│  └─ components/{MatrixTable,StatusBadge,FreshnessBadge,CompareTable,DocChecklist}.astro
└─ tests/eligibility.test.ts
```

| 需求 | 选型 |
|---|---|
| 矩阵 | 构建时从 `access[]` 生成，客户端只做筛选 |
| 筛选 | 纯 TS，URL 参数，无后端 |
| 搜索 | Pagefind |
| 分析 | Cloudflare Web Analytics（无 cookie） |
| 纠错 | GitHub Issue + 邮箱 |
| 数据 | `/data/channels.json`，CC BY 4.0 |

**CI 门禁：** zod 校验 → 必填检查 → 单测（准入 20 例）→ 链接检查（周）→ 部署预览。

---

## 8. 分发

| 渠道 | 做法 |
|---|---|
| Reddit（r/chinaexpats、r/China、r/shanghai） | 回答"外国人能不能买 A 股"类问题，附矩阵链接 |
| 微信 expat 群 | 发"矩阵图 + 一句话结论"卡片 |
| LinkedIn | 发"我们核了 8 个渠道，发现个人入境投资几乎无路"的短报告 |
| 商会 / relocation / 国际学校 | 免费讲座："Foreigners investing in China: what's actually possible" |
| SEO | `can foreigners buy a-shares in china`、`foreigner open brokerage account china`、`invest in china from abroad individual`、`nra account foreigner` |
| Bing | 境内可访问，单独优化 |

---

## 9. 视觉

- 工具书气质：高信息密度、克制留白、状态色明显。
- 墨蓝 `#12304A`、纸白 `#FAF8F3`、绿 `#1F7A4D`、琥珀 `#B45309`、灰 `#6B7280`。
- 数字等宽（JetBrains Mono）；正文 Inter。
- 组件：MatrixTable、StatusBadge、FreshnessBadge、QuotaCallout、RiskCallout（"这条做不到"）、DocChecklist。

---

## 10. 上线与维护

**上线检查**
- [ ] 8 个渠道全字段；矩阵自动生成无手工表
- [ ] 首页首屏写明"只做在岸、不做境外"
- [ ] `/playbooks/inbound-funding` 的"做不到"部分完整
- [ ] 每条记录有日期/城市/来源/免责
- [ ] 360px 可用；无 JS 降级为静态表
- [ ] 律师复核：资本项目表述、税务表述、名誉权、免责

**每月（6–10 小时）**
1. 复验访问量最高的 3–5 个渠道。
2. 处理纠错（7 天 SLA）。
3. 更新 `/updates`。
4. 下架 180 天未复验项。
5. 看分析：哪些矩阵单元格被点最多 → 优先复验。
