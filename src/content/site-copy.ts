import type { CardMetric, Locale, RatingTier } from '../shared/lib/metrics';

type PrimaryNavCopy = {
  heroes: string;
  cards: string;
  builds: string;
};

type SecondaryNavCopy = {
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

type LocalizedSiteCopy = {
  common: CommonCopy;
  primaryNav: PrimaryNavCopy;
  secondaryNav: SecondaryNavCopy;
  pageTitles: PageTitleCopy;
  stats: StatsCopy;
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
      madeWith: '用',
      love: '爱',
      by: '制作：',
    },
    loading: {
      title: '正在加载 Bazaar++ 数据…',
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
    download: '下载',
    support: '支持',
  },
  pageTitles: {
    heroes: '英雄统计',
    cards: '卡牌统计',
    builds: '终局构筑',
    download: '下载',
    support: '支持',
    'not-found': '页面不存在',
  },
  stats: {
    heroes: {
      eyebrow: 'Bazaar++ 数据 · 英雄趋势',
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
      eyebrowLead: 'Bazaar++ 数据 · ',
      eyebrowLedgerSuffix: '榜单',
      title: '卡牌分析',
      metricTabs: {
        winrate: { label: '胜率' },
        uplift: { label: '提升' },
        inclusion: { label: '登场率', ariaLabel: '卡牌登场率' },
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
        inclusion: '登场率',
        hero10wTotal: '英雄10胜总数',
        winRate: '胜率',
        appearances: '出现次数',
        wins: '胜场',
      },
    },
    builds: {
      eyebrow: 'Bazaar++ 数据 · 终局构筑',
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
        goldScore: '黄金评分',
        rank: '排名',
        contributor: '贡献者',
      },
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
    intro: '你的支持会成为 Bazaar++ 持续更新的动力。',
    closeLabel: '关闭',
    wechat: {
      title: '微信赞赏',
      description: '微信扫码，请 Bazaar++ 喝一杯。',
      actionLabel: '查看赞赏码',
      regionLabel: '中国大陆',
      modalTitle: '请喝一杯',
      modalSubtitle: '微信赞赏',
      modalHint: '如果希望出现在支持者名单中，可以在备注里留下你的 ID。',
      qrAriaLabel: '微信赞赏二维码',
    },
    kofi: {
      title: 'Ko-fi',
      description: '在 Ko-fi 上请 Bazaar++ 喝一杯。',
      actionLabel: '前往 Ko-fi',
      regionLabel: '全球',
    },
    supporters: {
      heading: '支持者名单',
      intro: '感谢每一位支持 Bazaar++ 的朋友。',
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
    download: 'Download',
    support: 'Support',
  },
  pageTitles: {
    heroes: 'Hero Stats',
    cards: 'Card Stats',
    builds: 'Final Builds',
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
      description: 'Scan to buy Bazaar++ a drink.',
      actionLabel: 'Show QR code',
      regionLabel: 'CN',
      modalTitle: 'Buy Bazaar++ a drink',
      modalSubtitle: 'WeChat Pay',
      modalHint: 'Leave your ID in the payment note if you want to appear in the Supporters list.',
      qrAriaLabel: 'WeChat Pay QR code',
    },
    kofi: {
      title: 'Ko-fi',
      description: 'Buy Bazaar++ a drink on Ko-fi.',
      actionLabel: 'Open Ko-fi',
      regionLabel: 'Global',
    },
    supporters: {
      heading: 'Roll call',
      intro: 'Thanks for backing Bazaar++. Your support keeps the project moving further',
      unnamedNote: 'And thanks to everyone who supported Bazaar++ without leaving a name',
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
