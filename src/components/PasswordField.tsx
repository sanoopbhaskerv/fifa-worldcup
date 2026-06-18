import { useState } from "react";
import { EyeIcon } from "./Icons";

interface PasswordFieldProps {
  autoComplete: string;
  id?: string;
  label: string;
  minLength?: number;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
}

/**
 * Renders a password input with a visibility toggle.
 *
 * @param props - Input configuration.
 * @returns Password field with show/hide control.
 */
export const PasswordField = ({
  autoComplete,
  id,
  label,
  minLength,
  onChange,
  placeholder,
  value,
}: PasswordFieldProps) => {
  const [visible, setVisible] = useState(false);
  return (
    <label className="password-field" htmlFor={id}>
      <span>{label}</span>
      <span className="password-field__control">
        <input
          autoComplete={autoComplete}
          id={id}
          minLength={minLength}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          type={visible ? "text" : "password"}
          value={value}
        />
        <button
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          onClick={() => setVisible((current) => !current)}
          type="button"
        >
          <EyeIcon />
        </button>
      </span>
    </label>
  );
};
