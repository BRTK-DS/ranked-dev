import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
const variants = cva("inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-50 active:scale-[.98]", { variants: { variant: { default: "bg-primary text-zinc-950 hover:bg-emerald-300", outline: "border bg-transparent text-zinc-200 hover:bg-muted", ghost: "text-zinc-400 hover:bg-muted hover:text-white", danger: "bg-rose-500 text-white hover:bg-rose-400" }, size: { default: "h-10 px-4", sm: "h-8 px-3 text-xs", icon: "size-10 p-0" } }, defaultVariants: { variant: "default", size: "default" } });
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof variants> { asChild?: boolean }
export function Button({ className, variant, size, asChild, ...props }: ButtonProps) { const Comp = asChild ? Slot : "button"; return <Comp className={cn(variants({ variant, size }), className)} {...props} />; }
