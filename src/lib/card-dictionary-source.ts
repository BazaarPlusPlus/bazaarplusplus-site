import type { CardDictionary } from './metrics';

export function cardDictionaryHasSizeMetadata(dictionary: CardDictionary): boolean {
  return Object.values(dictionary).some((entry) => typeof entry.size === 'string' && entry.size.length > 0);
}

export function selectPreferredCardDictionary({
  local,
  remote,
}: {
  local?: CardDictionary;
  remote?: CardDictionary;
}): CardDictionary {
  if (remote && (!local || !cardDictionaryHasSizeMetadata(local)) && cardDictionaryHasSizeMetadata(remote)) {
    return remote;
  }

  return local ?? remote ?? {};
}
