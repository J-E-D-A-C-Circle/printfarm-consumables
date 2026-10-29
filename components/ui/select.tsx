"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from "lucide-react"

interface SelectContextValue {
  value: string
  onValueChange: (val: string) => void
  open: boolean
  setOpen: React.Dispatch<React.SetStateAction<boolean>>
  disabled?: boolean
  itemLabels: Map<string, React.ReactNode>
}

const SelectContext = React.createContext<SelectContextValue | null>(null)

function useSelectContext() {
  const ctx = React.useContext(SelectContext)
  if (!ctx) {
    throw new Error("Select components must be used within a <Select> parent.")
  }
  return ctx
}

function collectSelectItems(
  nodes: React.ReactNode,
  map: Map<string, React.ReactNode>
) {
  React.Children.forEach(nodes, (child) => {
    if (!React.isValidElement(child)) return
    const props = child.props as {
      value?: unknown
      children?: React.ReactNode
    }
    if (typeof props.value === "string") {
      map.set(props.value, props.children)
    }
    if (props.children) {
      collectSelectItems(props.children, map)
    }
  })
}

interface SelectProps {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  disabled?: boolean
  name?: string
  required?: boolean
  children?: React.ReactNode
}

function Select({
  value: controlledValue,
  defaultValue = "",
  onValueChange,
  disabled = false,
  name,
  children,
}: SelectProps) {
  const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue)
  const [open, setOpen] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)

  const isControlled = controlledValue !== undefined
  const currentValue = isControlled ? controlledValue : uncontrolledValue

  const itemLabels = React.useMemo(() => {
    const map = new Map<string, React.ReactNode>()
    collectSelectItems(children, map)
    return map
  }, [children])

  const handleSelect = React.useCallback(
    (nextVal: string) => {
      if (!isControlled) {
        setUncontrolledValue(nextVal)
      }
      onValueChange?.(nextVal)
      setOpen(false)
    },
    [isControlled, onValueChange]
  )

  React.useEffect(() => {
    if (!open) return

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false)
      }
    }

    document.addEventListener("mousedown", handlePointerDown)
    document.addEventListener("touchstart", handlePointerDown)
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("mousedown", handlePointerDown)
      document.removeEventListener("touchstart", handlePointerDown)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [open])

  return (
    <SelectContext.Provider
      value={{
        value: currentValue,
        onValueChange: handleSelect,
        open,
        setOpen,
        disabled,
        itemLabels,
      }}
    >
      <div
        ref={containerRef}
        data-slot="select"
        className={cn("relative", open ? "z-50" : "z-auto")}
      >
        {name ? <input type="hidden" name={name} value={currentValue} /> : null}
        {children}
      </div>
    </SelectContext.Provider>
  )
}

function SelectGroup({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return <div data-slot="select-group" className={cn("space-y-0.5", className)} {...props} />
}

function SelectValue({
  placeholder,
  className,
}: {
  placeholder?: React.ReactNode
  className?: string
}) {
  const { value, itemLabels } = useSelectContext()
  const hasValue = value !== undefined && value !== ""
  const displayNode = hasValue ? (itemLabels.get(value) ?? value) : placeholder

  return (
    <span
      data-slot="select-value"
      className={cn(
        "line-clamp-1 flex items-center gap-2 text-left",
        !hasValue && "text-muted-foreground",
        className
      )}
    >
      {displayNode}
    </span>
  )
}

function SelectTrigger({
  className,
  size = "default",
  children,
  disabled: triggerDisabled,
  onClick,
  ...props
}: React.ComponentProps<"button"> & {
  size?: "sm" | "default"
}) {
  const { open, setOpen, disabled, value } = useSelectContext()
  const isDisabled = disabled || triggerDisabled

  return (
    <button
      type="button"
      role="combobox"
      aria-expanded={open}
      data-slot="select-trigger"
      data-size={size}
      data-state={open ? "open" : "closed"}
      data-placeholder={!value ? "" : undefined}
      disabled={isDisabled}
      onClick={(e) => {
        onClick?.(e)
        if (!isDisabled) {
          setOpen((prev) => !prev)
        }
      }}
      className={cn(
        "flex w-full items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-sm whitespace-nowrap shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 data-[placeholder]:text-muted-foreground data-[size=default]:h-9 data-[size=sm]:h-8 dark:bg-input/30 dark:hover:bg-input/50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground",
        className
      )}
      {...props}
    >
      {children}
      <ChevronDownIcon
        className={cn(
          "size-4 opacity-50 transition-transform duration-150",
          open && "rotate-180"
        )}
      />
    </button>
  )
}

function SelectContent({
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  position?: "item-aligned" | "popper"
  align?: "start" | "center" | "end"
}) {
  const { open } = useSelectContext()

  if (!open) return null

  return (
    <div
      role="listbox"
      data-slot="select-content"
      data-state="open"
      className={cn(
        "absolute left-0 top-[calc(100%+4px)] z-[100] w-full min-w-[11rem] max-h-60 overflow-x-hidden overflow-y-auto rounded-md border border-slate-200 bg-popover p-1 text-popover-foreground shadow-lg",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

function SelectLabel({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="select-label"
      className={cn("px-2 py-1.5 text-xs font-semibold text-muted-foreground", className)}
      {...props}
    />
  )
}

function SelectItem({
  className,
  children,
  value: itemValue,
  disabled = false,
  ...props
}: React.ComponentProps<"div"> & {
  value: string
  disabled?: boolean
}) {
  const { value, onValueChange } = useSelectContext()
  const isSelected = value === itemValue

  return (
    <div
      role="option"
      aria-selected={isSelected}
      data-slot="select-item"
      data-disabled={disabled ? "" : undefined}
      onClick={() => {
        if (!disabled) {
          onValueChange(itemValue)
        }
      }}
      className={cn(
        "relative flex w-full cursor-pointer items-center gap-2 rounded-sm py-1.5 pr-8 pl-2.5 text-sm outline-hidden select-none transition-colors hover:bg-slate-100 focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        isSelected && "bg-dvla-green/10 font-semibold text-dvla-green",
        className
      )}
      {...props}
    >
      <span
        data-slot="select-item-indicator"
        className="absolute right-2 flex size-3.5 items-center justify-center"
      >
        {isSelected && <CheckIcon className="size-4 text-dvla-green" />}
      </span>
      <span className="truncate">{children}</span>
    </div>
  )
}

function SelectSeparator({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="select-separator"
      className={cn("pointer-events-none -mx-1 my-1 h-px bg-border", className)}
      {...props}
    />
  )
}

function SelectScrollUpButton({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="select-scroll-up-button"
      className={cn("flex cursor-default items-center justify-center py-1", className)}
      {...props}
    >
      <ChevronUpIcon className="size-4" />
    </div>
  )
}

function SelectScrollDownButton({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="select-scroll-down-button"
      className={cn("flex cursor-default items-center justify-center py-1", className)}
      {...props}
    >
      <ChevronDownIcon className="size-4" />
    </div>
  )
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
}
