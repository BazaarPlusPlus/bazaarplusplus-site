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
  | 'preview-release'
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

type StatsCopy = {
  heroes: HeroStatsCopy;
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
  preview: {
    eyebrow: string;
    title: string;
    versionLabel: string;
    cautionTitle: string;
    cautionBody: string;
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

type PreviewReleaseFeatureIcon =
  | 'almanac'
  | 'enchant'
  | 'compact'
  | 'icons'
  | 'record'
  | 'installer';

export type PreviewReleasePageCopy = {
  hero: {
    titleLead: string;
    titleAccent: string;
    date: string;
    releaseType: string;
    deck: string;
    primaryActionLabel: string;
    secondaryActionLabel: string;
  };
  notes: {
    kicker: string;
    title: string;
    intro: string;
  };
  featureSectionTitle: string;
  features: Array<{
    icon: PreviewReleaseFeatureIcon;
    title: string;
    description: string;
  }>;
  interfaceSection: {
    title: string;
    itemTitle: string;
    itemDescription: string;
  };
  previewSection: {
    title: string;
    items: Array<{
      title: string;
      body: string;
    }>;
  };
  downloadCallout: {
    title: string;
    body: string;
    urlText: string;
    actionLabel: string;
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
  releasePreview: PreviewReleasePageCopy;
  support: SupportPageCopy;
};

const zh: LocalizedSiteCopy = {
  common: {
    brand: {
      name: 'BazaarPlusPlus',
      subtitle: 'Bazaar Almanac',
    },
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
    },
  },
  primaryNav: {
    heroes: '英雄统计',
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
    'preview-release': 'Preview 更新公告',
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
      title: '下载 BazaarPlusPlus 4.0.0 Preview',
      versionLabel: '预览版本',
      cautionTitle: 'Caution',
      cautionBody:
        '预览版尚未经过完整测试，存在已知或未知风险：可能导致游戏卡顿、闪退、存档异常或与游戏更新不兼容。请仅在了解风险的情况下谨慎更新。',
    },
    noteTitle: '安装提示',
    noteParagraphs: [
      '建议先退出游戏再安装。更新时建议先卸载旧版本，再安装新版本',
      '如果安装后未生效，或被安全软件拦截，可以参考故障排查说明，或重新安装游戏与 BazaarPlusPlus',
    ],
  },
  releasePreview: {
    hero: {
      titleLead: 'BazaarPlusPlus Preview',
      titleAccent: '更新公告',
      date: '2026.06 Preview',
      releaseType: '预览版本',
      deck:
        '这一版把更多信息带到你真正需要它的地方：卡牌图鉴上线，附魔展示更聪明，战斗状态与图标细节重新打磨，并加入单场战斗录制能力。',
      primaryActionLabel: '下载 Preview',
      secondaryActionLabel: '查看更新内容',
    },
    notes: {
      kicker: 'Patch Notes',
      title: '更新内容',
      intro:
        '本次 Preview 聚焦在图鉴、提示、战斗复盘和安装体验。它会比正式版更早开放新功能，也意味着需要你对预览版本的风险有清晰预期。',
    },
    featureSectionTitle: '功能更新',
    features: [
      {
        icon: 'almanac',
        title: '卡牌图鉴',
        description:
          '新增卡牌图鉴入口，集中查看物品、技能与相关筛选信息，方便在对局间快速查找卡牌、理解构筑组件与效果来源。',
      },
      {
        icon: 'enchant',
        title: '智能的附魔展示',
        description:
          '附魔提示会更主动地理解当前物品和效果，展示附魔后的关键变化，让你在比较不同选择时少做猜测。',
      },
      {
        icon: 'compact',
        title: 'Compact State Bar 展示优化',
        description:
          'Compact State Bar 重新调整信息层级和视觉密度，战斗中的速度、暂停和状态信息更清晰，也更适合复盘时快速扫读。',
      },
      {
        icon: 'icons',
        title: '图标展示效果优化',
        description:
          '多个入口与功能图标统一了尺寸、边缘和可读性，在深色背景、游戏画面和面板叠层中都更稳定。',
      },
      {
        icon: 'record',
        title: '录制一场战斗',
        description:
          '新增单场战斗录制能力，可在合适的战斗节点记录并回放，为复盘、反馈和分享保留更完整的素材。',
      },
    ],
    interfaceSection: {
      title: '界面改进',
      itemTitle: 'Installer UI 革新',
      itemDescription:
        '安装器界面经过重新整理，信息更聚焦，安装、更新和状态确认流程更清晰，整体观感也更贴近当前 BazaarPlusPlus 的视觉体系。',
    },
    previewSection: {
      title: '预览版说明',
      items: [
        {
          title: '如何获取',
          body: '当前发布的是 Preview 版本，需要下载的话请前往 Preview 下载页。',
        },
        {
          title: '自动更新节奏',
          body: '正式版预计周末会推送自动更新；如果希望保持稳妥，可以等待正式版本通过自动更新送达。',
        },
        {
          title: '风险提示',
          body:
            '预览版尚未经过完整测试，存在已知或未知风险：可能导致游戏卡顿、闪退、存档异常或与游戏更新不兼容。请仅在了解风险的情况下谨慎更新。',
        },
      ],
    },
    downloadCallout: {
      title: '获取 Preview 版本',
      body: '当前发布的是 Preview 版本，需要下载的话请前往以下网址。',
      urlText: 'https://bazaarplusplus.com/download/preview',
      actionLabel: '打开下载页',
    },
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
    brand: {
      name: 'BazaarPlusPlus',
      subtitle: 'Bazaar Almanac',
    },
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
    },
  },
  primaryNav: {
    heroes: 'Hero Stats',
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
    'preview-release': 'Preview Release Notes',
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
      title: 'Download BazaarPlusPlus 4.0.0 Preview',
      versionLabel: 'Preview version',
      cautionTitle: 'Caution',
      cautionBody:
        'This preview build has not been fully tested and carries known and unknown risks: it may cause stutters, crashes, save corruption, or incompatibility with future game updates. Update only if you understand the risks.',
    },
    noteTitle: 'Install notes',
    noteParagraphs: [
      'Quit the game before installing. To update, uninstall the previous build first, then run the new installer.',
      'If the install does not take effect or gets blocked by security software, check the troubleshooting notes or reinstall the game and BazaarPlusPlus.',
    ],
  },
  releasePreview: {
    hero: {
      titleLead: 'BazaarPlusPlus Preview',
      titleAccent: 'Release Notes',
      date: '2026.06 Preview',
      releaseType: 'Preview build',
      deck:
        'This build brings more information to the moment you need it: the card almanac arrives, enchantment previews become smarter, combat status and icons are polished, and single-combat recording is now available.',
      primaryActionLabel: 'Download Preview',
      secondaryActionLabel: 'Read the notes',
    },
    notes: {
      kicker: 'Patch Notes',
      title: 'What changed',
      intro:
        'This Preview focuses on card lookup, smarter tooltips, combat review, and the installer experience. It opens new functionality earlier than the stable build, with the usual preview-build risk.',
    },
    featureSectionTitle: 'Feature Updates',
    features: [
      {
        icon: 'almanac',
        title: 'Card Almanac',
        description:
          'A new card almanac entry gathers items, skills, and filters in one place so you can look up cards and understand build components between fights.',
      },
      {
        icon: 'enchant',
        title: 'Smarter Enchantment Display',
        description:
          'Enchantment previews now understand the inspected item and effect more directly, surfacing the key post-enchant changes with less guesswork.',
      },
      {
        icon: 'compact',
        title: 'Compact State Bar Polish',
        description:
          'Compact State Bar hierarchy and density have been tuned so speed, pause, and combat state are clearer during playback and review.',
      },
      {
        icon: 'icons',
        title: 'Icon Rendering Improvements',
        description:
          'Several entry and feature icons now share more consistent sizing, edges, and contrast across dark panels, game scenes, and overlays.',
      },
      {
        icon: 'record',
        title: 'Record One Combat',
        description:
          'A new single-combat recording flow lets you capture and replay a chosen fight, keeping better material for review, reports, and sharing.',
      },
    ],
    interfaceSection: {
      title: 'Interface Updates',
      itemTitle: 'Installer UI Refresh',
      itemDescription:
        'The installer interface has been reorganized around clearer status, install, and update flows, with visuals that better match the current BazaarPlusPlus system.',
    },
    previewSection: {
      title: 'Preview Notes',
      items: [
        {
          title: 'How to get it',
          body: 'This is a Preview release. Download it from the Preview download page.',
        },
        {
          title: 'Auto-update timing',
          body: 'The stable build is expected to roll out through auto-update over the weekend. If you prefer the safer path, wait for the stable update.',
        },
        {
          title: 'Risk notice',
          body:
            'This preview build has not been fully tested and carries known and unknown risks: it may cause stutters, crashes, save corruption, or incompatibility with future game updates. Update only if you understand the risks.',
        },
      ],
    },
    downloadCallout: {
      title: 'Get the Preview build',
      body: 'This release is currently available as a Preview build. Use the following download page.',
      urlText: 'https://bazaarplusplus.com/download/preview',
      actionLabel: 'Open downloads',
    },
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
