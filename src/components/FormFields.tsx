import type { ReactNode } from "react";

type SelectOption = {
  value: string;
  label: string;
};

type LabeledSelectProps = {
  label: ReactNode;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  ariaLabel?: string;
  className?: string;
};

type LabeledInputProps = {
  label: ReactNode;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "date" | "number" | "password";
  min?: string | number;
  max?: string | number;
  maxLength?: number;
  placeholder?: string;
  ariaLabel?: string;
  autoComplete?: string;
  minLength?: number;
  className?: string;
};

type LabeledCheckboxProps = {
  label: ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
  ariaLabel?: string;
};

export const LabeledSelect = ({
  label,
  value,
  onChange,
  options,
  ariaLabel,
  className,
}: LabeledSelectProps) => (
  <label className={`labeled-select ${className ?? ""}`}>
    <span className="labeled-select__text">{label}</span>
    <select
      aria-label={ariaLabel}
      className="labeled-select__control"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </label>
);

export const LabeledInput = ({
  label,
  value,
  onChange,
  type = "text",
  min,
  max,
  maxLength,
  placeholder,
  ariaLabel,
  autoComplete,
  minLength,
  className,
}: LabeledInputProps) => (
  <label className={`labeled-input ${className ?? ""}`}>
    <span className="labeled-input__text">{label}</span>
    <input
      aria-label={ariaLabel}
      autoComplete={autoComplete}
      className="labeled-input__control"
      max={max}
      maxLength={maxLength}
      min={min}
      minLength={minLength}
      placeholder={placeholder}
      type={type}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  </label>
);

export const LabeledCheckbox = ({
  label,
  checked,
  onChange,
  className,
  ariaLabel,
}: LabeledCheckboxProps) => (
  <label className={`labeled-checkbox ${className ?? ""}`}>
    <input
      aria-label={ariaLabel}
      checked={checked}
      className="labeled-checkbox__control"
      onChange={(event) => onChange(event.target.checked)}
      type="checkbox"
    />
    <span className="labeled-checkbox__text">{label}</span>
  </label>
);
