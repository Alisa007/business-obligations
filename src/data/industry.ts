export interface IndustryAuthorities {
  /** State general-contractor licensing/registration authority; null = no statewide license. */
  contractor: string | null;
  realEstate: string;
  alcohol: string;
  childCare: string;
  /** Health facility licensing authority. */
  health: string;
}

const t = (
  contractor: string | null,
  realEstate: string,
  alcohol: string,
  childCare: string,
  health: string,
): IndustryAuthorities => ({ contractor, realEstate, alcohol, childCare, health });

export const INDUSTRY_AUTHORITIES: Record<string, IndustryAuthorities> = {
  AL: t("Alabama Licensing Board for General Contractors", "Alabama Real Estate Commission", "Alabama Alcoholic Beverage Control Board", "Alabama Department of Human Resources", "Alabama Department of Public Health"),
  AK: t("Alaska Division of Corporations, Business and Professional Licensing", "Alaska Real Estate Commission", "Alaska Alcoholic Beverage Control Board", "Alaska Department of Health, Child Care Program Office", "Alaska Department of Health"),
  AZ: t("Arizona Registrar of Contractors", "Arizona Department of Real Estate", "Arizona Department of Liquor Licenses and Control", "Arizona Department of Health Services", "Arizona Department of Health Services"),
  AR: t("Arkansas Contractors Licensing Board", "Arkansas Real Estate Commission", "Arkansas Alcoholic Beverage Control Division", "Arkansas DHS Division of Child Care and Early Childhood Education", "Arkansas Department of Health"),
  CA: t("California Contractors State License Board", "California Department of Real Estate", "California Department of Alcoholic Beverage Control", "California Department of Social Services, Community Care Licensing", "California Department of Public Health"),
  CO: t(null, "Colorado Division of Real Estate", "Colorado Liquor Enforcement Division", "Colorado Department of Early Childhood", "Colorado Department of Public Health and Environment"),
  CT: t("Connecticut Department of Consumer Protection (home improvement contractor registration)", "Connecticut Department of Consumer Protection", "Connecticut DCP Liquor Control Division", "Connecticut Office of Early Childhood", "Connecticut Department of Public Health"),
  DE: t("Delaware Division of Revenue (contractor business license)", "Delaware Real Estate Commission", "Delaware Office of the Alcoholic Beverage Control Commissioner", "Delaware Office of Child Care Licensing", "Delaware Division of Health Care Quality"),
  DC: t("DC Department of Licensing and Consumer Protection", "DC Real Estate Commission", "DC Alcoholic Beverage and Cannabis Administration", "DC Office of the State Superintendent of Education", "DC Health"),
  FL: t("Florida Construction Industry Licensing Board (DBPR)", "Florida Real Estate Commission", "Florida Division of Alcoholic Beverages and Tobacco", "Florida Department of Children and Families", "Florida Agency for Health Care Administration"),
  GA: t("Georgia State Licensing Board for Residential and General Contractors", "Georgia Real Estate Commission", "Georgia Department of Revenue, Alcohol and Tobacco Division", "Georgia Department of Early Care and Learning", "Georgia Department of Community Health"),
  HI: t("Hawaii Contractors License Board", "Hawaii Real Estate Commission", "County liquor commission", "Hawaii Department of Human Services", "Hawaii Department of Health"),
  ID: t("Idaho Division of Occupational and Professional Licenses (contractor registration)", "Idaho Real Estate Commission", "Idaho State Police, Alcohol Beverage Control", "Idaho Department of Health and Welfare (with city/county licensing)", "Idaho Department of Health and Welfare"),
  IL: t(null, "Illinois Department of Financial and Professional Regulation", "Illinois Liquor Control Commission", "Illinois Department of Children and Family Services", "Illinois Department of Public Health"),
  IN: t(null, "Indiana Professional Licensing Agency", "Indiana Alcohol and Tobacco Commission", "Indiana FSSA Bureau of Child Care", "Indiana Department of Health"),
  IA: t("Iowa Division of Labor (contractor registration)", "Iowa Real Estate Commission", "Iowa Alcoholic Beverages Division", "Iowa Department of Health and Human Services", "Iowa Department of Inspections, Appeals, and Licensing"),
  KS: t(null, "Kansas Real Estate Commission", "Kansas Alcoholic Beverage Control", "Kansas Department of Health and Environment", "Kansas Department of Health and Environment"),
  KY: t(null, "Kentucky Real Estate Commission", "Kentucky Department of Alcoholic Beverage Control", "Kentucky Cabinet for Health and Family Services", "Kentucky Office of Inspector General"),
  LA: t("Louisiana State Licensing Board for Contractors", "Louisiana Real Estate Commission", "Louisiana Office of Alcohol and Tobacco Control", "Louisiana Department of Education", "Louisiana Department of Health"),
  ME: t(null, "Maine Real Estate Commission", "Maine Bureau of Alcoholic Beverages and Lottery Operations", "Maine Department of Health and Human Services", "Maine Department of Health and Human Services"),
  MD: t("Maryland Home Improvement Commission", "Maryland Real Estate Commission", "Maryland Alcohol, Tobacco and Cannabis Commission (with local boards)", "Maryland State Department of Education, Office of Child Care", "Maryland Department of Health"),
  MA: t("Massachusetts Office of Public Safety and Inspections (construction supervisor / home improvement contractor)", "Massachusetts Board of Registration of Real Estate Brokers and Salespersons", "Massachusetts Alcoholic Beverages Control Commission (with local licensing board)", "Massachusetts Department of Early Education and Care", "Massachusetts Department of Public Health"),
  MI: t("Michigan LARA (residential builders and maintenance and alteration contractors)", "Michigan LARA", "Michigan Liquor Control Commission", "Michigan LARA, Child Care Licensing Bureau", "Michigan LARA"),
  MN: t("Minnesota Department of Labor and Industry (residential building contractor license)", "Minnesota Department of Commerce", "Minnesota Alcohol and Gambling Enforcement Division (with city licensing)", "Minnesota Department of Children, Youth, and Families", "Minnesota Department of Health"),
  MS: t("Mississippi State Board of Contractors", "Mississippi Real Estate Commission", "Mississippi Department of Revenue, Alcoholic Beverage Control", "Mississippi State Department of Health", "Mississippi State Department of Health"),
  MO: t(null, "Missouri Real Estate Commission", "Missouri Division of Alcohol and Tobacco Control", "Missouri Department of Health and Senior Services", "Missouri Department of Health and Senior Services"),
  MT: t("Montana Department of Labor & Industry (contractor registration)", "Montana Board of Realty Regulation", "Montana Department of Revenue, Liquor Control Division", "Montana Department of Public Health and Human Services", "Montana Department of Public Health and Human Services"),
  NE: t("Nebraska Department of Labor (contractor registration)", "Nebraska Real Estate Commission", "Nebraska Liquor Control Commission", "Nebraska Department of Health and Human Services", "Nebraska Department of Health and Human Services"),
  NV: t("Nevada State Contractors Board", "Nevada Real Estate Division", "City or county liquor licensing authority", "Nevada Department of Health and Human Services (with local licensing)", "Nevada Division of Public and Behavioral Health"),
  NH: t(null, "New Hampshire Real Estate Commission", "New Hampshire Liquor Commission", "New Hampshire DHHS Child Care Licensing Unit", "New Hampshire Department of Health and Human Services"),
  NJ: t("New Jersey Division of Consumer Affairs (home improvement contractor registration)", "New Jersey Real Estate Commission", "New Jersey Division of Alcoholic Beverage Control (with municipal licensing)", "New Jersey Department of Children and Families", "New Jersey Department of Health"),
  NM: t("New Mexico Construction Industries Division", "New Mexico Real Estate Commission", "New Mexico Alcohol and Gaming Division", "New Mexico Early Childhood Education and Care Department", "New Mexico Department of Health"),
  NY: t(null, "New York Department of State, Division of Licensing Services", "New York State Liquor Authority", "New York Office of Children and Family Services", "New York State Department of Health"),
  NC: t("North Carolina Licensing Board for General Contractors", "North Carolina Real Estate Commission", "North Carolina ABC Commission", "North Carolina DHHS, Division of Child Development and Early Education", "North Carolina DHHS, Division of Health Service Regulation"),
  ND: t("North Dakota Secretary of State (contractor licensing)", "North Dakota Real Estate Commission", "North Dakota Office of Attorney General (with local licensing)", "North Dakota Department of Health and Human Services", "North Dakota Department of Health and Human Services"),
  OH: t("Ohio Construction Industry Licensing Board (commercial trades)", "Ohio Division of Real Estate and Professional Licensing", "Ohio Division of Liquor Control", "Ohio Department of Children and Youth", "Ohio Department of Health"),
  OK: t("Oklahoma Construction Industries Board (trade licenses)", "Oklahoma Real Estate Commission", "Oklahoma Alcoholic Beverage Laws Enforcement Commission", "Oklahoma Department of Human Services", "Oklahoma State Department of Health"),
  OR: t("Oregon Construction Contractors Board", "Oregon Real Estate Agency", "Oregon Liquor and Cannabis Commission", "Oregon Department of Early Learning and Care", "Oregon Health Authority"),
  PA: t("Pennsylvania Office of Attorney General (home improvement contractor registration)", "Pennsylvania State Real Estate Commission", "Pennsylvania Liquor Control Board", "Pennsylvania DHS, Office of Child Development and Early Learning", "Pennsylvania Department of Health"),
  RI: t("Rhode Island Contractors' Registration and Licensing Board", "Rhode Island Department of Business Regulation", "Rhode Island DBR Liquor Control Administration (with local boards)", "Rhode Island Department of Children, Youth and Families", "Rhode Island Department of Health"),
  SC: t("South Carolina Contractors' Licensing Board", "South Carolina Real Estate Commission", "South Carolina Department of Revenue, Alcohol Beverage Licensing", "South Carolina Department of Social Services", "South Carolina Department of Public Health"),
  SD: t(null, "South Dakota Real Estate Commission", "South Dakota Department of Revenue (with local licensing)", "South Dakota Department of Social Services", "South Dakota Department of Health"),
  TN: t("Tennessee Board for Licensing Contractors", "Tennessee Real Estate Commission", "Tennessee Alcoholic Beverage Commission", "Tennessee Department of Human Services", "Tennessee Department of Health"),
  TX: t(null, "Texas Real Estate Commission", "Texas Alcoholic Beverage Commission", "Texas HHSC, Child Care Regulation", "Texas Health and Human Services Commission"),
  UT: t("Utah Division of Professional Licensing (DOPL)", "Utah Division of Real Estate", "Utah Department of Alcoholic Beverage Services", "Utah Department of Health and Human Services, Office of Licensing", "Utah Department of Health and Human Services"),
  VT: t(null, "Vermont Office of Professional Regulation", "Vermont Department of Liquor and Lottery", "Vermont DCF, Child Development Division", "Vermont Department of Health"),
  VA: t("Virginia Board for Contractors (DPOR)", "Virginia Real Estate Board (DPOR)", "Virginia Alcoholic Beverage Control Authority", "Virginia Department of Education, Office of Early Childhood", "Virginia Department of Health"),
  WA: t("Washington Department of Labor & Industries (contractor registration)", "Washington Department of Licensing", "Washington State Liquor and Cannabis Board", "Washington Department of Children, Youth, and Families", "Washington Department of Health"),
  WV: t("West Virginia Contractor Licensing Board", "West Virginia Real Estate Commission", "West Virginia Alcohol Beverage Control Administration", "West Virginia Department of Health", "West Virginia Department of Health, Office of Health Facility Licensure and Certification"),
  WI: t("Wisconsin Department of Safety and Professional Services (dwelling contractor qualifier)", "Wisconsin Department of Safety and Professional Services", "Wisconsin Department of Revenue (with municipal licensing)", "Wisconsin Department of Children and Families", "Wisconsin Department of Health Services"),
  WY: t(null, "Wyoming Real Estate Commission", "Wyoming Department of Revenue, Liquor Division (with local licensing)", "Wyoming Department of Family Services", "Wyoming Department of Health"),
};
