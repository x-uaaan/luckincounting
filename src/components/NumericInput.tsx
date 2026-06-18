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

export default function NumericInput({ value, onChange, ...rest }: Props) {
  const [text, setText] = useState(value == null ? "" : String(value));
  const [focused, setFocused] = useState(false);
  const [toolbarBottom, setToolbarBottom] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!focused) setText(value == null ? "" : String(value));
  }, [value, focused]);

  // Keep toolbar just above the virtual keyboard using Visual Viewport API
  useEffect(() => {
    if (!focused) return;
    const vv = window.visualViewport;
    if (!vv) return;

    const update = () => {
      // Distance from bottom of layout viewport to bottom of visual viewport
      setToolbarBottom(window.innerHeight - vv.height - vv.offsetTop);
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, [focused]);

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
        inputMode="decimal"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        data-lpignore="true"
        data-form-type="other"
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
          <div className="input-toolbar" style={{ bottom: toolbarBottom }}>
            {OPERATORS.map((op) => (
              <button
                key={op}
                className="input-toolbar-btn"
                onPointerDown={(e) => {
                  e.preventDefault();
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
