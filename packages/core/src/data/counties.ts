// Generated list of per-state county files; edit data/counties/*.json, not this file.
import AK from "../../data/counties/AK.json";
import AL from "../../data/counties/AL.json";
import AR from "../../data/counties/AR.json";
import AZ from "../../data/counties/AZ.json";
import CA from "../../data/counties/CA.json";
import CO from "../../data/counties/CO.json";
import CT from "../../data/counties/CT.json";
import DC from "../../data/counties/DC.json";
import DE from "../../data/counties/DE.json";
import FL from "../../data/counties/FL.json";
import GA from "../../data/counties/GA.json";
import HI from "../../data/counties/HI.json";
import IA from "../../data/counties/IA.json";
import ID from "../../data/counties/ID.json";
import IL from "../../data/counties/IL.json";
import IN from "../../data/counties/IN.json";
import KS from "../../data/counties/KS.json";
import KY from "../../data/counties/KY.json";
import LA from "../../data/counties/LA.json";
import MA from "../../data/counties/MA.json";
import MD from "../../data/counties/MD.json";
import ME from "../../data/counties/ME.json";
import MI from "../../data/counties/MI.json";
import MN from "../../data/counties/MN.json";
import MO from "../../data/counties/MO.json";
import MS from "../../data/counties/MS.json";
import MT from "../../data/counties/MT.json";
import NC from "../../data/counties/NC.json";
import ND from "../../data/counties/ND.json";
import NE from "../../data/counties/NE.json";
import NH from "../../data/counties/NH.json";
import NJ from "../../data/counties/NJ.json";
import NM from "../../data/counties/NM.json";
import NV from "../../data/counties/NV.json";
import NY from "../../data/counties/NY.json";
import OH from "../../data/counties/OH.json";
import OK from "../../data/counties/OK.json";
import OR from "../../data/counties/OR.json";
import PA from "../../data/counties/PA.json";
import RI from "../../data/counties/RI.json";
import SC from "../../data/counties/SC.json";
import SD from "../../data/counties/SD.json";
import TN from "../../data/counties/TN.json";
import TX from "../../data/counties/TX.json";
import UT from "../../data/counties/UT.json";
import VA from "../../data/counties/VA.json";
import VT from "../../data/counties/VT.json";
import WA from "../../data/counties/WA.json";
import WI from "../../data/counties/WI.json";
import WV from "../../data/counties/WV.json";
import WY from "../../data/counties/WY.json";
import { places } from "./normalize";
import type { CountyJurisdiction } from "./types";

/** County rule seeds by state code. A state with no seeded counties has an empty list. */
export const COUNTIES: Record<string, CountyJurisdiction[]> = {
  AK: /* @__PURE__ */ places<CountyJurisdiction>("AK", AK),
  AL: /* @__PURE__ */ places<CountyJurisdiction>("AL", AL),
  AR: /* @__PURE__ */ places<CountyJurisdiction>("AR", AR),
  AZ: /* @__PURE__ */ places<CountyJurisdiction>("AZ", AZ),
  CA: /* @__PURE__ */ places<CountyJurisdiction>("CA", CA),
  CO: /* @__PURE__ */ places<CountyJurisdiction>("CO", CO),
  CT: /* @__PURE__ */ places<CountyJurisdiction>("CT", CT),
  DC: /* @__PURE__ */ places<CountyJurisdiction>("DC", DC),
  DE: /* @__PURE__ */ places<CountyJurisdiction>("DE", DE),
  FL: /* @__PURE__ */ places<CountyJurisdiction>("FL", FL),
  GA: /* @__PURE__ */ places<CountyJurisdiction>("GA", GA),
  HI: /* @__PURE__ */ places<CountyJurisdiction>("HI", HI),
  IA: /* @__PURE__ */ places<CountyJurisdiction>("IA", IA),
  ID: /* @__PURE__ */ places<CountyJurisdiction>("ID", ID),
  IL: /* @__PURE__ */ places<CountyJurisdiction>("IL", IL),
  IN: /* @__PURE__ */ places<CountyJurisdiction>("IN", IN),
  KS: /* @__PURE__ */ places<CountyJurisdiction>("KS", KS),
  KY: /* @__PURE__ */ places<CountyJurisdiction>("KY", KY),
  LA: /* @__PURE__ */ places<CountyJurisdiction>("LA", LA),
  MA: /* @__PURE__ */ places<CountyJurisdiction>("MA", MA),
  MD: /* @__PURE__ */ places<CountyJurisdiction>("MD", MD),
  ME: /* @__PURE__ */ places<CountyJurisdiction>("ME", ME),
  MI: /* @__PURE__ */ places<CountyJurisdiction>("MI", MI),
  MN: /* @__PURE__ */ places<CountyJurisdiction>("MN", MN),
  MO: /* @__PURE__ */ places<CountyJurisdiction>("MO", MO),
  MS: /* @__PURE__ */ places<CountyJurisdiction>("MS", MS),
  MT: /* @__PURE__ */ places<CountyJurisdiction>("MT", MT),
  NC: /* @__PURE__ */ places<CountyJurisdiction>("NC", NC),
  ND: /* @__PURE__ */ places<CountyJurisdiction>("ND", ND),
  NE: /* @__PURE__ */ places<CountyJurisdiction>("NE", NE),
  NH: /* @__PURE__ */ places<CountyJurisdiction>("NH", NH),
  NJ: /* @__PURE__ */ places<CountyJurisdiction>("NJ", NJ),
  NM: /* @__PURE__ */ places<CountyJurisdiction>("NM", NM),
  NV: /* @__PURE__ */ places<CountyJurisdiction>("NV", NV),
  NY: /* @__PURE__ */ places<CountyJurisdiction>("NY", NY),
  OH: /* @__PURE__ */ places<CountyJurisdiction>("OH", OH),
  OK: /* @__PURE__ */ places<CountyJurisdiction>("OK", OK),
  OR: /* @__PURE__ */ places<CountyJurisdiction>("OR", OR),
  PA: /* @__PURE__ */ places<CountyJurisdiction>("PA", PA),
  RI: /* @__PURE__ */ places<CountyJurisdiction>("RI", RI),
  SC: /* @__PURE__ */ places<CountyJurisdiction>("SC", SC),
  SD: /* @__PURE__ */ places<CountyJurisdiction>("SD", SD),
  TN: /* @__PURE__ */ places<CountyJurisdiction>("TN", TN),
  TX: /* @__PURE__ */ places<CountyJurisdiction>("TX", TX),
  UT: /* @__PURE__ */ places<CountyJurisdiction>("UT", UT),
  VA: /* @__PURE__ */ places<CountyJurisdiction>("VA", VA),
  VT: /* @__PURE__ */ places<CountyJurisdiction>("VT", VT),
  WA: /* @__PURE__ */ places<CountyJurisdiction>("WA", WA),
  WI: /* @__PURE__ */ places<CountyJurisdiction>("WI", WI),
  WV: /* @__PURE__ */ places<CountyJurisdiction>("WV", WV),
  WY: /* @__PURE__ */ places<CountyJurisdiction>("WY", WY),
};
