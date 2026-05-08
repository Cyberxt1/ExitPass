'use client'

import * as React from 'react'
import * as TabsPrimitive from '@radix-ui/react-tabs'

import { cn } from '@/lib/utils'

function Tabs({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn('flex flex-col gap-2', className)}
      {...props}
    />
  )
}

function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        'inline-flex h-auto w-fit items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white p-1.5 text-muted-foreground shadow-sm',
        className,
      )}
      {...props}
    />
  )
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border border-transparent px-3 py-2 text-sm font-medium whitespace-nowrap text-slate-600 transition-all duration-200 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30 focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:border-blue-200 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:shadow-none hover:bg-slate-50 hover:text-slate-900 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 dark:border-white/10 dark:bg-transparent dark:text-[#b8cbe2] dark:data-[state=active]:border-[#234d82] dark:data-[state=active]:bg-[#102645] dark:data-[state=active]:text-[#cfe2ff] dark:hover:bg-white/6 dark:hover:text-white",
        className,
      )}
      {...props}
    />
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn('flex-1 outline-none', className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
