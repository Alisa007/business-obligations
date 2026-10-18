import { useEffect, useState } from "react";
import { Input, Text } from "tamagui";
import { useI18n } from "../../i18n/context";
import { useControlProps } from "../../shared/controls";
import { lookupPlace } from "../place";
import { useProfileChoices } from "../store";
import { ClearButton, Labeled } from "./controls";

export function ZipField({ id }: { id: string }) {
  const { m } = useI18n();
  const [choices, set] = useProfileChoices();
  const controlProps = useControlProps();
  const zip = choices.zip;
  const [place, setPlace] = useState("");
  const [unknown, setUnknown] = useState(false);
  useEffect(() => {
    setUnknown(false);
    if (zip.length !== 5) {
      setPlace("");
      return;
    }
    let current = true;
    void lookupPlace(zip).then((found) => {
      if (!current) return;
      setUnknown(!found);
      setPlace(found ? `${found.city}, ${found.county} County, ${found.state}` : m.profileForm.zipUnknown);
    });
    return () => {
      current = false;
    };
  }, [zip, m.profileForm.zipUnknown]);
  return (
    <Labeled id={id} label={m.profileForm.zip}>
      <div style={{ position: "relative", width: "100%" }}>
        <Input
          id={id}
          width="100%"
          {...controlProps}
          paddingLeft={10}
          paddingRight={zip ? 36 : 10}
          borderColor={unknown ? "red-600" : "border-color"}
          aria-invalid={unknown || undefined}
          aria-describedby={`${id}-place`}
          autoComplete="off"
          inputMode="numeric"
          maxLength={5}
          placeholder={m.profileForm.zipPlaceholder}
          value={zip}
          onChangeText={(text) => set({ zip: text.replace(/\D/g, "").slice(0, 5) })}
        />
        {zip ? <ClearButton label={m.profile.clear} onClear={() => set({ zip: "" })} /> : null}
      </div>
      <Text
        id={`${id}-place`}
        role={unknown ? "alert" : undefined}
        fontSize="sm"
        color={unknown ? "red-600" : "placeholder-color"}
      >
        {place || " "}
      </Text>
    </Labeled>
  );
}
