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
  AK: places<CountyJurisdiction>("AK", AK),
  AL: places<CountyJurisdiction>("AL", AL),
  AR: places<CountyJurisdiction>("AR", AR),
  AZ: places<CountyJurisdiction>("AZ", AZ),
  CA: places<CountyJurisdiction>("CA", CA),
  CO: places<CountyJurisdiction>("CO", CO),
  CT: places<CountyJurisdiction>("CT", CT),
  DC: places<CountyJurisdiction>("DC", DC),
  DE: places<CountyJurisdiction>("DE", DE),
  FL: places<CountyJurisdiction>("FL", FL),
  GA: places<CountyJurisdiction>("GA", GA),
  HI: places<CountyJurisdiction>("HI", HI),
  IA: places<CountyJurisdiction>("IA", IA),
  ID: places<CountyJurisdiction>("ID", ID),
  IL: places<CountyJurisdiction>("IL", IL),
  IN: places<CountyJurisdiction>("IN", IN),
  KS: places<CountyJurisdiction>("KS", KS),
  KY: places<CountyJurisdiction>("KY", KY),
  LA: places<CountyJurisdiction>("LA", LA),
  MA: places<CountyJurisdiction>("MA", MA),
  MD: places<CountyJurisdiction>("MD", MD),
  ME: places<CountyJurisdiction>("ME", ME),
  MI: places<CountyJurisdiction>("MI", MI),
  MN: places<CountyJurisdiction>("MN", MN),
  MO: places<CountyJurisdiction>("MO", MO),
  MS: places<CountyJurisdiction>("MS", MS),
  MT: places<CountyJurisdiction>("MT", MT),
  NC: places<CountyJurisdiction>("NC", NC),
  ND: places<CountyJurisdiction>("ND", ND),
  NE: places<CountyJurisdiction>("NE", NE),
  NH: places<CountyJurisdiction>("NH", NH),
  NJ: places<CountyJurisdiction>("NJ", NJ),
  NM: places<CountyJurisdiction>("NM", NM),
  NV: places<CountyJurisdiction>("NV", NV),
  NY: places<CountyJurisdiction>("NY", NY),
  OH: places<CountyJurisdiction>("OH", OH),
  OK: places<CountyJurisdiction>("OK", OK),
  OR: places<CountyJurisdiction>("OR", OR),
  PA: places<CountyJurisdiction>("PA", PA),
  RI: places<CountyJurisdiction>("RI", RI),
  SC: places<CountyJurisdiction>("SC", SC),
  SD: places<CountyJurisdiction>("SD", SD),
  TN: places<CountyJurisdiction>("TN", TN),
  TX: places<CountyJurisdiction>("TX", TX),
  UT: places<CountyJurisdiction>("UT", UT),
  VA: places<CountyJurisdiction>("VA", VA),
  VT: places<CountyJurisdiction>("VT", VT),
  WA: places<CountyJurisdiction>("WA", WA),
  WI: places<CountyJurisdiction>("WI", WI),
  WV: places<CountyJurisdiction>("WV", WV),
  WY: places<CountyJurisdiction>("WY", WY),
};
