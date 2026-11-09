import { Input } from "peal-ui/components/input";
import { Label } from "peal-ui/components/label";
import type { ChangeEvent } from "react";

interface FormFieldProps {
  readonly autoComplete: string;
  readonly hint?: string;
  readonly id: string;
  readonly label: string;
  readonly minLength?: number;
  readonly onChange: (value: string) => void;
  readonly type: "email" | "password" | "text";
  readonly value: string;
}

// A labelled input, with an optional hint the input points to.
export const FormField = ({
  autoComplete,
  hint,
  id,
  label,
  minLength,
  onChange,
  type,
  value,
}: FormFieldProps) => {
  const hintId = `${id}-hint`;

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.value);
  };

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={id}
        type={type}
        autoComplete={autoComplete}
        value={value}
        onChange={handleChange}
        minLength={minLength}
        aria-describedby={hint === undefined ? undefined : hintId}
        required
      />
      {hint === undefined ? null : (
        <p id={hintId} className="text-muted-foreground text-xs">
          {hint}
        </p>
      )}
    </div>
  );
};
