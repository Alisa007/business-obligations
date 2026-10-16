// Generated list of per-state city files; edit data/cities/*.json, not this file.
import AK from "../../data/cities/AK.json";
import AL from "../../data/cities/AL.json";
import AR from "../../data/cities/AR.json";
import AZ from "../../data/cities/AZ.json";
import CA from "../../data/cities/CA.json";
import CO from "../../data/cities/CO.json";
import CT from "../../data/cities/CT.json";
import DC from "../../data/cities/DC.json";
import DE from "../../data/cities/DE.json";
import FL from "../../data/cities/FL.json";
import GA from "../../data/cities/GA.json";
import HI from "../../data/cities/HI.json";
import IA from "../../data/cities/IA.json";
import ID from "../../data/cities/ID.json";
import IL from "../../data/cities/IL.json";
import IN from "../../data/cities/IN.json";
import KS from "../../data/cities/KS.json";
import KY from "../../data/cities/KY.json";
import LA from "../../data/cities/LA.json";
import MA from "../../data/cities/MA.json";
import MD from "../../data/cities/MD.json";
import ME from "../../data/cities/ME.json";
import MI from "../../data/cities/MI.json";
import MN from "../../data/cities/MN.json";
import MO from "../../data/cities/MO.json";
import MS from "../../data/cities/MS.json";
import MT from "../../data/cities/MT.json";
import NC from "../../data/cities/NC.json";
import ND from "../../data/cities/ND.json";
import NE from "../../data/cities/NE.json";
import NH from "../../data/cities/NH.json";
import NJ from "../../data/cities/NJ.json";
import NM from "../../data/cities/NM.json";
import NV from "../../data/cities/NV.json";
import NY from "../../data/cities/NY.json";
import OH from "../../data/cities/OH.json";
import OK from "../../data/cities/OK.json";
import OR from "../../data/cities/OR.json";
import PA from "../../data/cities/PA.json";
import RI from "../../data/cities/RI.json";
import SC from "../../data/cities/SC.json";
import SD from "../../data/cities/SD.json";
import TN from "../../data/cities/TN.json";
import TX from "../../data/cities/TX.json";
import UT from "../../data/cities/UT.json";
import VA from "../../data/cities/VA.json";
import VT from "../../data/cities/VT.json";
import WA from "../../data/cities/WA.json";
import WI from "../../data/cities/WI.json";
import WV from "../../data/cities/WV.json";
import WY from "../../data/cities/WY.json";
import { places } from "./normalize";
import type { LocalJurisdiction } from "./types";

/** City rule seeds by state code. A state with no seeded cities has an empty list. */
export const CITIES: Record<string, LocalJurisdiction[]> = {
  AK: places<LocalJurisdiction>("AK", AK),
  AL: places<LocalJurisdiction>("AL", AL),
  AR: places<LocalJurisdiction>("AR", AR),
  AZ: places<LocalJurisdiction>("AZ", AZ),
  CA: places<LocalJurisdiction>("CA", CA),
  CO: places<LocalJurisdiction>("CO", CO),
  CT: places<LocalJurisdiction>("CT", CT),
  DC: places<LocalJurisdiction>("DC", DC),
  DE: places<LocalJurisdiction>("DE", DE),
  FL: places<LocalJurisdiction>("FL", FL),
  GA: places<LocalJurisdiction>("GA", GA),
  HI: places<LocalJurisdiction>("HI", HI),
  IA: places<LocalJurisdiction>("IA", IA),
  ID: places<LocalJurisdiction>("ID", ID),
  IL: places<LocalJurisdiction>("IL", IL),
  IN: places<LocalJurisdiction>("IN", IN),
  KS: places<LocalJurisdiction>("KS", KS),
  KY: places<LocalJurisdiction>("KY", KY),
  LA: places<LocalJurisdiction>("LA", LA),
  MA: places<LocalJurisdiction>("MA", MA),
  MD: places<LocalJurisdiction>("MD", MD),
  ME: places<LocalJurisdiction>("ME", ME),
  MI: places<LocalJurisdiction>("MI", MI),
  MN: places<LocalJurisdiction>("MN", MN),
  MO: places<LocalJurisdiction>("MO", MO),
  MS: places<LocalJurisdiction>("MS", MS),
  MT: places<LocalJurisdiction>("MT", MT),
  NC: places<LocalJurisdiction>("NC", NC),
  ND: places<LocalJurisdiction>("ND", ND),
  NE: places<LocalJurisdiction>("NE", NE),
  NH: places<LocalJurisdiction>("NH", NH),
  NJ: places<LocalJurisdiction>("NJ", NJ),
  NM: places<LocalJurisdiction>("NM", NM),
  NV: places<LocalJurisdiction>("NV", NV),
  NY: places<LocalJurisdiction>("NY", NY),
  OH: places<LocalJurisdiction>("OH", OH),
  OK: places<LocalJurisdiction>("OK", OK),
  OR: places<LocalJurisdiction>("OR", OR),
  PA: places<LocalJurisdiction>("PA", PA),
  RI: places<LocalJurisdiction>("RI", RI),
  SC: places<LocalJurisdiction>("SC", SC),
  SD: places<LocalJurisdiction>("SD", SD),
  TN: places<LocalJurisdiction>("TN", TN),
  TX: places<LocalJurisdiction>("TX", TX),
  UT: places<LocalJurisdiction>("UT", UT),
  VA: places<LocalJurisdiction>("VA", VA),
  VT: places<LocalJurisdiction>("VT", VT),
  WA: places<LocalJurisdiction>("WA", WA),
  WI: places<LocalJurisdiction>("WI", WI),
  WV: places<LocalJurisdiction>("WV", WV),
  WY: places<LocalJurisdiction>("WY", WY),
};
