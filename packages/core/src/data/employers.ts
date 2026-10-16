// Per-state files of employer mandates; edit data/employers/*.json, then list the file here.
import AL from "../../data/employers/AL.json";
import AZ from "../../data/employers/AZ.json";
import CA from "../../data/employers/CA.json";
import CO from "../../data/employers/CO.json";
import CT from "../../data/employers/CT.json";
import DE from "../../data/employers/DE.json";
import FL from "../../data/employers/FL.json";
import GA from "../../data/employers/GA.json";
import IL from "../../data/employers/IL.json";
import LA from "../../data/employers/LA.json";
import MD from "../../data/employers/MD.json";
import ME from "../../data/employers/ME.json";
import MN from "../../data/employers/MN.json";
import MS from "../../data/employers/MS.json";
import NC from "../../data/employers/NC.json";
import NJ from "../../data/employers/NJ.json";
import NV from "../../data/employers/NV.json";
import NY from "../../data/employers/NY.json";
import OR from "../../data/employers/OR.json";
import SC from "../../data/employers/SC.json";
import TN from "../../data/employers/TN.json";
import UT from "../../data/employers/UT.json";
import VA from "../../data/employers/VA.json";
import VT from "../../data/employers/VT.json";
import type { LocalItem } from "./types";

/** Obligations a state places on employers by headcount (retirement plan registration, E-Verify, harassment training), by state code. */
export const EMPLOYER_ITEMS: Record<string, LocalItem[]> = {
  AL: AL as LocalItem[],
  AZ: AZ as LocalItem[],
  CA: CA as LocalItem[],
  CO: CO as LocalItem[],
  CT: CT as LocalItem[],
  DE: DE as LocalItem[],
  FL: FL as LocalItem[],
  GA: GA as LocalItem[],
  IL: IL as LocalItem[],
  LA: LA as LocalItem[],
  MD: MD as LocalItem[],
  ME: ME as LocalItem[],
  MN: MN as LocalItem[],
  MS: MS as LocalItem[],
  NC: NC as LocalItem[],
  NJ: NJ as LocalItem[],
  NV: NV as LocalItem[],
  NY: NY as LocalItem[],
  OR: OR as LocalItem[],
  SC: SC as LocalItem[],
  TN: TN as LocalItem[],
  UT: UT as LocalItem[],
  VA: VA as LocalItem[],
  VT: VT as LocalItem[],
};
