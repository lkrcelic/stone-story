'use client'

import { Badge } from '@/components/ChatBot/ui/badge'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ChatBot/ui/collapsible'
import { cn } from '@/lib/utils'
import type { ToolUIPart } from 'ai'
import { CheckCircleIcon, ChevronDownIcon, CircleIcon, ClockIcon, XCircleIcon } from 'lucide-react'
import type { ComponentProps, ReactNode } from 'react'
import { CodeBlock } from './code-block'

export type ToolProps = ComponentProps<typeof Collapsible>

export const Tool = ({ className, ...props }: ToolProps) => (
  <Collapsible
    className={cn('not-prose mb-4 w-full overflow-hidden rounded-md border', className)}
    {...props}
  />
)

export type ToolHeaderProps = {
  className?: string
  type: string
  state: ToolUIPart['state']
}

const getStatusBadge = (status: ToolUIPart['state']) => {
  const labels = {
    'input-streaming': 'Pending',
    'input-available': 'Running',
    'output-available': 'Completed',
    'output-error': 'Error',
  } as const

  const icons = {
    'input-streaming': <CircleIcon className="size-4" />,
    'input-available': <ClockIcon className="size-4 animate-pulse" />,
    'output-available': <CheckCircleIcon className="size-4 text-green-600" />,
    'output-error': <XCircleIcon className="size-4 text-red-600" />,
  } as const

  return (
    <Badge className="flex items-center gap-1 rounded-full text-xs" variant="secondary">
      {icons[status]}
      <span>{labels[status]}</span>
    </Badge>
  )
}

export const ToolHeader = ({ className, type, state, ...props }: ToolHeaderProps) => (
  <CollapsibleTrigger
    className={cn('flex w-full min-w-0 items-center justify-between gap-2 p-3', className)}
    {...props}
  >
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <span className="truncate font-medium text-sm">{type}</span>
    </div>
    <div className="flex shrink-0 items-center gap-2">
      <ChevronDownIcon className="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
    </div>
  </CollapsibleTrigger>
)

export type ToolContentProps = ComponentProps<typeof CollapsibleContent>

export const ToolContent = ({ className, ...props }: ToolContentProps) => (
  <CollapsibleContent
    className={cn(
      'overflow-hidden data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 text-popover-foreground outline-hidden data-[state=closed]:animate-out data-[state=open]:animate-in',
      className,
    )}
    {...props}
  />
)

export type ToolInputProps = ComponentProps<'div'> & {
  input: ToolUIPart['input']
}

export const ToolInput = ({ className, input, ...props }: ToolInputProps) => (
  <div className={cn('space-y-2 overflow-hidden p-4', className)} {...props}>
    <h4 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
      Parameters
    </h4>
    <div className="rounded-md bg-muted/50">
      <CodeBlock code={JSON.stringify(input, null, 2)} language="json" />
    </div>
  </div>
)

export type ToolOutputProps = ComponentProps<'div'> & {
  output: ReactNode
  errorText: ToolUIPart['errorText']
}

export const ToolOutput = ({ className, output, errorText, ...props }: ToolOutputProps) => {
  if (!(output || errorText)) {
    return null
  }

  return (
    <div className={cn('overflow-hidden p-4', className)} {...props}>
      <div
        className={cn(
          'overflow-hidden rounded-md text-xs [&_table]:w-full',
          errorText ? 'bg-destructive/10 text-destructive' : '',
        )}
      >
        {errorText && <div>{errorText}</div>}
        {output && <div className="overflow-hidden">{output}</div>}
      </div>
    </div>
  )
}
