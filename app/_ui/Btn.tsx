import type { ButtonHTMLAttributes, ReactNode } from "react";
import Link from "next/link";
import { Icon, type IconName } from "./icons";
import "./premium.css";

type Common = {
  variant?: "gold" | "silver" | "white" | "glass" | "dark" | "danger";
  shape?: "pill" | "rect";
  size?: "sm" | "md" | "lg";
  icon?: IconName;
  iconLeft?: boolean;
  block?: boolean;
  children: ReactNode;
};

function cls(p: Common, extra?: string) {
  return ["gfx-btn", `v-${p.variant ?? "gold"}`, p.shape === "rect" ? "rect" : "pill", `s-${p.size ?? "md"}`, p.block ? "block" : "", extra ?? ""]
    .filter(Boolean)
    .join(" ");
}

function Inner({ icon, iconLeft, children }: Pick<Common, "icon" | "iconLeft" | "children">) {
  return (
    <>
      {icon && iconLeft ? <Icon name={icon} size={18} /> : null}
      <span className="lbl">{children}</span>
      {icon && !iconLeft ? <Icon name={icon} size={18} /> : null}
      <i className="shine" aria-hidden="true" />
    </>
  );
}

// Oddiy tugma. <form action={serverAction}> ichida ham ishlaydi.
export function Btn(props: Common & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children">) {
  const { variant, shape, size, icon, iconLeft, block, children, className, ...rest } = props;
  return (
    <button {...rest} className={cls(props, className)}>
      <Inner icon={icon} iconLeft={iconLeft}>{children}</Inner>
    </button>
  );
}

// Havola ko'rinishidagi tugma.
export function BtnLink(props: Common & { href: string; className?: string }) {
  const { href, className } = props;
  return (
    <Link href={href} className={cls(props, className)}>
      <Inner icon={props.icon} iconLeft={props.iconLeft}>{props.children}</Inner>
    </Link>
  );
}
