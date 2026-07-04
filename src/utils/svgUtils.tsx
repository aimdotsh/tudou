import { ComponentType } from 'react';

type SvgComponent = {
  default: ComponentType<any>;
};

const FailedLoadSvg = () => {
  console.log('Failed to load SVG component');
  throw new Error('Failed to load SVG component');
}

export const loadSvgComponent = async (
  stats: Record<string, () => Promise<unknown>>,
  path: string
): Promise<SvgComponent> => {
  try {
    let loadFn = stats[path];
    if (!loadFn) {
      const cleanPath = path.replace(/^\.?\/+/, '');
      const matchedKey = Object.keys(stats).find(k => k.endsWith(cleanPath));
      if (matchedKey) {
        loadFn = stats[matchedKey];
      }
    }
    if (!loadFn) {
      throw new Error(`无法找到路径对应的SVG组件：${path}`);
    }
    const module = await loadFn();
    return { default: module as ComponentType<any> };
  } catch (error) {
    console.error(error);
    return { default: FailedLoadSvg };
  }
};