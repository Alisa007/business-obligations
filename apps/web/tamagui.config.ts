import { defaultConfig } from "@tamagui/config/v6";
import { createTamagui } from "tamagui";

const tamaguiConfig = createTamagui(defaultConfig);

type AppConfig = typeof tamaguiConfig;

declare module "tamagui" {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type -- the documented augmentation pattern
  interface TamaguiCustomConfig extends AppConfig {}
}

export default tamaguiConfig;
