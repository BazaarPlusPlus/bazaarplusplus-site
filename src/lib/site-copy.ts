import type { Locale } from './metrics';

export type PrimaryNavCopy = {
  heroes: string;
  cards: string;
  builds: string;
};

export type SecondaryNavCopy = {
  download: string;
  support: string;
};

export type PageTitleKey = keyof PrimaryNavCopy | keyof SecondaryNavCopy | 'not-found';

export type PageTitleCopy = Record<PageTitleKey, string>;

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
    modalTitle: string;
    modalSubtitle: string;
    modalHint: string;
  };
  kofi: {
    title: string;
    description: string;
    actionLabel: string;
  };
  supporters: {
    heading: string;
    intro: string;
    unnamedNote: string;
    emptyNote: string;
    errorNote: string;
  };
};

export type LocalizedSiteCopy = {
  primaryNav: PrimaryNavCopy;
  nav: SecondaryNavCopy;
  pageTitles: PageTitleCopy;
  download: DownloadPageCopy;
  support: SupportPageCopy;
};

const zh: LocalizedSiteCopy = {
  primaryNav: {
    heroes: '英雄数据',
    cards: '卡牌数据',
    builds: '终局构筑',
  },
  nav: {
    download: '下载',
    support: '赞助',
  },
  pageTitles: {
    heroes: '英雄数据',
    cards: '卡牌数据',
    builds: '终局构筑',
    download: '下载',
    support: '赞助',
    'not-found': '页面不存在',
  },
  download: {
    eyebrow: '客户端下载',
    title: 'Download BazaarPlusPlus',
    versionLabel: '当前版本',
    versionPending: '正在获取版本…',
    versionFailed: '暂时拉不到最新版本',
    releaseFallbackPrefix: '可以先去 ',
    releaseFallbackLink: 'GitHub Release',
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
      '建议在关闭游戏后再安装。更新时推荐先卸载旧版本,再安装新版本',
      '若安装后未生效或被安全软件拦截,可尝试删除整个 The Bazaar 目录后重新安装',
    ],
  },
  support: {
    eyebrow: '项目赞助',
    title: 'Support BazaarPlusPlus',
    intro: '你的赞助会变成 Bazaar++ 继续更新的动力',
    closeLabel: '关闭',
    wechat: {
      title: '微信支持',
      description: '微信扫码,请 Bazaar++ 喝一杯',
      actionLabel: '查看二维码',
      modalTitle: '请喝一杯',
      modalSubtitle: '微信扫码支持',
      modalHint: '如果愿意出现在致谢名单里,可以在备注中留下你的 ID',
    },
    kofi: {
      title: 'Ko-fi',
      description: '在 Ko-fi 上请 Bazaar++ 喝一杯',
      actionLabel: '前往 Ko-fi',
    },
    supporters: {
      heading: '致谢',
      intro: '有你的支持,让 Bazaar++ 走得更远',
      unnamedNote: '也感谢所有未署名的支持者',
      emptyNote: '名单还在收集中,稍后再来看看',
      errorNote: '名单暂时拉不下来,稍后再试',
    },
  },
};

const en: LocalizedSiteCopy = {
  primaryNav: {
    heroes: 'Hero Stats',
    cards: 'Card Stats',
    builds: 'Final Builds',
  },
  nav: {
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
      modalTitle: 'Buy Bazaar++ a drink',
      modalSubtitle: 'WeChat Pay',
      modalHint: 'Leave your ID in the payment note if you want to appear in the Supporters list.',
    },
    kofi: {
      title: 'Ko-fi',
      description: 'Buy Bazaar++ a drink on Ko-fi.',
      actionLabel: 'Open Ko-fi',
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
