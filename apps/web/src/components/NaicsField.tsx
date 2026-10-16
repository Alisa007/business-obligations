"use client";

import { useEffect, useState } from "react";
import { Button, Input, Text, YStack } from "tamagui";
import { Field, Muted, useControlProps } from "./ui";

type NaicsModule = typeof import("business-obligations/naics");
let naicsModule: Promise<NaicsModule> | undefined;
/** Loads the NAICS code list on first use; it is a separate bundle. */
const loadNaics = () => (naicsModule ??= import("business-obligations/naics"));

/**
 * The business's NAICS code. Digits are the code itself (any 2 to 6 digits); words search the code list, and
 * picking a result fills in its code. `value` holds only the digits, so the URL stays a plain `naics=722511`.
 */
export function NaicsField({ value, onChange }: { value: string; onChange: (naics: string) => void }) {
  const controlProps = useControlProps();
  const [text, setText] = useState(value);
  const [results, setResults] = useState<Array<{ code: string; title: string }>>([]);
  const [title, setTitle] = useState("");

  // The field is also set from outside (a shared link, a reset), so follow `value` when it stops matching the text.
  useEffect(() => {
    if (/^\d*$/.test(text) && text !== value) setText(value);
  }, [value]);

  useEffect(() => {
    let current = true;
    if (value.length !== 6) {
      setTitle("");
      return;
    }
    loadNaics().then((m) => current && setTitle(m.naicsTitle(value) ?? ""));
    return () => {
      current = false;
    };
  }, [value]);

  const type = (t: string) => {
    setText(t);
    if (/^\d*$/.test(t)) onChange(t.slice(0, 6));
    else onChange("");
    const q = t.trim();
    if (q.length < 2 || (/^\d+$/.test(q) && q.length >= 6)) return setResults([]);
    loadNaics().then((m) => setResults(m.searchNaics(q, 6)));
  };
  const pick = (code: string, name: string) => {
    setText(code);
    setResults([]);
    setTitle(name);
    onChange(code);
  };

  return (
    <Field label="Industry (NAICS code)" htmlFor="naics">
      <Input
        id="naics"
        value={text}
        onChangeText={type}
        {...controlProps}
        autoComplete="off"
        placeholder="Type a code or a word, e.g. restaurant"
      />
      {results.length > 0 && (
        <YStack borderWidth={1} borderColor="border-color" borderRadius="md" overflow="hidden">
          {results.map((r) => (
            <Button key={r.code} size="sm" justifyContent="flex-start" onPress={() => pick(r.code, r.title)}>
              <Text fontSize="sm" textAlign="left" flexShrink={1}>
                <Text fontWeight="600">{r.code}</Text> {r.title}
              </Text>
            </Button>
          ))}
        </YStack>
      )}
      <Muted>{title || (value ? `NAICS ${value}` : "Leave empty if none fits; general rules apply.")}</Muted>
    </Field>
  );
}
