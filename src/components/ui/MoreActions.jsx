import React from 'react';
import { MoreHorizontal } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from './button';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from './dropdown-menu';

const labels = { en: 'More actions', he: 'עוד פעולות', es: 'Más acciones', fr: 'Autres actions', de: 'Weitere Aktionen', it: 'Altre azioni', pt: 'Mais ações' };

export default function MoreActions({ children, deferActions = false }) {
  const { i18n } = useTranslation();
  const pendingAction = React.useRef(null);
  const trigger = React.useRef(null);
  const label = labels[i18n.language?.split('-')[0]] || labels.en;
  const actions = React.Children.toArray(children).filter(React.isValidElement);
  return <>
    <div className="hidden md:contents">{children}</div>
    <div className="md:hidden">
      <DropdownMenu dir={i18n.dir()}>
        <DropdownMenuTrigger asChild><Button ref={trigger} variant="outline" size="sm"><MoreHorizontal aria-hidden="true" /><span>{label}</span></Button></DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="z-[110] max-w-[calc(100vw-24px)]"
          onCloseAutoFocus={(event) => {
            if (!pendingAction.current) return;
            // Wait for the menu's focus/pointer lock to finish before opening
            // another modal or a native confirmation from a menu action.
            event.preventDefault();
            trigger.current?.focus();
            const run = pendingAction.current;
            pendingAction.current = null;
            run();
          }}>
          {actions.map((action, index) => <DropdownMenuItem key={action.key || index} asChild>
            {React.cloneElement(action, {
              className: 'w-full justify-start whitespace-normal text-start min-h-[44px] bg-transparent text-foreground hover:bg-secondary shadow-none border-0', style: undefined,
              ...(deferActions ? { onClick: (event) => {
                const currentTarget = event.currentTarget;
                pendingAction.current = () => action.props.onClick?.({ ...event, currentTarget });
              } } : {})
            })}
          </DropdownMenuItem>)}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  </>;
}
