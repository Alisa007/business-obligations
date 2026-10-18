import { useEffect, useId, useState } from "react";
import { Input, Text } from "tamagui";
import { WithLocale, useI18n } from "../../i18n/context";
import { useControlProps } from "../../shared/controls";
import { useFixedChoices, useProfileChoices } from "../store";
import { firstError, naicsTextSchema, type FieldError } from "../validation";
import { ClearButton, ErrorText, Labeled, borderOf, type ProfileFieldProps } from "./controls";

type NaicsModule = typeof import("business-obligations/naics");
let naicsModule: Promise<NaicsModule> | undefined;
/** Loads the NAICS code list on first use; it is a separate bundle. */
const loadNaics = () => (naicsModule ??= import("business-obligations/naics"));

const listbox = {
  position: "absolute",
  top: "100%",
  left: 0,
  right: 0,
  zIndex: 1000,
  marginTop: 4,
  border: "1px solid var(--border-color)",
  borderRadius: 8,
  background: "var(--background)",
  boxShadow: "0 6px 20px rgba(0, 0, 0, 0.18)",
  overflow: "hidden",
} as const;

const optionStyle = {
  display: "flex",
  gap: 12,
  padding: "8px 12px",
  fontSize: 14,
  cursor: "pointer",
} as const;

function IndustryControl({ id }: { id: string }) {
  const { m } = useI18n();
  const [choices, set] = useProfileChoices();
  const controlProps = useControlProps();
  const listId = `${id}-list`;
  const value = choices.naics;
  const [text, setText] = useState(value);
  // `undefined` until a search has run; an empty list is then "no match".
  const [results, setResults] = useState<Array<{ code: string; title: string }> | undefined>();
  const [active, setActive] = useState(0);
  const [title, setTitle] = useState("");
  // A six-digit code that the list, once loaded, does not have.
  const [unknown, setUnknown] = useState(false);
  const open = results !== undefined;
  const error: FieldError | undefined =
    firstError(naicsTextSchema, text.trim()) ?? (unknown ? "naicsUnknown" : undefined);
  const errorId = `${id}-error`;
  // Tamagui's `role` type has no "combobox", but the attributes reach the input.
  const comboboxProps = {
    role: "combobox",
    "aria-expanded": open,
    "aria-controls": listId,
    "aria-autocomplete": "list",
    "aria-activedescendant": open && results.length > 0 ? `${listId}-${active}` : undefined,
  } as object;

  // The address can change from outside (a shared link, Back), so follow `value` when it stops matching the text.
  useEffect(() => {
    setText((current) => (/^\d*$/.test(current) && current !== value ? value : current));
  }, [value]);

  useEffect(() => {
    let current = true;
    if (value.length !== 6) {
      setTitle("");
      setUnknown(false);
      return;
    }
    loadNaics().then((module) => {
      if (!current) return;
      const known = module.naicsTitle(value);
      setTitle(known ?? "");
      setUnknown(known === undefined);
    });
    return () => {
      current = false;
    };
  }, [value]);

  const close = () => setResults(undefined);
  const search = (query: string) => {
    if (query.length < 2 || (/^\d+$/.test(query) && query.length >= 6)) return close();
    loadNaics().then((module) => {
      setResults(module.searchNaics(query, 6));
      setActive(0);
    });
  };
  const type = (typed: string) => {
    setText(typed);
    set({ naics: /^\d*$/.test(typed) ? typed.slice(0, 6) : "" });
    search(typed.trim());
  };
  const pick = (code: string, name: string) => {
    setText(code);
    close();
    setTitle(name);
    set({ naics: code });
  };
  const clear = () => {
    setText("");
    close();
    set({ naics: "" });
  };
  const onKeyDown = (event: React.KeyboardEvent) => {
    if (!open || results.length === 0) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : results.length - 1;
      setActive((active + step) % results.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      const chosen = results[active];
      if (chosen) pick(chosen.code, chosen.title);
    } else if (event.key === "Escape") close();
  };

  return (
    <Labeled id={id} label={m.profile.industry}>
      {/* keydown bubbles up from the input, so the arrows, Enter and Escape work whichever element has the focus */}
      <div
        style={{ position: "relative", width: "100%" }}
        onKeyDown={onKeyDown}
        onBlur={() => setTimeout(close, 120)}
      >
        <Input
          id={id}
          value={text}
          onChangeText={type}
          width="100%"
          {...controlProps}
          borderColor={borderOf(error)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          paddingLeft={10}
          paddingRight={text ? 36 : 10}
          autoComplete="off"
          placeholder={m.profile.industryPlaceholder}
          {...comboboxProps}
        />
        {text ? <ClearButton label={m.profile.clear} onClear={clear} /> : null}
        {open ? (
          <div id={listId} role="listbox" style={listbox}>
            {results.length === 0 ? (
              <div style={{ ...optionStyle, color: "var(--placeholder-color)" }}>
                {m.profile.industryNone}
              </div>
            ) : (
              results.map((result, index) => (
                <div
                  key={result.code}
                  id={`${listId}-${index}`}
                  role="option"
                  aria-selected={index === active}
                  style={{
                    ...optionStyle,
                    background: index === active ? "var(--color4, rgba(127,127,127,.2))" : "transparent",
                  }}
                  onMouseEnter={() => setActive(index)}
                  // pressing must not take the focus from the input, or the list would close before the click lands
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => pick(result.code, result.title)}
                >
                  <strong style={{ minWidth: 56 }}>{result.code}</strong>
                  <span style={{ flex: 1 }}>{result.title}</span>
                </div>
              ))
            )}
          </div>
        ) : null}
      </div>
      {error ? (
        <ErrorText id={errorId} error={error} />
      ) : (
        <Text fontSize="sm" color="placeholder-color">
          {title || (value ? m.profile.industryCode(value) : m.profile.industryEmpty)}
        </Text>
      )}
    </Labeled>
  );
}

/**
 * The business's NAICS code. Digits are the code itself (any 2 to 6 digits); words search the code list, and picking
 * a result fills in its code. Reads and writes `?naics=`, so the address stays a plain `naics=722511`. The code
 * list is a separate bundle (`business-obligations/naics`), loaded when the person starts typing.
 */
export function IndustryField({ locale, messages, id }: ProfileFieldProps) {
  const generated = useId();
  if (useFixedChoices().has("naics")) return null;
  return (
    <WithLocale locale={locale} messages={messages}>
      <IndustryControl id={id ?? generated} />
    </WithLocale>
  );
}
