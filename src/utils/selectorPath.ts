function buildSelectorPath(root: Element, target: Element): string | null {
  if (target === root || !root.contains(target)) return null;

  const segments: string[] = [];
  let current: Element | null = target;

  while (current && current !== root) {
    const parent: Element | null = current.parentElement;
    if (!parent) return null;

    const tag = current.tagName.toLowerCase();
    const siblings = Array.from(parent.children).filter(
      (el: Element) => el.tagName.toLowerCase() === tag,
    );
    const index = siblings.indexOf(current) + 1;
    segments.unshift(`${tag}:nth-of-type(${index})`);

    current = parent;
  }

  const selector = segments.join(' > ');
  const resolved = root.querySelector(selector);
  if (resolved !== target) return null;

  return selector;
}

export default buildSelectorPath;
