"use client";

import { useEffect, useState } from "react";
import { evalExpression } from "@/lib/expr";

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> & {
  value: number | null;
  onChange: (value: number | null) => void;
};

// Numeric input that also accepts arithmetic expressions, e.g. "2*3",
// "8+9", "[12.5/2]". The expression is evaluated on blur/Enter and replaced
// with its numeric result.
export default function NumericInput({ value, onChange, ...rest }: Props) {
  const [text, setText] = useState(value == null ? "" : String(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setText(value == null ? "" : String(value));
  }, [value, focused]);

  const commit = () => {
    const trimmed = text.trim();
    if (trimmed === "") {
      onChange(null);
      setText("");
      return;
    }
    const result = evalExpression(trimmed);
    if (result == null) {
      // Invalid expression: revert to last known good value.
      setText(value == null ? "" : String(value));
      return;
    }
    onChange(result);
    setText(String(result));
  };

  return (
    <input
      {...rest}
      inputMode="text"
      value={text}
      onChange={(e) => setText(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={() => {
        setFocused(false);
        commit();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          commit();
          e.currentTarget.blur();
        }
      }}
    />
  );
}
