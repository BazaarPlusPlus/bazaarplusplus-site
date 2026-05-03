import type { CardMetric, Locale, RatingTier } from '../shared/lib/metrics';

type PrimaryNavCopy = {
  heroes: string;
  cards: string;
  builds: string;
};

type SecondaryNavCopy = {
  tutorial: string;
  download: string;
  support: string;
};

type PageTitleKey = keyof PrimaryNavCopy | keyof SecondaryNavCopy | 'not-found';

type PageTitleCopy = Record<PageTitleKey, string>;

type ScopeCopy = {
  window: string;
  tier: string;
  hero: string;
  allHero: string;
  tierLabels: Record<RatingTier, string>;
  fullTierLabels: Record<RatingTier, string>;
};

type CommonCopy = {
  liveFeed: string;
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
};

type HeroStatsCopy = {
  eyebrow: string;
  title: string;
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
  };
};

type CardStatsCopy = {
  eyebrowLead: string;
  eyebrowLedgerSuffix: string;
  title: string;
  metricTabs: Record<CardMetric, { label: string; ariaLabel?: string }>;
  cardsInView: string;
  scopeAriaLabel: string;
  loading: string;
  unavailable: string;
  updating: string;
  data: string;
  tableHeaders: {
    card: string;
    hero: string;
    name: string;
    uplift: string;
    ciLower: string;
    ciUpper: string;
    runsWith: string;
    runsWithout: string;
    inclusion: string;
    hero10wTotal: string;
    winRate: string;
    appearances: string;
    wins: string;
  };
};

type BuildStatsCopy = {
  eyebrow: string;
  title: string;
  scopeAriaLabel: string;
  tableAriaLabel: string;
  loading: string;
  unavailable: string;
  noContributor: string;
  tableHeaders: {
    hero: string;
    build: string;
    runs: string;
    goldScore: string;
    rank: string;
    contributor: string;
  };
};

type StatsCopy = {
  heroes: HeroStatsCopy;
  cards: CardStatsCopy;
  builds: BuildStatsCopy;
};

export type DownloadPageCopy = {
  eyebrow: string;
  title: string;
  versionLabel: string;
  versionPending: string;
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
  intro: string;
  primaryActionLabel: string;
  secondaryActionLabel: string;
  featureHeading: string;
  featureIntro: string;
  features: Array<{
    title: string;
    description: string;
    details: string[];
  }>;
  installation: {
    heading: string;
    intro: string;
    requirements: string[];
    steps: Array<{
      title: string;
      description: string;
    }>;
  };
  quickStart: {
    heading: string;
    items: Array<{
      label: string;
      value: string;
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
    liveFeed: '实时数据',
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
      fullTierLabels: {
        all: '全部玩家',
        low: '低分段',
        mid: '中分段',
        high: '高分段',
      },
    },
  },
  primaryNav: {
    heroes: '英雄统计',
    cards: '卡牌统计',
    builds: '终局构筑',
  },
  secondaryNav: {
    tutorial: '教程',
    download: '下载',
    support: '支持',
  },
  pageTitles: {
    heroes: '英雄统计',
    cards: '卡牌统计',
    builds: '终局构筑',
    tutorial: '教程',
    download: '下载',
    support: '支持',
    'not-found': '页面不存在',
  },
  stats: {
    heroes: {
      eyebrow: 'BazaarPlusPlus 数据 · 英雄趋势',
      title: '英雄概览',
      trend: {
        winrateTrend: '胜率趋势',
        titleLead: '英雄',
        titleAccent: '走势',
        inFocus: '当前焦点',
        latest: '最新胜率',
        startedAt: '起始胜率',
        chartAriaLabel: '英雄胜率趋势图',
      },
      snapshot: {
        label: '当前快照',
        noData: '暂无数据',
        titleLead: '英雄',
        titleAccent: '榜单',
      },
      tableHeaders: {
        hero: '英雄',
        winRate: '胜率',
        runs: '局数',
        share: '占比',
        wins10w: '10胜',
        perfect: '完美',
        gold: '黄金',
        silver: '白银',
        bronze: '青铜',
      },
    },
    cards: {
      eyebrowLead: 'BazaarPlusPlus 数据 · ',
      eyebrowLedgerSuffix: '榜单',
      title: '卡牌分析',
      metricTabs: {
        winrate: { label: '胜率' },
        uplift: { label: '提升' },
        inclusion: { label: '登场', ariaLabel: '卡牌登场' },
      },
      cardsInView: '张卡牌符合筛选',
      scopeAriaLabel: '卡牌范围筛选',
      loading: '正在加载卡牌数据',
      unavailable: '卡牌数据暂不可用',
      updating: '正在更新',
      data: '数据',
      tableHeaders: {
        card: '卡牌',
        hero: '英雄',
        name: '名称',
        uplift: '提升',
        ciLower: '置信下限',
        ciUpper: '置信上限',
        runsWith: '携带局数',
        runsWithout: '未携带局数',
        inclusion: '登场',
        hero10wTotal: '英雄10胜总数',
        winRate: '胜率',
        appearances: '出现次数',
        wins: '胜场',
      },
    },
    builds: {
      eyebrow: 'BazaarPlusPlus 数据 · 终局构筑',
      title: '终局构筑',
      scopeAriaLabel: '构筑范围筛选',
      tableAriaLabel: '终局构筑',
      loading: '正在加载构筑数据',
      unavailable: '构筑数据暂不可用',
      noContributor: '未显示贡献者',
      tableHeaders: {
        hero: '英雄',
        build: '构筑',
        runs: '局数',
        goldScore: '评分',
        rank: '排名',
        contributor: '贡献者',
      },
    },
  },
  tutorial: {
    eyebrow: 'BazaarPlusPlus 教程',
    title: 'BazaarPlusPlus 使用教程',
    intro: 'BazaarPlusPlus 是面向《The Bazaar》的 BepInEx 模组，把战斗信息、历史记录、回放和云同步整合进游戏内工作流。',
    primaryActionLabel: '打开下载页',
    secondaryActionLabel: '前往支持',
    featureHeading: '模组主要功能',
    featureIntro: '以下内容根据当前 BazaarPlusPlus 模组仓库整理，重点覆盖玩家安装后会直接用到的能力。',
    features: [
      {
        title: '战斗与提示增强',
        description: '战斗状态条会在底部 HUD 显示逻辑战斗时间、已处理帧数、暂停状态和速度档位。',
        details: [
          '怪物预览默认沿用游戏原生流程，BazaarPlusPlus 会在 tooltip 路径补充上下文。',
          '附魔预览和升级预览可通过设置与热键控制，默认按住 Ctrl 查看附魔，按住 Shift 查看升级预览。',
        ],
      },
      {
        title: '历史记录与回放',
        description: 'Live run 会写入本地 SQLite，HistoryPanel 可浏览 runs、PVP battles、ghost battles 和保存的棋盘快照。',
        details: [
          '在大厅或非战斗界面按 F8 打开 HistoryPanel，Esc 可关闭面板。',
          '条件满足时可以从 HistoryPanel 回放本地 PVP 战斗或 ghost replay。',
        ],
      },
      {
        title: '大厅与个性化设置',
        description: '设置坞集中管理 Game History、Anonymous Mode、Legendary 位置展示、附魔预览、战斗状态条和中文术语模式。',
        details: [
          'Anonymous Mode 可以把本地玩家名替换为 Anonymous。',
          '模组还包含随机英雄池、随机皮肤池、主菜单版本号和终局自动截图等小功能。',
        ],
      },
    ],
    installation: {
      heading: '安装指南',
      intro: '推荐从本站下载页获取最新安装器。手动安装时，请先确认已经安装《The Bazaar》和 BepInEx 5。',
      requirements: [
        '电脑上已经安装并能正常启动《The Bazaar》。',
        '游戏目录中已经安装 BepInEx 5。',
        '安装或更新前建议先退出游戏。',
      ],
      steps: [
        {
          title: '下载最新安装器',
          description: '进入下载页，按系统选择 Windows .exe 或 macOS .dmg。',
        },
        {
          title: '运行安装器',
          description: '关闭游戏后运行安装器。更新时建议先卸载旧版本，再安装新版本。',
        },
        {
          title: '启动游戏生成配置',
          description: '首次启动后，配置文件会写入 BepInEx/config/BazaarPlusPlus.cfg。',
        },
        {
          title: '确认模组生效',
          description: '主菜单会显示 BazaarPlusPlus 版本号；进入设置可看到 BazaarPlusPlus 设置入口。',
        },
        {
          title: '手动安装选项',
          description: '如果不用安装器，请把 BazaarPlusPlus.dll 和 SQLite 运行时依赖复制到游戏的 BepInEx/plugins/ 目录。',
        },
      ],
    },
    quickStart: {
      heading: '常用入口',
      items: [
        { label: 'F8', value: '在大厅或非战斗 UI 打开 HistoryPanel。' },
        { label: 'Ctrl', value: '附魔预览未设为始终显示时，按住查看附魔提示。' },
        { label: 'Shift', value: '悬停 tooltip 时按住查看升级预览。' },
        { label: '设置坞', value: '管理战斗状态条、匿名模式、中文术语和其他 BazaarPlusPlus 开关。' },
      ],
    },
  },
  download: {
    eyebrow: '客户端下载',
    title: '下载 BazaarPlusPlus',
    versionLabel: '最新版本',
    versionPending: '正在获取最新版本…',
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
    noteTitle: '安装提示',
    noteParagraphs: [
      '建议先退出游戏再安装。更新时建议先卸载旧版本，再安装新版本。',
      '如果安装后未生效，或被安全软件拦截，可以尝试删除整个 The Bazaar 目录后重新安装。',
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
      description: '在 Ko-fi 上请 BazaarPlusPlus 喝一杯。',
      actionLabel: '前往 Ko-fi',
      regionLabel: '全球',
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
    liveFeed: 'Live feed',
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
      fullTierLabels: {
        all: 'All players',
        low: 'Low rank',
        mid: 'Mid rank',
        high: 'High rank',
      },
    },
  },
  primaryNav: {
    heroes: 'Hero Stats',
    cards: 'Card Stats',
    builds: 'Final Builds',
  },
  secondaryNav: {
    tutorial: 'Tutorial',
    download: 'Download',
    support: 'Support',
  },
  pageTitles: {
    heroes: 'Hero Stats',
    cards: 'Card Stats',
    builds: 'Final Builds',
    tutorial: 'Tutorial',
    download: 'Download',
    support: 'Support',
    'not-found': 'Page Not Found',
  },
  stats: {
    heroes: {
      eyebrow: 'Bazaar Almanac · Hero Currents',
      title: 'Hero overview',
      trend: {
        winrateTrend: 'winrate trend',
        titleLead: 'Hero',
        titleAccent: 'currents',
        inFocus: 'In focus',
        latest: 'Latest',
        startedAt: 'Started at',
        chartAriaLabel: 'Hero winrate chart',
      },
      snapshot: {
        label: 'Snapshot',
        noData: 'No data',
        titleLead: 'Hero',
        titleAccent: 'ledger',
      },
      tableHeaders: {
        hero: 'Hero',
        winRate: 'Win rate',
        runs: 'Runs',
        share: 'Share',
        wins10w: '10W wins',
        perfect: 'Perfect',
        gold: 'Gold',
        silver: 'Silver',
        bronze: 'Bronze',
      },
    },
    cards: {
      eyebrowLead: 'Bazaar Almanac · ',
      eyebrowLedgerSuffix: ' ledger',
      title: 'Card analysis',
      metricTabs: {
        winrate: { label: 'Win rate' },
        uplift: { label: 'Uplift' },
        inclusion: { label: 'Inclusion', ariaLabel: 'Card inclusion' },
      },
      cardsInView: 'cards in view',
      scopeAriaLabel: 'Card scope filters',
      loading: 'Loading card data',
      unavailable: 'Card data unavailable',
      updating: 'Updating',
      data: 'data',
      tableHeaders: {
        card: 'Card',
        hero: 'Hero',
        name: 'Name',
        uplift: 'Uplift',
        ciLower: 'CI lower',
        ciUpper: 'CI upper',
        runsWith: 'Runs with',
        runsWithout: 'Runs without',
        inclusion: 'Inclusion',
        hero10wTotal: 'Hero 10W total',
        winRate: 'Win rate',
        appearances: 'Appearances',
        wins: 'Wins',
      },
    },
    builds: {
      eyebrow: 'Bazaar Almanac · Winning blueprints',
      title: 'Final builds',
      scopeAriaLabel: 'Build scope filters',
      tableAriaLabel: 'Final builds',
      loading: 'Loading build data',
      unavailable: 'Build data unavailable',
      noContributor: 'No contributor',
      tableHeaders: {
        hero: 'Hero',
        build: 'Build',
        runs: 'Runs',
        goldScore: 'Gold score',
        rank: 'Rank',
        contributor: 'Contributor',
      },
    },
  },
  tutorial: {
    eyebrow: 'BazaarPlusPlus Tutorial',
    title: 'BazaarPlusPlus Tutorial',
    intro: 'BazaarPlusPlus is a BepInEx mod for The Bazaar that brings combat information, run history, replay tooling, and background sync into the game.',
    primaryActionLabel: 'Open downloads',
    secondaryActionLabel: 'Support BazaarPlusPlus',
    featureHeading: 'What the mod adds',
    featureIntro: 'This page summarizes the current mod repository so players can understand what changes after installation.',
    features: [
      {
        title: 'Combat UI enhancements',
        description: 'The combat status bar shows logical combat time, processed frames, pause state, and discrete speed multipliers in a bottom HUD.',
        details: [
          'Monster preview keeps the native game flow while BazaarPlusPlus augments tooltip context where needed.',
          'Enchant and upgrade previews are controlled by settings and hotkeys: hold Ctrl for enchant preview and Shift for upgrade preview by default.',
        ],
      },
      {
        title: 'Run history and replays',
        description: 'Live runs are written to local SQLite, and the HistoryPanel browses runs, PvP battles, ghost battles, and saved board snapshots.',
        details: [
          'Press F8 in the lobby or other non-combat UI to open HistoryPanel, then Esc to close it.',
          'When conditions are met, HistoryPanel can replay saved local PvP battles or downloaded ghost replays.',
        ],
      },
      {
        title: 'Lobby and personalization tools',
        description: 'The BazaarPlusPlus settings dock groups Game History, Anonymous Mode, Legendary position display, enchant preview, combat status bar, and Chinese locale controls.',
        details: [
          'Anonymous Mode can replace the local player name with Anonymous.',
          'The mod also includes random hero and skin pools, a main-menu version label, and automatic end-of-run screenshots.',
        ],
      },
    ],
    installation: {
      heading: 'Installation guide',
      intro: 'The easiest path is the installer on this site. For manual installation, make sure BepInEx 5 and The Bazaar are already installed first.',
      requirements: [
        'The Bazaar is installed and launches normally.',
        'BepInEx 5 is installed in the game directory.',
        'The game is closed before installing or updating BazaarPlusPlus.',
      ],
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
          description: 'After the first launch, BazaarPlusPlus writes its config file to BepInEx/config/BazaarPlusPlus.cfg.',
        },
        {
          title: 'Confirm the mod loaded',
          description: 'The main menu shows the BazaarPlusPlus version label, and the settings menu includes BazaarPlusPlus entries.',
        },
        {
          title: 'Manual install option',
          description: 'Without the installer, copy BazaarPlusPlus.dll and the SQLite runtime dependencies into the game BepInEx/plugins/ directory.',
        },
      ],
    },
    quickStart: {
      heading: 'Common controls',
      items: [
        { label: 'F8', value: 'Open HistoryPanel from lobby or other non-combat UI.' },
        { label: 'Ctrl', value: 'Hold for enchant preview when always-show is disabled.' },
        { label: 'Shift', value: 'Hold while hovering a tooltip to enter upgrade preview.' },
        { label: 'Settings dock', value: 'Manage combat status bar, anonymous mode, Chinese locale, and other BazaarPlusPlus toggles.' },
      ],
    },
  },
  download: {
    eyebrow: 'Client downloads',
    title: 'Download BazaarPlusPlus',
    versionLabel: 'Current version',
    versionPending: 'Fetching latest version…',
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
    noteTitle: 'Install notes',
    noteParagraphs: [
      'Quit the game before installing. To update, uninstall the previous build first, then run the new installer.',
      'If the install does not take effect or gets blocked by security software, try deleting the entire The Bazaar directory and reinstalling.',
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
