import type { ReactNode } from "react";
import { Icon, type IconName } from "./icons";
import "./premium.css";

// Har bir boshqaruv joyi alohida karta. superOnly = oltin hoshiyali "Super admin" bo'limi.
export function Section({
  icon,
  title,
  hint,
  superOnly,
  children,
}: {
  icon: IconName;
  title: string;
  hint?: string;
  superOnly?: boolean;
  children?: ReactNode;
}) {
  return (
    <section className={`gfx-section${superOnly ? " is-super" : ""}`}>
      <header>
        <span className="badge"><Icon name={icon} size={20} /></span>
        <div className="ttl">
          <h3>{title}</h3>
          {hint ? <p>{hint}</p> : null}
        </div>
        {superOnly ? <span className="crown"><Icon name="crown" size={14} /> Super admin</span> : null}
      </header>
      <div className="body">{children}</div>
    </section>
  );
}
