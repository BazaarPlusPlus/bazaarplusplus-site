import type { Locale, RatingTier } from '../shared/lib/metrics';

type PrimaryNavCopy = {
  heroes: string;
};

type SecondaryNavCopy = {
  tutorial: string;
  download: string;
  support: string;
};

type PageTitleKey =
  | keyof PrimaryNavCopy
  | keyof SecondaryNavCopy
  | 'download-preview'
  | 'not-found';

type PageTitleCopy = Record<PageTitleKey, string>;

type ScopeCopy = {
  window: string;
  tier: string;
  hero: string;
  allHero: string;
  tierLabels: Record<RatingTier, string>;
};

type CommonCopy = {
  brand: {
    name: string;
    subtitle: string;
  };
  filters: string;
  metric: string;
  primaryNavAriaLabel: string;
  secondaryNavAriaLabel: string;
  languageLabel: string;
  homeAriaLabel: string;
  lastSync: string;
  footer: {
    madeWith: string;
    love: string;
    by: string;
  };
  loading: {
    title: string;
    dataLabel: string;
    connectingLabel: string;
    progressAriaLabel: string;
    loadingPrefix: string;
    loadedPrefix: string;
    failedPrefix: string;
  };
  error: {
    eyebrow: string;
    titlePrefix: string;
    titleHighlight: string;
    unknownMessage: string;
    backToHeroes: string;
  };
  notFound: {
    eyebrow: string;
    titlePrefix: string;
    titleHighlight: string;
    backToHeroes: string;
  };
  scope: ScopeCopy;
  noValueLabel: string;
};

type VictoryTierKey = 'perfect' | 'gold' | 'silver' | 'bronze' | 'misfortune';

type HeroStatsCopy = {
  eyebrow: string;
  title: string;
  detailLinkLabel: string;
  detailLinkHelpLabel: string;
  detailLinkHelpTooltip: string;
  trend: {
    winrateTrend: string;
    titleLead: string;
    titleAccent: string;
    inFocus: string;
    latest: string;
    startedAt: string;
    chartAriaLabel: string;
  };
  snapshot: {
    label: string;
    noData: string;
    titleLead: string;
    titleAccent: string;
  };
  tableHeaders: {
    hero: string;
    winRate: string;
    runs: string;
    share: string;
    wins10w: string;
    perfect: string;
    gold: string;
    silver: string;
    bronze: string;
    wilsonLower: string;
    runShare: string;
    avgDays: string;
    p75Days: string;
    overallBattle: string;
    finalBattle: string;
  };
  dossier: {
    label: string;
  };
  battle: {
    title: string;
    overallWinRate: string;
    finalBattleWinRate: string;
    gap: string;
    wilsonLower: string;
  };
  stage: {
    title: string;
    viewFocused: string;
    viewAll: string;
    day_1_3: string;
    day_4_7: string;
    day_8_plus: string;
  };
  victoryProgress: {
    title: string;
    wins_0_3: string;
    wins_4_6: string;
    wins_7_9: string;
    wins_10_plus: string;
  };
  matchups: {
    title: string;
    favorable: string;
    unfavorable: string;
    mirror: string;
    lowSampleTag: string;
    lowSampleDisclosure: string;
    sample: string;
    empty: string;
    minSampleNote: string;
  };
  outcome: {
    title: string;
    histogramTitle: string;
    perfect: string;
    gold: string;
    silver: string;
    bronze: string;
    misfortune: string;
  };
  heroClass: {
    nonCanonicalTag: string;
    nonCanonicalTooltip: string;
    chartExcludedFootnote: string;
  };
  coverage: {
    windowSuffix: string;
    daysLoadedPrefix: string;
    daysLoadedSeparator: string;
    partialNote: string;
    syncedPrefix: string;
    qualityOk: string;
    qualityDegraded: string;
    failRatePrefix: string;
    someDaysUnavailable: string;
    noTrendValue: string;
  };
  dataQuality: {
    bundleFailBanner: string;
    decodeFailBanner: string;
    dismiss: string;
  };
  unavailable: {
    title: string;
    body: string;
  };
  comingSoon: {
    title: string;
    body: string;
  };
  tierEmpty: {
    title: string;
    body: string;
  };
  methodology: {
    triggerLabel: string;
    triggerAriaLabel: string;
    sheetEyebrow: string;
    sheetTitle: string;
    closeLabel: string;
    intro: string;
    rankedByCaption: string;
    formula: {
      wilson: string;
      winRate: string;
      runShare: string;
      tenWinRate: string;
      runDays: string;
    };
    tips: {
      hero: string;
      winRate: string;
      runs: string;
      share: string;
      wins10w: string;
      perfect: string;
      gold: string;
      silver: string;
      bronze: string;
    };
    tierLegend: Record<VictoryTierKey, { label: string; gloss: string }>;
    sections: Record<
      'ranking' | 'battles' | 'outcomes' | 'tiers' | 'tierVsAll' | 'window' | 'quality',
      { title: string; body: string }
    >;
    glossary: Array<{ term: string; definition: string }>;
  };
};

type StatsCopy = {
  heroes: HeroStatsCopy;
};

export type DownloadPageCopy = {
  eyebrow: string;
  title: string;
  versionLabel: string;
  versionPending: string;
  versionUnavailable: string;
  versionFailed: string;
  releaseFallbackPrefix: string;
  releaseFallbackLink: string;
  windows: {
    title: string;
    arch: string;
    actionLabel: string;
  };
  mac: {
    title: string;
    arch: string;
    actionLabel: string;
  };
  preview: {
    eyebrow: string;
    title: string;
    versionLabel: string;
    versionPending: string;
    versionUnavailable: string;
    versionFailed: string;
    cautionTitle: string;
    cautionLead: string;
    cautionItems: string[];
    cautionFeedback: {
      title: string;
      body: string;
      groupLabel: string;
      groupValue: string;
    };
  };
  previewCta: {
    eyebrow: string;
    title: string;
    actionLabel: string;
  };
  noteTitle: string;
  noteParagraphs: string[];
};

export type SupportPageCopy = {
  eyebrow: string;
  title: string;
  intro: string;
  closeLabel: string;
  wechat: {
    title: string;
    description: string;
    actionLabel: string;
    regionLabel: string;
    modalTitle: string;
    modalSubtitle: string;
    modalHint: string;
    qrAriaLabel: string;
  };
  kofi: {
    title: string;
    description: string;
    actionLabel: string;
    regionLabel: string;
  };
  supporters: {
    heading: string;
    intro: string;
    unnamedNote: string;
    emptyNote: string;
    errorNote: string;
  };
};

export type TutorialPageCopy = {
  eyebrow: string;
  title: string;
  primaryActionLabel: string;
  secondaryActionLabel: string;
  featureHeading: string;
  features: Array<{
    title: string;
    description: string;
    details: string[];
  }>;
  installation: {
    heading: string;
    steps: Array<{
      title: string;
      description: string;
    }>;
  };
  quickStart: {
    heading: string;
    groups: Array<{
      title: string;
      description: string;
      note?: string;
      items: Array<{
        bindings: Array<{
          key: string;
          action?: string;
        }>;
        title: string;
        description: string;
      }>;
    }>;
  };
};

type LocalizedSiteCopy = {
  common: CommonCopy;
  primaryNav: PrimaryNavCopy;
  secondaryNav: SecondaryNavCopy;
  pageTitles: PageTitleCopy;
  stats: StatsCopy;
  tutorial: TutorialPageCopy;
  download: DownloadPageCopy;
  support: SupportPageCopy;
};

const zh: LocalizedSiteCopy = {
  common: {
    brand: {
      name: 'BazaarPlusPlus',
      subtitle: 'Bazaar Almanac',
    },
    filters: '筛选',
    metric: '指标',
    primaryNavAriaLabel: '主要导航',
    secondaryNavAriaLabel: '辅助导航',
    languageLabel: '语言',
    homeAriaLabel: 'BazaarPlusPlus 首页',
    lastSync: '最近同步',
    footer: {
      madeWith: 'Made with',
      love: 'love',
      by: 'by',
    },
    loading: {
      title: '正在加载 BazaarPlusPlus 数据…',
      dataLabel: '正在加载数据',
      connectingLabel: '正在连接数据源',
      progressAriaLabel: '数据加载进度',
      loadingPrefix: '正在加载',
      loadedPrefix: '已加载',
      failedPrefix: '加载失败',
    },
    error: {
      eyebrow: '加载失败',
      titlePrefix: '数据暂时',
      titleHighlight: '不可用',
      unknownMessage: '未知错误',
      backToHeroes: '← 返回英雄概览',
    },
    notFound: {
      eyebrow: '页面未找到',
      titlePrefix: '页面',
      titleHighlight: '不存在',
      backToHeroes: '← 返回英雄概览',
    },
    scope: {
      window: '时间窗口',
      tier: '分段',
      hero: '英雄',
      allHero: '全部',
      tierLabels: {
        all: '全部',
        low: '低',
        mid: '中',
        high: '高',
      },
    },
    noValueLabel: '暂无数值',
  },
  primaryNav: {
    heroes: '统计',
  },
  secondaryNav: {
    tutorial: '教程',
    download: '下载',
    support: '支持',
  },
  pageTitles: {
    heroes: '英雄统计',
    tutorial: '教程',
    download: '下载',
    'download-preview': '预览下载',
    support: '支持',
    'not-found': '页面不存在',
  },
  stats: {
    heroes: {
      eyebrow: 'BazaarPlusPlus 数据 · 英雄趋势',
      title: '英雄概览',
      detailLinkLabel: '在 BazaarDB 查看详细统计',
      detailLinkHelpLabel: '了解数据如何同步到 BazaarDB',
      detailLinkHelpTooltip: '了解数据如何同步到 BazaarDB',
      trend: {
        winrateTrend: '10胜率趋势',
        titleLead: '英雄',
        titleAccent: '走势',
        inFocus: '当前焦点',
        latest: '最新10胜率',
        startedAt: '起始10胜率',
        chartAriaLabel: '英雄10胜率趋势图',
      },
      snapshot: {
        label: '当前快照',
        noData: '暂无数据',
        titleLead: '英雄',
        titleAccent: '榜单',
      },
      tableHeaders: {
        hero: '英雄',
        winRate: '10胜率',
        runs: '完成局数',
        share: '占比',
        wins10w: '10胜',
        perfect: '完美',
        gold: '黄金',
        silver: '白银',
        bronze: '青铜',
        wilsonLower: 'Wilson 下界',
        runShare: '局数占比',
        avgDays: '平均天数',
        p75Days: 'P75 天数',
        overallBattle: '对战胜率',
        finalBattle: '终局胜率',
      },
      dossier: {
        label: '英雄档案',
      },
      battle: {
        title: '对战表现',
        overallWinRate: '总体对战胜率',
        finalBattleWinRate: '终局对战胜率',
        gap: '差距',
        wilsonLower: 'Wilson 下界',
      },
      stage: {
        title: '游戏阶段胜率',
        viewFocused: '当前英雄',
        viewAll: '全部英雄',
        day_1_3: '第 1-3 天',
        day_4_7: '第 4-7 天',
        day_8_plus: '第 8 天起',
      },
      victoryProgress: {
        title: '胜场区间胜率',
        wins_0_3: '0-3 胜',
        wins_4_6: '4-6 胜',
        wins_7_9: '7-9 胜',
        wins_10_plus: '10 胜以上',
      },
      matchups: {
        title: '对位克制',
        favorable: '优势对位',
        unfavorable: '劣势对位',
        mirror: '镜像对局',
        lowSampleTag: '样本不足',
        lowSampleDisclosure: '展开样本不足的对位',
        sample: '场',
        empty: '暂无对位数据',
        minSampleNote: '样本不足的对位只显示场次，不计算胜率。',
      },
      outcome: {
        title: '战绩等级分布',
        histogramTitle: '最终胜场分布',
        perfect: '完美',
        gold: '黄金',
        silver: '白银',
        bronze: '青铜',
        misfortune: '厄运',
      },
      heroClass: {
        nonCanonicalTag: '非标准',
        nonCanonicalTooltip: '非标准英雄数据，可能来自特殊对局。',
        chartExcludedFootnote: '非标准英雄不在趋势图中显示。',
      },
      coverage: {
        windowSuffix: ' 窗口',
        daysLoadedPrefix: '已加载 ',
        daysLoadedSeparator: ' / ',
        partialNote: '覆盖不完整',
        syncedPrefix: '同步于 ',
        qualityOk: '数据正常',
        qualityDegraded: '数据质量下降',
        failRatePrefix: '数据包下载失败率 ',
        someDaysUnavailable: '部分日期暂不可用，当前结果只包含已加载日期。',
        noTrendValue: '部分日期没有可计算的趋势点。',
      },
      dataQuality: {
        bundleFailBanner: '数据包下载失败率偏高，部分对局未纳入统计。',
        decodeFailBanner: '数据解码失败率偏高，部分对局未纳入统计。',
        dismiss: '关闭提醒',
      },
      unavailable: {
        title: '快照暂不可用',
        body: '所选窗口内的快照文件加载失败，请稍后刷新重试。',
      },
      comingSoon: {
        title: '数据即将上线',
        body: '统计数据还在准备中，请稍后再来看看。',
      },
      tierEmpty: {
        title: '该分段暂无数据',
        body: '当前窗口内此分段没有记录，试试其他分段。',
      },
      methodology: {
        triggerLabel: '我们如何统计',
        triggerAriaLabel: '查看统计方法说明',
        sheetEyebrow: '方法说明',
        sheetTitle: '我们如何统计',
        closeLabel: '关闭',
        intro: '这里的每个数字都来自真实上传的对局，下面说明每项如何计算。',
        rankedByCaption: '按 Wilson 95% 置信下界排名',
        formula: {
          wilson: 'Wilson 95% 下界(胜场 ÷ 有效对战)',
          winRate: '胜场 ÷ 有效对战',
          runShare: '该英雄局数 ÷ 窗口内全部局数',
          tenWinRate: '10胜局数 ÷ 完成局数',
          runDays: '达成10胜天数 · 平均 / 75分位',
        },
        tips: {
          hero: '按 Wilson 95% 置信下界胜率排名。',
          winRate: '胜场 ÷ 有效对战（不计平局）。',
          runs: '该英雄在此窗口记录到的局数。',
          share: '该英雄占窗口内全部局数的比例。',
          wins10w: '达成 10 胜的局数。',
          perfect: '10 天内拿到 10 胜，占完成局数的比例。',
          gold: '拿到 10 胜，但用了超过 10 天。',
          silver: '7-9 胜。',
          bronze: '4-6 胜。',
        },
        tierLegend: {
          perfect: { label: '完美', gloss: '10 天内 10 胜' },
          gold: { label: '黄金', gloss: '10 胜，超过 10 天' },
          silver: { label: '白银', gloss: '7-9 胜' },
          bronze: { label: '青铜', gloss: '4-6 胜' },
          misfortune: { label: '厄运', gloss: '0-3 胜' },
        },
        sections: {
          ranking: {
            title: '置信度修正排名',
            body: '英雄按胜率的 Wilson 95% 置信下界排名，而不是原始胜率。样本不足时会被往下拉，直到有足够对战支撑，所以靠 3 场幸运胜利的英雄无法登顶。',
          },
          battles: {
            title: '有效对战与终局对战',
            body: '有效对战指分出胜负的一场战斗，平局和未结束的不计，因此胜场 + 负场始终等于有效对战。终局对战是一局中决定结束的最后一战。',
          },
          outcomes: {
            title: '对局结果',
            body: '10胜率是完成局数中打到 10 胜的比例；局数占比是该英雄在窗口内的份额；达成10胜天数展示 10 胜局用了多久，给出平均值与 75 分位（p75，即每 4 局有 3 局在该天数内完成）。',
          },
          tiers: {
            title: '战绩等级',
            body: '每个完成的对局按最终胜场归入一档：完美（10 天内 10 胜）、黄金（10 胜但超过 10 天）、白银（7-9）、青铜（4-6）、厄运（0-3）。五档合起来覆盖全部完成局。',
          },
          tierVsAll: {
            title: '“全部”是独立测量，不是相加',
            body: '“全部”是单独统计的人群，不等于低 + 中 + 高相加。分段未知的对局只计入“全部”，把各档相加会少算。请直接看“全部”这一行。',
          },
          window: {
            title: '时间窗口与缺失的天',
            body: '1 / 3 / 7 天窗口是把每天的计数相加。没有上传的那天是未知，而不是 0，所以 7 天窗口可能只覆盖不到 7 个真实日期。我们不会用 0 填补缺失的天。',
          },
          quality: {
            title: '新鲜度与覆盖',
            body: '“同步”是这份快照的生成时间；覆盖显示窗口实际加载了多少天；上传失败率反映有多少对局数据包未能下载用于分析，超过 5% 会标记为数据质量下降。',
          },
        },
        glossary: [
          { term: '有效对战', definition: '分出胜负的对战，不含平局。' },
          { term: '终局对战', definition: '一局中决定结束的最后一战。' },
          { term: 'Wilson 置信下界', definition: '对比率做置信度修正后的下限；样本越小分数越低。' },
          { term: '10胜局', definition: '打到 10 胜的对局。' },
          { term: '局数占比', definition: '该英雄占窗口内全部局数的比例。' },
          { term: 'p75 达成天数', definition: '每 4 局 10 胜局有 3 局在此天数内完成。' },
        ],
      },
    },
  },
  tutorial: {
    eyebrow: 'BazaarPlusPlus 教程',
    title: 'BazaarPlusPlus 使用教程',
    primaryActionLabel: '打开下载页',
    secondaryActionLabel: '前往支持',
    featureHeading: '模组主要功能',
    features: [
      {
        title: '对局历史',
        description: '打开对局历史，回看对局记录、战斗回放和幽灵对战',
        details: [
          '快速找回刚结束的对局和关键战斗',
          '可查看本地保存的战斗，也能继续打开已下载的回放',
        ],
      },
      {
        title: '匿名模式',
        description: '本地玩家名显示为 Anonymous',
        details: ['截图和录制时隐藏本地名称', '直播或分享画面时保持匿名展示'],
      },
      {
        title: '传奇名次显示',
        description: '支持默认、无人知晓、战力爆表和双显模式',
        details: [
          '可按需要隐藏名次、夸张展示战力，或同时显示名次与分数',
          '切换后会刷新当前可见的传说段位排名文本',
        ],
      },
      {
        title: '附魔与升级预览',
        description: '查看物品时提前看见附魔或升级后的变化，减少临场判断成本',
        details: [
          '附魔预览进行附魔后效果补进物品提示，方便比较不同选择',
          '升级预览适合在选择遭遇，调整构筑时，确认升级后的收益',
        ],
      },
      {
        title: '战斗状态栏',
        description: '在战斗中查看时间、暂停状态和速度控制',
        details: [
          '适合复盘战斗节奏，或在录制时控制播放',
          '速度按钮会在 0.50、0.67 和 1.00 倍之间切换',
        ],
      },
      {
        title: '中文模式',
        description: '按你的常用地区术语显示 BazaarPlusPlus 中文界面',
        details: [
          '支持简体中文、台湾繁体和香港繁体的术语习惯',
          '对局历史、设置和提示文案会一起使用对应风格',
        ],
      },
    ],
    installation: {
      heading: '安装指南',
      steps: [
        {
          title: '下载最新安装器',
          description: '进入下载页，按系统选择 Windows .exe 或 macOS .dmg',
        },
        {
          title: '运行安装器',
          description: '关闭游戏后运行安装器。更新时建议先卸载旧版本，再安装新版本',
        },
        {
          title: '启动游戏完成初始化',
          description: '安装完成后启动游戏一次，让 BazaarPlusPlus 完成初始化',
        },
        {
          title: '确认模组生效',
          description: '主菜单设置按钮上方会出现 BazaarPlusPlus dock；下方游戏版本信息会显示 BPP version',
        },
      ],
    },
    quickStart: {
      heading: '常用键位',
      groups: [
        {
          title: '快捷入口',
          description: '打开面板或进入阵容视图',
          items: [
            {
              bindings: [{ key: 'F8' }],
              title: '历史记录',
              description: '打开对局历史，回看对局记录、战斗回放和幽灵对战',
            },
            {
              bindings: [
                { key: 'Caps Lock', action: '打开' },
                { key: 'A / D', action: '切换视图' },
                { key: 'W / S', action: '切换阵容' },
              ],
              title: '十胜阵容',
              description: '对比当前卡组与十胜阵容',
            },
          ],
        },
        {
          title: '按住预览',
          description: '查看物品提示时临时展开额外信息',
          note: '在游戏“设置” -> “游玩设置”中重绑 Ctrl / Shift 预览键位',
          items: [
            {
              bindings: [{ key: 'Ctrl' }],
              title: '附魔预览',
              description: '查看物品附魔后的效果\n未始终显示时按住',
            },
            {
              bindings: [{ key: 'Shift' }],
              title: '升级预览',
              description: '查看升级后的数值变化\n悬停物品时按住',
            },
          ],
        },
      ],
    },
  },
  download: {
    eyebrow: '客户端下载',
    title: '下载 BazaarPlusPlus',
    versionLabel: '最新版本',
    versionPending: '正在获取最新版本…',
    versionUnavailable: '获取失败',
    versionFailed: '暂时无法获取最新版本',
    releaseFallbackPrefix: '可以前往 ',
    releaseFallbackLink: 'GitHub 发布页',
    windows: {
      title: 'Windows',
      arch: 'x64 · Intel / AMD',
      actionLabel: '下载 .exe',
    },
    mac: {
      title: 'macOS',
      arch: 'Apple Silicon · arm64',
      actionLabel: '下载 .dmg',
    },
    preview: {
      eyebrow: '预览版下载',
      title: '下载 BazaarPlusPlus Preview',
      versionLabel: '预览版本',
      versionPending: '正在获取 Preview 版本...',
      versionUnavailable: 'Preview 获取失败',
      versionFailed: '暂时无法获取 Preview 版本，请稍后重试。',
      cautionTitle: 'Preview 风险提示',
      cautionLead:
        'Preview 版本包含尚未完全验证的新改动，适合愿意提前试用并反馈问题的用户。',
      cautionItems: [
        '游戏稳定性可能受到影响',
        '可能与游戏更新内容不兼容',
        '稳定性优先的用户建议等待正式版',
      ],
      cautionFeedback: {
        title: '预览反馈',
        body: '如果遇到问题，欢迎加入预览版 QQ 群反馈。',
        groupLabel: 'QQ群',
        groupValue: '672424871',
      },
    },
    previewCta: {
      eyebrow: 'Preview',
      title: '想先体验预览版？',
      actionLabel: '打开 Preview 下载页',
    },
    noteTitle: '安装提示',
    noteParagraphs: [
      '建议先退出游戏再安装。更新时建议先卸载旧版本，再安装新版本',
      '如果安装后未生效，或被安全软件拦截，可以参考故障排查说明，或重新安装游戏与 BazaarPlusPlus',
    ],
  },
  support: {
    eyebrow: '支持项目',
    title: '支持 BazaarPlusPlus',
    intro: '你的支持会成为 BazaarPlusPlus 持续更新的动力。',
    closeLabel: '关闭',
    wechat: {
      title: '微信赞赏',
      description: '微信扫码，请 BazaarPlusPlus 喝一杯。',
      actionLabel: '查看赞赏码',
      regionLabel: '中国大陆',
      modalTitle: '请喝一杯',
      modalSubtitle: '微信赞赏',
      modalHint: '如果希望出现在支持者名单中，可以在备注里留下你的 ID。',
      qrAriaLabel: '微信赞赏二维码',
    },
    kofi: {
      title: 'Ko-fi',
      description: 'Buy BazaarPlusPlus a drink on Ko-fi.',
      actionLabel: 'Open Ko-fi',
      regionLabel: 'Global',
    },
    supporters: {
      heading: '支持者名单',
      intro: '感谢每一位支持 BazaarPlusPlus 的朋友。',
      unnamedNote: '也感谢所有未署名的支持者。',
      emptyNote: '支持者名单还在整理中，请稍后再来看看。',
      errorNote: '暂时无法加载支持者名单，请稍后再试。',
    },
  },
};

const en: LocalizedSiteCopy = {
  common: {
    brand: {
      name: 'BazaarPlusPlus',
      subtitle: 'Bazaar Almanac',
    },
    filters: 'Filters',
    metric: 'Metric',
    primaryNavAriaLabel: 'Primary',
    secondaryNavAriaLabel: 'Secondary',
    languageLabel: 'Language',
    homeAriaLabel: 'BazaarPlusPlus home',
    lastSync: 'last sync',
    footer: {
      madeWith: 'Made with',
      love: 'love',
      by: 'by',
    },
    loading: {
      title: 'tallying the bazaar…',
      dataLabel: 'Loading data',
      connectingLabel: 'Connecting',
      progressAriaLabel: 'Data loading progress',
      loadingPrefix: 'Loading',
      loadedPrefix: 'Loaded',
      failedPrefix: 'Failed',
    },
    error: {
      eyebrow: 'A hush falls over the bazaar',
      titlePrefix: 'The ledger is',
      titleHighlight: 'silent',
      unknownMessage: 'Unknown error',
      backToHeroes: '← Back to hero overview',
    },
    notFound: {
      eyebrow: 'Off the bazaar map',
      titlePrefix: 'This page is',
      titleHighlight: 'unwritten',
      backToHeroes: '← Back to hero overview',
    },
    scope: {
      window: 'Window',
      tier: 'Tier',
      hero: 'Hero',
      allHero: 'All',
      tierLabels: {
        all: 'All',
        low: 'Low',
        mid: 'Mid',
        high: 'High',
      },
    },
    noValueLabel: 'No value',
  },
  primaryNav: {
    heroes: 'Stats',
  },
  secondaryNav: {
    tutorial: 'Tutorial',
    download: 'Download',
    support: 'Support',
  },
  pageTitles: {
    heroes: 'Hero Stats',
    tutorial: 'Tutorial',
    download: 'Download',
    'download-preview': 'Preview Download',
    support: 'Support',
    'not-found': 'Page Not Found',
  },
  stats: {
    heroes: {
      eyebrow: 'Bazaar Almanac · Hero Currents',
      title: 'Hero overview',
      detailLinkLabel: 'View detailed stats on BazaarDB',
      detailLinkHelpLabel: 'Learn how data syncs to BazaarDB',
      detailLinkHelpTooltip: 'Learn how data syncs to BazaarDB',
      trend: {
        winrateTrend: '10W rate trend',
        titleLead: 'Hero',
        titleAccent: 'currents',
        inFocus: 'In focus',
        latest: 'Latest',
        startedAt: 'Started at',
        chartAriaLabel: 'Hero 10-win rate chart',
      },
      snapshot: {
        label: 'Snapshot',
        noData: 'No data',
        titleLead: 'Hero',
        titleAccent: 'ledger',
      },
      tableHeaders: {
        hero: 'Hero',
        winRate: '10W rate',
        runs: 'Runs',
        share: 'Share',
        wins10w: '10W wins',
        perfect: 'Perfect',
        gold: 'Gold',
        silver: 'Silver',
        bronze: 'Bronze',
        wilsonLower: 'Wilson LB',
        runShare: 'Run share',
        avgDays: 'Avg days',
        p75Days: 'P75 days',
        overallBattle: 'Battle WR',
        finalBattle: 'Final WR',
      },
      dossier: {
        label: 'Hero dossier',
      },
      battle: {
        title: 'Battle performance',
        overallWinRate: 'Overall battle WR',
        finalBattleWinRate: 'Final battle WR',
        gap: 'Gap',
        wilsonLower: 'Wilson LB',
      },
      stage: {
        title: 'Win rate by game stage',
        viewFocused: 'Focused hero',
        viewAll: 'All heroes',
        day_1_3: 'Day 1-3',
        day_4_7: 'Day 4-7',
        day_8_plus: 'Day 8+',
      },
      victoryProgress: {
        title: 'Win rate by victory bucket',
        wins_0_3: '0-3 wins',
        wins_4_6: '4-6 wins',
        wins_7_9: '7-9 wins',
        wins_10_plus: '10+ wins',
      },
      matchups: {
        title: 'Matchups',
        favorable: 'Favorable',
        unfavorable: 'Unfavorable',
        mirror: 'Mirror',
        lowSampleTag: 'low sample',
        lowSampleDisclosure: 'Show low-sample matchups',
        sample: 'battles',
        empty: 'No matchup data yet',
        minSampleNote: 'Low-sample matchups show encounters only, without a rate.',
      },
      outcome: {
        title: 'Victory tier distribution',
        histogramTitle: 'Final wins distribution',
        perfect: 'Perfect',
        gold: 'Gold',
        silver: 'Silver',
        bronze: 'Bronze',
        misfortune: 'Misfortune',
      },
      heroClass: {
        nonCanonicalTag: 'Non-standard',
        nonCanonicalTooltip: 'Non-standard hero data, possibly from special runs.',
        chartExcludedFootnote: 'Non-standard heroes are excluded from the trend chart.',
      },
      coverage: {
        windowSuffix: ' window',
        daysLoadedPrefix: '',
        daysLoadedSeparator: ' of ',
        partialNote: 'partial coverage',
        syncedPrefix: 'synced ',
        qualityOk: 'data healthy',
        qualityDegraded: 'data degraded',
        failRatePrefix: 'bundle download failures ',
        someDaysUnavailable: 'Some days are unavailable; this view includes loaded days only.',
        noTrendValue: 'Some days have no calculable trend point.',
      },
      dataQuality: {
        bundleFailBanner: 'Bundle download failures are elevated; some runs are missing from these stats.',
        decodeFailBanner: 'Decode failures are elevated; some runs are missing from these stats.',
        dismiss: 'Dismiss',
      },
      unavailable: {
        title: 'Snapshot unavailable',
        body: 'The snapshot files for this window failed to load. Refresh to try again.',
      },
      comingSoon: {
        title: 'Data coming soon',
        body: 'The stats are still being gathered — check back soon.',
      },
      tierEmpty: {
        title: 'No data in this tier',
        body: 'No runs recorded for this tier in the window. Try another tier.',
      },
      methodology: {
        triggerLabel: 'How we measure this',
        triggerAriaLabel: 'How we measure this',
        sheetEyebrow: 'Methodology',
        sheetTitle: 'How we measure this',
        closeLabel: 'Close',
        intro: 'Every number here comes from real uploaded runs. Here is how each one is calculated.',
        rankedByCaption: 'Ranked by Wilson 95% lower bound',
        formula: {
          wilson: 'Wilson 95% lower bound(wins ÷ decided)',
          winRate: 'wins ÷ decided battles',
          runShare: 'hero runs ÷ all runs in window',
          tenWinRate: '10-win runs ÷ completed runs',
          runDays: 'days to 10 wins · avg / p75',
        },
        tips: {
          hero: 'Ranked by Wilson 95% lower-bound win rate.',
          winRate: 'Wins ÷ decided battles (draws excluded).',
          runs: 'Runs recorded for this hero in the window.',
          share: "This hero's share of all runs in the window.",
          wins10w: 'Runs that reached 10 wins.',
          perfect: '10 wins within 10 days — share of completed runs.',
          gold: '10 wins, but it took more than 10 days.',
          silver: '7-9 wins.',
          bronze: '4-6 wins.',
        },
        tierLegend: {
          perfect: { label: 'Perfect', gloss: '10 wins in 10 days' },
          gold: { label: 'Gold', gloss: '10 wins, over 10 days' },
          silver: { label: 'Silver', gloss: '7-9 wins' },
          bronze: { label: 'Bronze', gloss: '4-6 wins' },
          misfortune: { label: 'Misfortune', gloss: '0-3 wins' },
        },
        sections: {
          ranking: {
            title: 'Confidence-adjusted ranking',
            body: 'Heroes are ranked by the Wilson 95% lower bound of their win rate, not the raw rate. Small samples get pulled down until enough battles confirm the result, so a hero with three lucky wins cannot top the board.',
          },
          battles: {
            title: 'Decided & final battles',
            body: 'A decided battle is one fight with a clear winner — draws and unfinished fights are left out, so wins + losses always equals decided battles. A final battle is the run’s last decisive fight, the one that ends the run.',
          },
          outcomes: {
            title: 'Run outcomes',
            body: '10-win rate is the share of completed runs that reached 10 wins. Run share is a hero’s slice of all runs in the window. Days-to-10W shows how fast 10-win runs got there — the average and the 75th percentile (p75 = 3 of 4 such runs finished within that many days).',
          },
          tiers: {
            title: 'Victory tiers',
            body: 'Each completed run lands in one tier by its final wins: Perfect (10 wins within 10 days), Gold (10 wins, but more than 10 days), Silver (7-9), Bronze (4-6), Misfortune (0-3). The five tiers together cover every completed run.',
          },
          tierVsAll: {
            title: 'All is measured, not summed',
            body: '“All” is its own measured population, not Low + Mid + High added up. Runs with an unknown rating count only toward All, so summing the tiers would undercount. Read the All row directly.',
          },
          window: {
            title: 'Windows & missing days',
            body: 'A 1/3/7-day window adds up each day’s counts. Days with no upload are unknown, not zero — so a 7-day window can cover fewer than 7 actual days. We never fill missing days with zeros.',
          },
          quality: {
            title: 'Freshness & coverage',
            body: '“Synced” is when this snapshot was built. Coverage shows how many days the window actually loaded. The upload-failure rate flags how many run bundles failed to download for analysis; above 5% we mark the data degraded.',
          },
        },
        glossary: [
          { term: 'Decided battle', definition: 'A fight with a clear winner; draws excluded.' },
          { term: 'Final battle', definition: 'The run’s last decisive fight.' },
          {
            term: 'Wilson lower bound',
            definition: 'A confidence-adjusted floor of a rate; smaller samples score lower.',
          },
          { term: '10-win run', definition: 'A run that reached 10 wins.' },
          { term: 'Run share', definition: 'A hero’s portion of all runs in the window.' },
          {
            term: 'p75 days-to-10W',
            definition: '3 of 4 ten-win runs finished within this many days.',
          },
        ],
      },
    },
  },
  tutorial: {
    eyebrow: 'BazaarPlusPlus Tutorial',
    title: 'BazaarPlusPlus Tutorial',
    primaryActionLabel: 'Open downloads',
    secondaryActionLabel: 'Support BazaarPlusPlus',
    featureHeading: 'What the mod adds',
    features: [
      {
        title: 'Run History',
        description: 'Open run history to review saved runs, combat replays, and ghost battles.',
        details: [
          'Return to recent runs and key fights without leaving the game flow.',
          'Saved local battles and downloaded replays can open from history.',
        ],
      },
      {
        title: 'Anonymous Mode',
        description: 'Show the local player name as Anonymous.',
        details: [
          'Hide your local name in screenshots and recordings.',
          'Stay anonymous while streaming or sharing footage.',
        ],
      },
      {
        title: 'Legendary Rank Display',
        description: 'Supports normal, privacy-friendly, high-power, and rank-plus-rating views.',
        details: [
          'Hide the rank, use a high-power display, or show rank and rating together.',
          'Your rank display updates immediately after switching modes.',
        ],
      },
      {
        title: 'Enchant and upgrade previews',
        description: 'Preview how an item changes after enchantment or upgrade before committing to the choice.',
        details: [
          'Enchant previews add post-enchant values and effects to item tooltips for easier comparison.',
          'Upgrade previews help evaluate shop buys, rewards, and build changes before spending resources.',
        ],
      },
      {
        title: 'Combat Controls',
        description: 'Show combat time, pause state, and speed controls during fights.',
        details: [
          'Useful for reviewing combat pacing or controlling playback while recording.',
          'Speed buttons cycle between 0.50x, 0.67x, and 1.00x.',
        ],
      },
      {
        title: 'Chinese Terminology',
        description: 'Display BazaarPlusPlus Chinese UI with the regional terminology you prefer.',
        details: [
          'Supports Mainland, Taiwan, and Hong Kong terminology styles.',
          'History, settings, and item tips follow the selected style.',
        ],
      },
    ],
    installation: {
      heading: 'Installation guide',
      steps: [
        {
          title: 'Download latest installer',
          description: 'Open the downloads page and choose the Windows .exe or macOS .dmg for your system.',
        },
        {
          title: 'Run the installer',
          description: 'Close the game first. For updates, uninstall the old build before installing the new one.',
        },
        {
          title: 'Start the game once',
          description: 'Launch the game once so BazaarPlusPlus can finish setup.',
        },
        {
          title: 'Confirm the mod loaded',
          description:
            'On the main menu, a BazaarPlusPlus dock appears above the Settings button, and the game version text below shows BPP version.',
        },
      ],
    },
    quickStart: {
      heading: 'Common hotkeys',
      groups: [
        {
          title: 'Entry controls',
          description: 'Open panels or move into build preview mode.',
          items: [
            {
              bindings: [{ key: 'F8' }],
              title: 'History',
              description: 'Open recent runs, battles, and board snapshots from the lobby.',
            },
            {
              bindings: [
                { key: 'Caps Lock', action: 'Open' },
                { key: 'A / D', action: 'Switch view' },
                { key: 'W / S', action: 'Switch build' },
              ],
              title: 'Ten-Win Build',
              description: 'Compare current set with Ten-Win builds.',
            },
          ],
        },
        {
          title: 'Preview holds',
          description: 'Temporarily expand item tooltip details while inspecting items.',
          note: 'Rebind Ctrl / Shift preview hotkeys in Settings -> Gameplay Settings.',
          items: [
            {
              bindings: [{ key: 'Ctrl' }],
              title: 'Enchant preview',
              description: 'Hold when always-show is off to reveal enchant changes on items.',
            },
            {
              bindings: [{ key: 'Shift' }],
              title: 'Upgrade preview',
              description: 'Hold while checking an item to preview upgraded stats and effects.',
            },
          ],
        },
      ],
    },
  },
  download: {
    eyebrow: 'Client downloads',
    title: 'Download BazaarPlusPlus',
    versionLabel: 'Current version',
    versionPending: 'Fetching latest version…',
    versionUnavailable: 'Unavailable',
    versionFailed: 'Cannot reach the latest version right now',
    releaseFallbackPrefix: 'Try ',
    releaseFallbackLink: 'GitHub Release',
    windows: {
      title: 'Windows',
      arch: 'x64 · Intel / AMD',
      actionLabel: 'Download .exe',
    },
    mac: {
      title: 'macOS',
      arch: 'Apple Silicon · arm64',
      actionLabel: 'Download .dmg',
    },
    preview: {
      eyebrow: 'Preview downloads',
      title: 'Download BazaarPlusPlus Preview',
      versionLabel: 'Preview version',
      versionPending: 'Fetching Preview version...',
      versionUnavailable: 'Preview unavailable',
      versionFailed: 'Cannot reach the Preview version right now. Please try again later.',
      cautionTitle: 'Preview Risk Notice',
      cautionLead:
        'Preview builds include changes that have not been fully verified yet, and are intended for users who want to try updates early and report issues.',
      cautionItems: [
        'Game stability may be affected.',
        'This build may be incompatible with game updates.',
        'If stability matters most, wait for the stable release.',
      ],
      cautionFeedback: {
        title: 'Preview Feedback',
        body: 'If you run into issues, join the Preview QQ group and send feedback.',
        groupLabel: 'QQ Group',
        groupValue: '672424871',
      },
    },
    previewCta: {
      eyebrow: 'Preview',
      title: 'Want the preview build?',
      actionLabel: 'Open Preview downloads',
    },
    noteTitle: 'Install notes',
    noteParagraphs: [
      'Quit the game before installing. To update, uninstall the previous build first, then run the new installer.',
      'If the install does not take effect or gets blocked by security software, check the troubleshooting notes or reinstall the game and BazaarPlusPlus.',
    ],
  },
  support: {
    eyebrow: 'Support',
    title: 'Support BazaarPlusPlus',
    intro: 'Your support helps keep BazaarPlusPlus going.',
    closeLabel: 'Close',
    wechat: {
      title: 'WeChat Pay',
      description: 'Scan to buy BazaarPlusPlus a drink.',
      actionLabel: 'Show QR code',
      regionLabel: 'CN',
      modalTitle: 'Buy BazaarPlusPlus a drink',
      modalSubtitle: 'WeChat Pay',
      modalHint: 'Leave your ID in the payment note if you want to appear in the Supporters list.',
      qrAriaLabel: 'WeChat Pay QR code',
    },
    kofi: {
      title: 'Ko-fi',
      description: 'Buy BazaarPlusPlus a drink on Ko-fi.',
      actionLabel: 'Open Ko-fi',
      regionLabel: 'Global',
    },
    supporters: {
      heading: 'Roll call',
      intro: 'Thanks for backing BazaarPlusPlus. Your support keeps the project moving further',
      unnamedNote: 'And thanks to everyone who supported BazaarPlusPlus without leaving a name',
      emptyNote: 'The roll call is still being gathered — check back soon',
      errorNote: 'Could not load the roll call right now — try again in a moment',
    },
  },
};

const messages: Record<Locale, LocalizedSiteCopy> = { zh, en };

export function getSiteCopy(locale: Locale): LocalizedSiteCopy {
  return messages[locale];
}

export function getPageTitle(page: PageTitleKey, locale: Locale): string {
  return `${messages[locale].pageTitles[page]} | BazaarPlusPlus`;
}

export const KOFI_URL = 'https://ko-fi.com/cauyxy';
export const BAZAARDB_META_URL = 'https://bazaardb.gg/run/meta?utm_source=bazaarplusplus';
export const BAZAARDB_ICON_PATH = '/bazaardb-icon.ico';
export const BAZAARDB_INTEGRATION_DOC_URL =
  'https://bpp-static.bazaarplusplus.com/bazaardb-snapshot-integration.pdf';
