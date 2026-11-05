"use client";
import { useState } from "react";
import { Delete } from "lucide-react";
import { Dialog } from "./shared";

export default function ReceivingKeypad({ title, subtitle, initial = "", decimal = false, positive = false, onClose, onEnter }: {
  title: string; subtitle?: string; initial?: string; decimal?: boolean; positive?: boolean;
  onClose: () => void; onEnter: (value: number) => void;
}) {
  const [value, setValue] = useState(initial);
  const [accumulator, setAccumulator] = useState(0);
  const [replace, setReplace] = useState(true);
  const [error, setError] = useState("");
  function press(key: string) {
    setError("");
    if (key === "back") { setValue(v => v.slice(0, -1)); setReplace(false); return; }
    if (key === "+") { setAccumulator(a => a + Number(value || 0)); setValue(""); setReplace(false); return; }
    if (key === "=") { setValue(String(accumulator + Number(value || 0))); setAccumulator(0); setReplace(true); return; }
    const current = replace ? "" : value;
    if (key === "." && (!decimal || current.includes("."))) return;
    setValue(key === "." && !current ? "0." : current + key); setReplace(false);
  }
  const display = value || (accumulator ? String(accumulator) : "0");
  function accept() {
    const result = Number((accumulator + Number(value || 0)).toFixed(8));
    if (!Number.isFinite(result) || result < 0 || (positive && result === 0) || (!decimal && !Number.isSafeInteger(result))) {
      setError(positive ? "Enter a positive whole-number quantity." : "Enter a valid non-negative number."); return;
    }
    onEnter(result);
  }
  return <Dialog title={title} className="keypad-dialog incoming-keypad" onClose={onClose} badge={subtitle && <span className="incoming-keypad-item">{subtitle}</span>}>
    <div className="incoming-keypad-display"><div><small>{accumulator ? `${accumulator} +` : ""}</small><output aria-live="polite" aria-label="Keypad value">{display}</output></div><button type="button" aria-label="Erase last digit" onClick={() => press("back")}><Delete size={27} /></button></div>
    {error && <p role="alert" className="incoming-keypad-error">{error}</p>}
    <div className="keypad-grid">{["1", "2", "3", "4", "5", "6", "7", "8", "9", "+", "0", decimal ? "." : "="].map(key => <button type="button" key={key} className="keypad-key" aria-label={`Key ${key}`} onClick={() => press(key)}>{key}</button>)}</div>
    <button type="button" className="btn-primary keypad-enter" onClick={accept}>Enter</button>
  </Dialog>;
}
