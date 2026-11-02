import React from 'react';
import { cn } from '@/lib/utils';

const paintings = {
  leaves: { viewBox:'30 80 690 600', clip:'0,0 780,0 780,220 650,430 625,705 0,705' },
  sprout: { viewBox:'640 200 610 520', clip:'690,200 1254,200 1254,730 620,730 620,490 690,390' },
  progress: { viewBox:'20 750 590 350' },
  route: { viewBox:'630 740 605 350' }
};
export default function BotanicalAccent({ variant = 'leaves', className }) {
  const id = 'botanical-' + React.useId().replace(/:/g,'');
  const art = paintings[variant];
  const [x,y,width,height] = art ? art.viewBox.split(' ').map(Number) : [];
  return <span className={cn('botanical-accent',className)} aria-hidden="true" data-art-variant={variant}>
    {art ? <svg viewBox={art.viewBox} preserveAspectRatio="xMidYMid meet" focusable="false" aria-hidden="true">
      <defs><clipPath id={id+'-bounds'} clipPathUnits="userSpaceOnUse"><rect x={x} y={y} width={width} height={height}/></clipPath>{art.clip && <clipPath id={id} clipPathUnits="userSpaceOnUse"><polygon points={art.clip}/></clipPath>}</defs>
      <g clipPath={'url(#'+id+'-bounds)'}><image href="/art/botanical/watercolor-atlas.webp" width="1254" height="1254" clipPath={art.clip ? 'url(#'+id+')' : undefined}/></g>
    </svg> : <img src="/art/botanical/garden-path-v2.webp" alt="" draggable="false" decoding="async"/>}
  </span>;
}
