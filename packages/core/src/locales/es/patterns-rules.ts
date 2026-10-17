import type { Catalog } from "../../i18n";

/**
 * Text of the rules that depend on the business's own facts: closing a business, professional and alcohol licences,
 * cannabis, NAICS-based licences, foreign qualification and a few federal items.
 */
export const rulePatterns: NonNullable<Catalog["patterns"]> = [
  // ── Closing a business
  [
    "Business has employees and is being dissolved ({1})",
    "El negocio tiene empleados y se está disolviendo ({1})",
  ],
  [
    "Business is being dissolved ({1}) and has its principal place of business in {2:c}",
    "El negocio se está disolviendo ({1}) y tiene su sede principal en {2}",
  ],
  [
    "Business is being dissolved ({1}) and has employees or property in {2:c}",
    "El negocio se está disolviendo ({1}) y tiene empleados o bienes en {2}",
  ],
  ["Business is being dissolved ({1})", "El negocio se está disolviendo ({1})"],
  [
    "Entity is registered in {1:c} and is being dissolved",
    "La entidad está registrada en {1} y se está disolviendo",
  ],
  ["Close {1:p} state tax accounts", "Cerrar las cuentas de impuestos estatales de {1}"],
  [
    "File certificate or articles of dissolution (or cancellation) of the entity in {1:p}",
    "Presentar el certificado o los artículos de disolución (o cancelación) de la entidad en {1}",
  ],
  ["Withdraw the foreign registration in {1:p}", "Retirar el registro foráneo en {1}"],
  [
    "Cancel the trade name (DBA) registration in {1:p}",
    "Cancelar el registro del nombre comercial (DBA) en {1}",
  ],
  [
    "Close the local business license and permits in {1}",
    "Cerrar la licencia comercial local y los permisos en {1}",
  ],
  [
    "Ends the entity's existence in {1:p}. Settle debts and distribute remaining assets in the order the statute requires; some states require tax clearance or final reports first.",
    "Pone fin a la existencia de la entidad en {1}. Salde las deudas y distribuya los activos restantes en el orden que exige la ley; algunos estados exigen primero un certificado de libre deuda fiscal o informes finales.",
  ],
  [
    "File a certificate or application of withdrawal so {1:p} stops expecting annual reports and fees; final returns for the state's tax accounts come first.",
    "Presente un certificado o solicitud de retiro para que {1} deje de esperar informes y tarifas anuales; primero se presentan las declaraciones finales de las cuentas de impuestos del estado.",
  ],
  [
    "The tax year ends on the date the business is dissolved or ceases operations. Report the final year, dispose of assets (Form {1:n} or {2:n} where applicable) and mark the return as final.",
    "El año fiscal termina en la fecha en que el negocio se disuelve o cesa sus operaciones. Informe el último año, disponga de los activos (Formulario {1} o {2} cuando corresponda) y marque la declaración como final.",
  ],
  [
    "With {1}: file the final entity-level tax return; file a final sales tax return and cancel the sales tax permit; file the final unemployment wage report with {2} and close the account; file the final withholding return and annual reconciliation. Closing an account before final returns are filed can leave the owners liable for later notices.",
    "Ante {1}: presente la declaración final de impuestos a nivel de entidad; presente una declaración final del impuesto sobre ventas y cancele el permiso del impuesto sobre ventas; presente el informe salarial final de desempleo ante {2} y cierre la cuenta; presente la declaración final de retenciones y la conciliación anual. Cerrar una cuenta antes de presentar las declaraciones finales puede dejar a los propietarios expuestos a avisos posteriores.",
  ],
  [
    "With {1}: file the final entity-level tax return; file a final sales tax return and cancel the sales tax permit; file the final unemployment wage report with {2} and close the account. Closing an account before final returns are filed can leave the owners liable for later notices.",
    "Ante {1}: presente la declaración final de impuestos a nivel de entidad; presente una declaración final del impuesto sobre ventas y cancele el permiso del impuesto sobre ventas; presente el informe salarial final de desempleo ante {2} y cierre la cuenta. Cerrar una cuenta antes de presentar las declaraciones finales puede dejar a los propietarios expuestos a avisos posteriores.",
  ],

  // ── Professions and professional entities
  ["Hold and renew {1!} licence with the {2}", "Mantener y renovar la licencia de {1} ante {2}"],
  [
    "Individuals practising as {1!} in {2:p} must hold an active licence from the state board and meet its renewal and continuing-education rules.",
    "Las personas que ejercen como {1} en {2} deben tener una licencia vigente de la junta estatal y cumplir sus normas de renovación y educación continua.",
  ],
  ["Business practises the {1!} profession in {2:c}", "El negocio ejerce la profesión de {1} en {2}"],
  ["Register the LLP with its licensing board ({1!})", "Registrar la LLP ante su junta de licencias ({1})"],
  ["Register the PLLC with its licensing board ({1!})", "Registrar la PLLC ante su junta de licencias ({1})"],
  [
    "Register the professional corporation with its licensing board ({1!})",
    "Registrar la corporación profesional ante su junta de licencias ({1})",
  ],
  ["Register the LLP with its licensing board", "Registrar la LLP ante su junta de licencias"],
  ["Register the PLLC with its licensing board", "Registrar la PLLC ante su junta de licencias"],
  [
    "Register the professional corporation with its licensing board",
    "Registrar la corporación profesional ante su junta de licencias",
  ],
  ["Entity type {1!} is a professional entity", "El tipo de entidad {1} es una entidad profesional"],

  // ── Foreign qualification and multistate
  ["Register as a foreign LLC in {1:p}", "Registrarse como LLC foránea en {1}"],
  ["Register as a foreign entity in {1:p}", "Registrarse como entidad foránea en {1}"],
  ["Formed in {1:c} with employees or property in {2:c}", "Constituida en {1} con empleados o bienes en {2}"],
  [
    "Foreign registration in {1:c} requires a local registered agent",
    "El registro foráneo en {1} exige un agente registrado local",
  ],
  ["Registered as a foreign {1:w} in {2:c}", "Registrada como {1} foránea en {2}"],
  ["{1:w} with employees or property in {2:c}", "{1} con empleados o bienes en {2}"],
  ["Business has employees or property in {1:c}", "El negocio tiene empleados o bienes en {1}"],
  [
    "Physical presence in {1:c} and the business sells taxable goods",
    "Presencia física en {1} y el negocio vende bienes gravables",
  ],
  ["File LLP renewal statement ({1:p})", "Presentar la declaración de renovación de LLP ({1})"],
  ["File annual continuation report ({1:p})", "Presentar el informe anual de continuación ({1})"],
  ["Pay LLP annual fee ({1:p})", "Pagar la tarifa anual de LLP ({1})"],
  ["Renew LLP registration ({1:p})", "Renovar el registro de LLP ({1})"],

  // ── Alcohol and cannabis, by activity and state
  ["Obtain state alcohol {1!} license ({2:p})", "Obtener la licencia estatal de alcohol para {1} ({2})"],
  ["Obtain state cannabis {1!} license ({2:p})", "Obtener la licencia estatal de cannabis para {1} ({2})"],
  [
    "No state licensing pathway for cannabis {1!} in {2:p}",
    "No existe una vía de licencias estatales para el cannabis ({1}) en {2}",
  ],
  [
    "Industry is cannabis ({1!}); {2:p} status is {3!}",
    "El sector es el cannabis ({1}); el estatus de {2} es {3}",
  ],
  ["Industry is cannabis; {1:p} status is {2!}", "El sector es el cannabis; el estatus de {1} es {2}"],
  [
    "{1:p} has no lawful licensed THC cannabis industry (at most limited CBD or low-THC access); commercial cannabis activity is unlawful under state law. Hemp-derived products are regulated separately by state agriculture and the FDA.",
    "{1} no tiene una industria legal de cannabis con THC con licencia (como máximo, un acceso limitado a CBD o a productos con poco THC); la actividad comercial con cannabis es ilegal conforme a la ley estatal. Los productos derivados del cáñamo se regulan por separado por la agricultura estatal y la FDA.",
  ],
  [
    "{1:p}'s compassionate-use program is limited in scope.",
    "El programa de uso compasivo de {1} tiene un alcance limitado.",
  ],
  ["{1:p}'s medical program caps THC content.", "El programa médico de {1} limita el contenido de THC."],
  ["{1:p}'s program is limited to low-THC oil.", "El programa de {1} se limita al aceite con poco THC."],
  [
    "Adult-use retail sales are slated to begin {1}; only the medical program is licensed for sales today.",
    "Se prevé que las ventas minoristas para uso adulto comiencen el {1}; hoy solo el programa médico tiene licencia para vender.",
  ],

  // ── NAICS-based licences
  [
    "The business's NAICS code {1:n} falls under {2:n}",
    "El código NAICS del negocio, {1}, corresponde a {2}",
  ],

  // ── Federal items that depend on the business's own figures
  [
    "Quarterly estimated payments (Form {1:n}-W worksheet, deposited via EFTPS).",
    "Pagos estimados trimestrales (hoja de trabajo del Formulario {1}-W, depositados mediante EFTPS).",
  ],
  [
    "Quarterly estimated payments by owners on business income (Form {1:n}-ES), including self-employment tax.",
    "Pagos estimados trimestrales de los propietarios sobre los ingresos del negocio (Formulario {1}-ES), incluido el impuesto de trabajo por cuenta propia.",
  ],
  [
    "Expected net income of {1:n} is expected to generate tax due during the year",
    "Se espera que los ingresos netos previstos de {1} generen impuestos por pagar durante el año",
  ],
  [
    "{1:n} employees, above the {2:n}-employee threshold",
    "{1} empleados, por encima del umbral de {2} empleados",
  ],
  [
    "{1:n} employees, at or above the {2:n} that require electronic submission",
    "{1} empleados, igual o por encima de los {2} que exigen la presentación electrónica",
  ],
  [
    "{1:n} employees, at or above the 100 that require an EEO-1 report",
    "{1} empleados, igual o por encima de los 100 que exigen un informe EEO-1",
  ],
  [
    "Lookback-period liability of {1:w} makes the business a semiweekly depositor",
    "La obligación del período de referencia, de {1}, convierte al negocio en depositante bisemanal",
  ],
  ["Construction project valued at {1:n} USD", "Proyecto de construcción valorado en {1} USD"],
  [
    "Business operates from {1:n} sq ft of commercial premises",
    "El negocio opera desde {1} pies cuadrados de local comercial",
  ],
  ["Annual revenue is {1:n}", "Los ingresos anuales son de {1}"],
  [
    "Annual revenue of {1} exceeds the {2} threshold, so tax is due.",
    "Los ingresos anuales de {1} superan el umbral de {2}, por lo que se debe el impuesto.",
  ],
  [
    "Annual revenue of {1} is at or below the {2} threshold, so no tax is due (a filing may still be required).",
    "Los ingresos anuales de {1} son iguales o inferiores al umbral de {2}, por lo que no se debe impuesto (es posible que aun así se exija una presentación).",
  ],
  [
    "Tiered annual fee for LLCs with {1:p}-source gross receipts of {2} or more.",
    "Tarifa anual escalonada para las LLC con ingresos brutos de origen en {1} de {2} o más.",
  ],
  [
    "Commerce Tax on {1:p} gross revenue above {2} million; the rate depends on the industry; the return is due 45 days after the June 30 fiscal year end (August 14).",
    "Impuesto de Comercio sobre los ingresos brutos de {1} superiores a {2} millones; la tasa depende de la industria; la declaración vence 45 días después del cierre del año fiscal el 30 de junio (14 de agosto).",
  ],
  [
    "Commerce Tax on {1:p} gross revenue above {2} million; the rate depends on the industry; the return is due 45 days after the June 30 fiscal year end (August 14)",
    "Impuesto de Comercio sobre los ingresos brutos de {1} superiores a {2} millones; la tasa depende de la industria; la declaración vence 45 días después del cierre del año fiscal el 30 de junio (14 de agosto)",
  ],
  [
    "{1} of {2:p} taxable gross receipts above a {3} million exclusion; there is no annual minimum tax.",
    "{1} de los ingresos brutos gravables de {2} que superen una exclusión de {3} millones; no hay impuesto mínimo anual.",
  ],
  [
    "{1} plus 0.57% of {2:p} commercial activity above {3} million; no tax is owed at or below {4} million.",
    "{1} más 0.57% de la actividad comercial de {2} que supere {3} millones; no se debe impuesto con {4} millones o menos.",
  ],
  [
    "0.75% of taxable margin (0.375% for retail and wholesale); no tax due at or below {1} million of annualized total revenue, though the report is still filed.",
    "0.75% del margen gravable (0.375% para el comercio minorista y mayorista); no se debe impuesto con ingresos totales anualizados de {1} millones o menos, aunque el informe se presenta de todos modos.",
  ],
  [
    "Corporate excise tax and Corporate Activity Tax (CAT, gross receipts over {1} million); minimum excise tax by sales.",
    "Impuesto especial corporativo e Impuesto de Actividad Corporativa (CAT, ingresos brutos superiores a {1} millones); impuesto especial mínimo según las ventas.",
  ],
  [
    "Largest contractor payment is {1:n}, at or above the {2} threshold",
    "El mayor pago a un contratista es de {1}, igual o superior al umbral de {2}",
  ],
  [
    "{1:n} full-time employees, at or above the {2:n} that make an applicable large employer",
    "{1} empleados a tiempo completo, igual o por encima de los {2} que convierten al negocio en un gran empleador aplicable",
  ],
  [
    "Tax is due only when annual revenue exceeds {1}.",
    "El impuesto se debe solo cuando los ingresos anuales superan {1}.",
  ],
];
