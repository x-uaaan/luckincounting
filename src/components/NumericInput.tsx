"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { evalExpression } from "@/lib/expr";

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> & {
  value: number | null;
  onChange: (value: number | null) => void;
};

const OPERATORS = ["+", "-", "×", "÷"];
const OP_INSERT: Record<string, string> = { "+": "+", "-": "-", "×": "*", "÷": "/" };

// Numeric input that also accepts arithmetic expressions, e.g. "2*3",
// "8+9", "[12.5/2]". The expression is evaluated on blur/Enter and replaced
// with its numeric result.
export default function NumericInput({ value, onChange, ...rest }: Props) {
  const [text, setText] = useState(value == null ? "" : String(value));
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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
      setText(value == null ? "" : String(value));
      return;
    }
    onChange(result);
    setText(String(result));
  };

  const insertOp = (op: string) => {
    const ins = OP_INSERT[op] ?? op;
    const el = inputRef.current;
    if (!el) return;
    const start = el.selectionStart ?? text.length;
    const end = el.selectionEnd ?? text.length;
    const next = text.slice(0, start) + ins + text.slice(end);
    setText(next);
    // Restore cursor position after React re-render
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + ins.length, start + ins.length);
    });
  };

  return (
    <>
      <input
        {...rest}
        ref={inputRef}
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
      {focused && typeof document !== "undefined" &&
        createPortal(
          <div className="input-toolbar">
            {OPERATORS.map((op) => (
              <button
                key={op}
                className="input-toolbar-btn"
                // onPointerDown to fire before blur on both mouse and touch
                onPointerDown={(e) => {
                  e.preventDefault(); // prevent input blur
                  insertOp(op);
                }}
              >
                {op}
              </button>
            ))}
          </div>,
          document.body
        )}
    </>
  );
}
