import { defaultConfig } from "@tamagui/config/v6";
import { createTamagui } from "tamagui";

export const tamaguiConfig = createTamagui(defaultConfig);

export type AppConfig = typeof tamaguiConfig;

declare module "tamagui" {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type -- the documented augmentation pattern
  interface TamaguiCustomConfig extends AppConfig {}
}

export default tamaguiConfig;
