import { Icon, type IconName } from "./icons";
import "./premium.css";

// Shisha uslubidagi yoqish/o'chirish. JS kerak emas: oddiy checkbox, <form> ichida name bilan yuboriladi.
export function Toggle({
  name,
  defaultChecked,
  iconOn = "check",
  iconOff = "power",
  label,
}: {
  name: string;
  defaultChecked?: boolean;
  iconOn?: IconName;
  iconOff?: IconName;
  label?: string;
}) {
  return (
    <label className="gfx-toggle">
      <input type="checkbox" name={name} value="1" defaultChecked={defaultChecked} />
      <span className="track">
        <span className="knob">
          <Icon name={iconOff} size={16} className="off" />
          <Icon name={iconOn} size={16} className="on" />
        </span>
      </span>
      {label ? <span className="txt">{label}</span> : null}
    </label>
  );
}
