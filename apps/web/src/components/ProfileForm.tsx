"use client";

import { useEffect, useState } from "react";
import { Button, Checkbox, Input, Text, XStack, YStack } from "tamagui";
import {
  ENTITY_TYPES,
  INDUSTRIES,
  PROFESSIONS,
  needsProfession,
  type FormValues,
  type Place,
} from "../lib/plan";
import { Field, Muted, NativeSelect, Panel } from "./ui";

export interface PlanRequest {
  form: FormValues;
  asOf: string;
  openingDate: string;
}

let zipModule: Promise<typeof import("compliance-rules-engine/zip")> | undefined;
/** Loads the ZIP table on first use; it is a separate bundle. */
export async function lookupZip(zip: string): Promise<Place | undefined> {
  zipModule ??= import("compliance-rules-engine/zip");
  const info = (await zipModule).lookupZip(zip);
  return info ? { city: info.city, county: info.county, state: info.state } : undefined;
}

const INITIAL: FormValues = {
  zip: "78701",
  entityType: "llc",
  industry: "general",
  profession: "attorney",
  employees: "2",
  payroll: "90000",
  revenue: "250000",
  owners: "1",
  sellsGoods: false,
  homeBased: false,
  tradeName: false,
  isNew: true,
  formationDate: "",
};

function CheckField({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <XStack gap="2.5" alignItems="center">
      <Checkbox id={id} checked={checked} onCheckedChange={(v) => onChange(v === true)} size="sm">
        <Checkbox.Indicator>
          <Text fontSize="xs">✓</Text>
        </Checkbox.Indicator>
      </Checkbox>
      <label htmlFor={id} style={{ fontSize: 14, cursor: "pointer" }}>
        {label}
      </label>
    </XStack>
  );
}

export function ProfileForm({
  today,
  busy,
  onSubmit,
}: {
  today: string;
  busy: boolean;
  onSubmit: (request: PlanRequest) => void;
}) {
  const [form, setForm] = useState<FormValues>(INITIAL);
  const [asOf, setAsOf] = useState(today);
  const [openingDate, setOpeningDate] = useState("");
  const [place, setPlace] = useState("");
  const set = <K extends keyof FormValues>(key: K, value: FormValues[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  useEffect(() => setAsOf(today), [today]);

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
      <Panel gap="3">
        <Field label="ZIP code" htmlFor="zip">
          <Input
            id="zip"
            value={form.zip}
            onChangeText={(t) => set("zip", t.replace(/\D/g, "").slice(0, 5))}
            inputMode="numeric"
            maxLength={5}
            autoComplete="off"
          />
          <Muted>{place || " "}</Muted>
        </Field>
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
              options={PROFESSIONS}
            />
          </Field>
        )}
        <XStack gap="2.5">
          <YStack flex={1}>
            <Field label="Employees" htmlFor="employees">
              <Input
                id="employees"
                value={form.employees}
                onChangeText={(t) => set("employees", t)}
                inputMode="numeric"
              />
            </Field>
          </YStack>
          <YStack flex={1}>
            <Field label="Owners / members" htmlFor="owners">
              <Input
                id="owners"
                value={form.owners}
                onChangeText={(t) => set("owners", t)}
                inputMode="numeric"
              />
            </Field>
          </YStack>
        </XStack>
        <Field label="Annual payroll (USD)" htmlFor="payroll">
          <Input
            id="payroll"
            value={form.payroll}
            onChangeText={(t) => set("payroll", t)}
            inputMode="numeric"
          />
        </Field>
        <Field label="Annual revenue (USD)" htmlFor="revenue">
          <Input
            id="revenue"
            value={form.revenue}
            onChangeText={(t) => set("revenue", t)}
            inputMode="numeric"
          />
        </Field>
        <YStack gap="2">
          <CheckField
            id="sellsGoods"
            label="Sells taxable goods"
            checked={form.sellsGoods}
            onChange={(v) => set("sellsGoods", v)}
          />
          <CheckField
            id="homeBased"
            label="Home-based"
            checked={form.homeBased}
            onChange={(v) => set("homeBased", v)}
          />
          <CheckField
            id="tradeName"
            label="Uses a trade name (DBA)"
            checked={form.tradeName}
            onChange={(v) => set("tradeName", v)}
          />
          <CheckField
            id="isNew"
            label="Not formed yet"
            checked={form.isNew}
            onChange={(v) => set("isNew", v)}
          />
        </YStack>
        {!form.isNew && (
          <Field label="Formation date" htmlFor="formationDate">
            <input
              id="formationDate"
              type="date"
              value={form.formationDate}
              onChange={(e) => set("formationDate", e.target.value)}
              className="cre-date"
            />
          </Field>
        )}
        <XStack gap="2.5">
          <YStack flex={1}>
            <Field label="Start / today" htmlFor="asOf">
              <input
                id="asOf"
                type="date"
                value={asOf}
                onChange={(e) => setAsOf(e.target.value)}
                className="cre-date"
              />
            </Field>
          </YStack>
          <YStack flex={1}>
            <Field label="Target opening date" htmlFor="openingDate">
              <input
                id="openingDate"
                type="date"
                value={openingDate}
                onChange={(e) => setOpeningDate(e.target.value)}
                className="cre-date"
              />
            </Field>
          </YStack>
        </XStack>
        <Button type="submit" disabled={busy} theme="accent" marginTop="1">
          Show my obligations
        </Button>
      </Panel>
    </form>
  );
}
