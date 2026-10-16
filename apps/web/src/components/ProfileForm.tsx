"use client";

import { useEffect, useState } from "react";
import { Button, YStack } from "tamagui";
import {
  ENTITY_TYPES,
  INDUSTRIES,
  PROFESSIONS,
  needsProfession,
  type FormValues,
  type Place,
} from "../lib/plan";
import type { SidebarState } from "../lib/query";
import { CheckField, Field, Muted, NativeSelect, Pair, Panel, SectionLabel, TextField } from "./ui";
import { DateField } from "./DateField";

export interface PlanRequest {
  form: FormValues;
  asOf: string;
  openingDate: string;
}

let zipModule: Promise<typeof import("business-obligations/zip")> | undefined;
/** Loads the ZIP table on first use; it is a separate bundle. */
export async function lookupZip(zip: string): Promise<Place | undefined> {
  zipModule ??= import("business-obligations/zip");
  const info = (await zipModule).lookupZip(zip);
  return info ? { city: info.city, county: info.county, state: info.state } : undefined;
}

export function ProfileForm({
  today,
  busy,
  value,
  onChange,
  onSubmit,
  onFieldUsed,
}: {
  today: string;
  busy: boolean;
  /** The sidebar state, which lives in the URL (see `useUrlState`). */
  value: SidebarState;
  onChange: (next: SidebarState) => void;
  onSubmit: (request: PlanRequest) => void;
  /** Called with a field's name (never its value) when the user edits it. */
  onFieldUsed?: (field: string) => void;
}) {
  const { form, openingDate } = value;
  const asOf = value.asOf || today;
  const [place, setPlace] = useState("");
  const set = <K extends keyof FormValues>(key: K, v: FormValues[K]) => {
    onFieldUsed?.(key);
    onChange({ ...value, form: { ...form, [key]: v } });
  };
  const check = (key: "sellsGoods" | "homeBased" | "tradeName" | "isNew", label: string) => (
    <CheckField id={key} label={label} checked={form[key]} onChange={(v) => set(key, v)} />
  );

  useEffect(() => {
    const zip = form.zip.trim();
    if (zip.length !== 5) {
      setPlace("");
      return;
    }
    let current = true;
    lookupZip(zip).then((p) => {
      if (current) setPlace(p ? `${p.city}, ${p.county} County, ${p.state}` : "Unknown ZIP");
    });
    return () => {
      current = false;
    };
  }, [form.zip]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ form, asOf, openingDate });
      }}
    >
      <Panel gap="2.5" padding="3.5">
        <SectionLabel>Business</SectionLabel>
        <TextField
          id="zip"
          label="ZIP code"
          placeholder="5-digit ZIP"
          value={form.zip}
          onChange={(t) => set("zip", t.replace(/\D/g, "").slice(0, 5))}
          inputMode="numeric"
          maxLength={5}
          hint={<Muted>{place || " "}</Muted>}
        />
        <Field label="Entity type" htmlFor="entityType">
          <NativeSelect
            id="entityType"
            value={form.entityType}
            onChange={(v) => set("entityType", v)}
            options={ENTITY_TYPES}
          />
        </Field>
        <Field label="Industry" htmlFor="industry">
          <NativeSelect
            id="industry"
            value={form.industry}
            onChange={(v) => set("industry", v)}
            options={INDUSTRIES}
          />
        </Field>
        {needsProfession(form) && (
          <Field label="Profession" htmlFor="profession">
            <NativeSelect
              id="profession"
              value={form.profession}
              onChange={(v) => set("profession", v)}
              options={[["", "Select profession"], ...PROFESSIONS]}
            />
          </Field>
        )}

        <SectionLabel>Size</SectionLabel>
        <Pair>
          <TextField
            id="employees"
            label="Employees"
            placeholder="0"
            value={form.employees}
            onChange={(t) => set("employees", t)}
            inputMode="numeric"
          />
          <TextField
            id="owners"
            label="Owners / members"
            placeholder="1"
            value={form.owners}
            onChange={(t) => set("owners", t)}
            inputMode="numeric"
          />
        </Pair>
        <TextField
          id="payroll"
          label="Annual payroll (USD)"
          placeholder="Optional"
          value={form.payroll}
          onChange={(t) => set("payroll", t)}
          inputMode="numeric"
        />
        <TextField
          id="revenue"
          label="Annual revenue (USD)"
          placeholder="Optional"
          value={form.revenue}
          onChange={(t) => set("revenue", t)}
          inputMode="numeric"
        />

        <SectionLabel>Details</SectionLabel>
        <YStack>
          {check("sellsGoods", "Sells taxable goods")}
          {check("homeBased", "Home-based")}
          {check("tradeName", "Uses a trade name (DBA)")}
          {check("isNew", "Not formed yet")}
        </YStack>

        <SectionLabel>Dates</SectionLabel>
        {!form.isNew && (
          <DateField
            id="formationDate"
            label="Formation date"
            value={form.formationDate}
            onChange={(v) => set("formationDate", v)}
            max={asOf || undefined}
          />
        )}
        <Pair>
          <DateField
            id="asOf"
            label="Start / today"
            value={asOf}
            onChange={(v) => {
              onFieldUsed?.("asOf");
              onChange({ ...value, asOf: v });
            }}
          />
          <DateField
            id="openingDate"
            label="Target opening"
            value={openingDate}
            onChange={(v) => {
              onFieldUsed?.("openingDate");
              onChange({ ...value, openingDate: v });
            }}
            min={asOf || undefined}
            clearable
          />
        </Pair>
        <Button type="submit" disabled={busy} theme="accent" marginTop="1">
          {busy ? "Working…" : "Show my obligations"}
        </Button>
      </Panel>
    </form>
  );
}
