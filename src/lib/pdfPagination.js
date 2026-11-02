// Ranges are measured text lines and each section heading with its first line.
// Preserve every source pixel while moving page breaks above those ranges.
export function pdfPageSlices(totalHeight, pageHeight, protectedRanges = []) {
  if (!Number.isFinite(totalHeight) || !Number.isFinite(pageHeight) || !(totalHeight > 0) || !(pageHeight > 0)) throw new Error('Invalid PDF dimensions');
  const ranges = protectedRanges.filter(({ top, bottom }) => Number.isFinite(top) && Number.isFinite(bottom) && bottom > top && bottom - top <= pageHeight);
  const pages = [];
  for (let top = 0; top < totalHeight;) {
    let bottom = Math.min(top + pageHeight, totalHeight);
    if (bottom < totalHeight) {
      for (;;) {
        const crossing = ranges.filter((range) => range.top < bottom && range.bottom > bottom && range.top > top);
        if (!crossing.length) break;
        bottom = Math.min(...crossing.map((range) => range.top));
      }
    }
    pages.push({ top, height: bottom - top });
    top = bottom;
  }
  return pages;
}

export function measurePdfProtectedRanges(container) {
  const origin = container.getBoundingClientRect().top;
  const lines = [];
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (!node.textContent.trim()) continue;
    const range = document.createRange();
    range.selectNodeContents(node);
    for (const rect of range.getClientRects()) {
      if (rect.width && rect.height) lines.push({ top: rect.top - origin, bottom: rect.bottom - origin });
    }
  }
  const headings = [...container.querySelectorAll('[data-pdf-section]')].map((section) => {
    const box = section.getBoundingClientRect();
    const heading = section.querySelector('[data-pdf-heading]').getBoundingClientRect();
    const firstLine = lines.filter((line) => line.top >= heading.bottom - origin && line.bottom <= box.bottom - origin).sort((a, b) => a.top - b.top)[0];
    return { top: box.top - origin, bottom: firstLine?.bottom ?? heading.bottom - origin };
  });
  const sections = [...container.querySelectorAll('[data-pdf-section]')];
  const footer = container.querySelector('[data-pdf-footer]');
  if (sections.length && footer) {
    headings.push({ top: sections.at(-1).getBoundingClientRect().top - origin, bottom: footer.getBoundingClientRect().bottom - origin });
  }
  return [...lines, ...headings];
}
