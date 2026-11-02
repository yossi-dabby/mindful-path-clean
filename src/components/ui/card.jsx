import * as React from "react"

import { cn } from "@/lib/utils"

const Card = React.forwardRef(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    data-ui="card"
    className={cn("botanical-card rounded-[var(--radius-card)] border border-border/60 bg-[hsl(var(--card)/0.94)] text-card-foreground shadow-[var(--shadow-md)] backdrop-blur-[10px]", className)}
    {...props}>{children}</div>
))
Card.displayName = "Card"

const CardHeader = React.forwardRef(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    data-ui="card-header"
    className={cn("flex flex-col space-y-2 p-6", className)}
    {...props}>{children}</div>
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-ui="card-title"
    className={cn("text-[1.0625rem] font-semibold leading-[1.35] tracking-[-0.012em] text-card-foreground", className)}
    {...props} />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-ui="card-description"
    className={cn("text-[0.875rem] font-normal leading-[1.55] text-muted-foreground", className)}
    {...props} />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref}
    data-ui="card-content" className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-ui="card-footer"
    className={cn("flex items-center gap-2 p-6 pt-0", className)}
    {...props} />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
