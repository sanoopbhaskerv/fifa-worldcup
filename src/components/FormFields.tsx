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
}: LabeledSelectProps) => (
  <label>
    {label}
    <select
      aria-label={ariaLabel}
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
}: LabeledInputProps) => (
  <label>
    {label}
    <input
      aria-label={ariaLabel}
      autoComplete={autoComplete}
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
  <label className={className}>
    <input
      aria-label={ariaLabel}
      checked={checked}
      onChange={(event) => onChange(event.target.checked)}
      type="checkbox"
    />
    {label}
  </label>
);
