// Keep selection, initial load and refresh on the same established palette.
export const APPEARANCE_PALETTES = {
  default: { primary: '104 176 162', secondary: '142 189 179', accent: '238 181 92' },
  ocean: { primary: '91 161 170', secondary: '121 177 184', accent: '238 181 92' },
  sunset: { primary: '169 149 118', secondary: '197 170 136', accent: '236 174 92' },
  forest: { primary: '95 154 132', secondary: '126 173 152', accent: '230 176 88' },
  lavender: { primary: '137 146 180', secondary: '164 171 198', accent: '235 183 104' },
  minimal: { primary: '104 124 128', secondary: '145 158 160', accent: '226 176 94' }
};
export function applyAppearancePalette(id) {
  const paletteId = Object.prototype.hasOwnProperty.call(APPEARANCE_PALETTES,id) ? id : 'default';
  document.documentElement.dataset.appearance = paletteId;
  const colors = APPEARANCE_PALETTES[paletteId];
  for (const [name,value] of Object.entries(colors)) document.documentElement.style.setProperty('--color-' + name,value);
}
