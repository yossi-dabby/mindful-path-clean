import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";

import { cn } from "@/lib/utils";

const Switch = React.forwardRef(({ className, ...props }, ref) =>
<SwitchPrimitives.Root
  className={cn(
    "peer group relative inline-flex h-12 w-12 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
    className
  )}
  {...props}
  ref={ref}>
    <span aria-hidden="true" className="pointer-events-none absolute inset-x-0.5 top-3 h-6 rounded-full bg-input shadow-sm transition-colors group-data-[state=checked]:bg-primary" />
    <SwitchPrimitives.Thumb className="absolute left-1 top-3.5 bg-card rounded-full pointer-events-none block h-5 w-5 shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0" />


  
  </SwitchPrimitives.Root>
);
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };