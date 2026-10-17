import type { Catalog } from "../../i18n";

/**
 * Titles of the city and county items. `{1}` is a place name (kept as written); specific templates come first so that
 * "City of {1}" is not read as a place called "City of ...".
 */
export const localPatterns: NonNullable<Catalog["patterns"]> = [
  // ── Counties
  [
    "File {1} County business tangible personal property return",
    "Presentar la declaración de bienes muebles tangibles comerciales del condado de {1}",
  ],
  [
    "File City of {1} business tangible personal property return",
    "Presentar la declaración de bienes muebles tangibles comerciales de la ciudad de {1}",
  ],
  [
    "File City of {1} business personal property return",
    "Presentar la declaración de bienes muebles comerciales de la ciudad de {1}",
  ],
  ["Renew the {1} County business license (BPOL)", "Renovar la licencia comercial del condado de {1} (BPOL)"],
  [
    "File {1} County business personal property return",
    "Presentar la declaración de bienes muebles comerciales del condado de {1}",
  ],
  [
    "File {1} business personal property return",
    "Presentar la declaración de bienes muebles comerciales de {1}",
  ],
  [
    "File {1} business tangible personal property return",
    "Presentar la declaración de bienes muebles tangibles comerciales de {1}",
  ],
  [
    "List business personal property with the {1} County Assessor",
    "Declarar los bienes muebles comerciales ante el tasador del condado de {1}",
  ],
  [
    "Obtain or renew the {1} County business tax receipt",
    "Obtener o renovar el recibo del impuesto comercial del condado de {1}",
  ],
  [
    "Renew the {1} County business occupational tax certificate",
    "Renovar el certificado del impuesto ocupacional comercial del condado de {1}",
  ],
  [
    "File the {1} Parish sales and use tax return",
    "Presentar la declaración del impuesto sobre ventas y uso de la parroquia de {1}",
  ],
  [
    "File the {1} County sales and use tax return",
    "Presentar la declaración del impuesto sobre ventas y uso del condado de {1}",
  ],
  [
    "File the {1} County sales tax return",
    "Presentar la declaración del impuesto sobre ventas del condado de {1}",
  ],
  [
    "File the {1} sales and use tax return",
    "Presentar la declaración del impuesto sobre ventas y uso de {1}",
  ],
  ["File the {1} sales tax return", "Presentar la declaración del impuesto sobre ventas de {1}"],
  [
    "Register with the {1} County local tax collector for earned income tax and local services tax",
    "Registrarse ante el recaudador de impuestos locales del condado de {1} para el impuesto sobre ingresos del trabajo y el impuesto de servicios locales",
  ],
  [
    "Remit local earned income tax and local services tax for {1} County worksites",
    "Remitir el impuesto local sobre ingresos del trabajo y el impuesto de servicios locales de los lugares de trabajo del condado de {1}",
  ],
  [
    "File the W-2R earned income tax reconciliation for {1} County",
    "Presentar la conciliación W-2R del impuesto sobre ingresos del trabajo del condado de {1}",
  ],
  [
    "File the {1} occupational license fee withholding return (Forms {2}/{3})",
    "Presentar la declaración de retención de la tarifa de licencia ocupacional de {1} (Formularios {2}/{3})",
  ],
  [
    "File the {1} net profit license fee return (Form {2})",
    "Presentar la declaración de la tarifa de licencia sobre ganancias netas de {1} (Formulario {2})",
  ],
  [
    "File the {1} Metro occupational license tax withholding return (Form W-{2})",
    "Presentar la declaración de retención del impuesto de licencia ocupacional de {1} Metro (Formulario W-{2})",
  ],
  [
    "File the {1} Metro net profit license tax return (Form OL-{2})",
    "Presentar la declaración del impuesto de licencia sobre ganancias netas de {1} Metro (Formulario OL-{2})",
  ],
  [
    "File the {1} Transit District payroll tax with the {2} Quarterly Tax Report",
    "Presentar el impuesto sobre la nómina del Distrito de Tránsito de {1} con el informe trimestral de impuestos de {2}",
  ],
  [
    "File the TriMet transit payroll tax with the {1} Quarterly Tax Report",
    "Presentar el impuesto de tránsito sobre la nómina de TriMet con el informe trimestral de impuestos de {1}",
  ],
  [
    "Withhold the Metro Supportive Housing Services income tax for high earners",
    "Retener el impuesto sobre la renta de Metro Supportive Housing Services a quienes tienen ingresos altos",
  ],
  [
    "Withhold the {1} County Preschool for All tax from high earners",
    "Retener el impuesto Preschool for All del condado de {1} a quienes tienen ingresos altos",
  ],
  [
    "Register for the {1} Wage Tax as an employer",
    "Registrarse como empleador para el impuesto sobre salarios de {1}",
  ],
  ["File and deposit the {1} Wage Tax", "Presentar y depositar el impuesto sobre salarios de {1}"],
  [
    "Submit W-2s and reconcile the {1} Wage Tax",
    "Enviar los W-2 y conciliar el impuesto sobre salarios de {1}",
  ],

  // ── Cities: obtain, hold, register
  [
    "Obtain {1} and {2} County business licenses",
    "Obtener las licencias comerciales de {1} y del condado de {2}",
  ],
  ["Obtain {1} / {2} County business license", "Obtener la licencia comercial de {1} y del condado de {2}"],
  [
    "Obtain and renew {1} County Local Business Tax Receipt",
    "Obtener y renovar el recibo del impuesto comercial local del condado de {1}",
  ],
  [
    "Obtain and renew City of {1} Business Tax Receipt",
    "Obtener y renovar el recibo del impuesto comercial de la ciudad de {1}",
  ],
  [
    "Obtain and renew {1} trader's license from the {2} Clerk of the Circuit Court",
    "Obtener y renovar la licencia de comerciante de {1} ante la secretaría del tribunal de circuito de {2}",
  ],
  [
    "Obtain and renew {1} Business Tax Registration Certificate",
    "Obtener y renovar el certificado de registro del impuesto comercial de {1}",
  ],
  [
    "Obtain and renew {1} Business Tax Certificate",
    "Obtener y renovar el certificado del impuesto comercial de {1}",
  ],
  [
    "Obtain and renew {1} Business Occupational Tax Certificate",
    "Obtener y renovar el certificado del impuesto ocupacional comercial de {1}",
  ],
  ["Obtain and renew {1} occupational license", "Obtener y renovar la licencia ocupacional de {1}"],
  ["Obtain and renew the {1} business license", "Obtener y renovar la licencia comercial de {1}"],
  ["Obtain and renew {1} business license", "Obtener y renovar la licencia comercial de {1}"],
  [
    "Obtain and recertify {1} business certificate of use",
    "Obtener y recertificar el certificado comercial de uso de {1}",
  ],
  [
    "Obtain City of {1} transaction privilege (sales) tax license",
    "Obtener la licencia del impuesto por privilegio de transacción (ventas) de la ciudad de {1}",
  ],
  ["Obtain City of {1} business license", "Obtener la licencia comercial de la ciudad de {1}"],
  ["Obtain a City of {1} business license", "Obtener una licencia comercial de la ciudad de {1}"],
  ["Obtain an annual {1} occupational license", "Obtener una licencia ocupacional anual de {1}"],
  ["Obtain a {1} sales and use tax license", "Obtener una licencia del impuesto sobre ventas y uso de {1}"],
  ["Obtain {1} sales and use tax license", "Obtener la licencia del impuesto sobre ventas y uso de {1}"],
  ["Obtain {1} Commercial Activity License", "Obtener la licencia de actividad comercial de {1}"],
  [
    "Obtain {1} business license tax certificate and file B&O tax",
    "Obtener el certificado del impuesto de licencia comercial de {1} y presentar el impuesto B&O",
  ],
  [
    "Obtain or renew the {1} County business license",
    "Obtener o renovar la licencia comercial del condado de {1}",
  ],
  ["Obtain {1} business license", "Obtener la licencia comercial de {1}"],
  ["Hold a Town of {1} business license", "Contar con una licencia comercial del pueblo de {1}"],
  ["Hold a City of {1} business license", "Contar con una licencia comercial de la ciudad de {1}"],
  ["Hold a {1} general business license", "Contar con una licencia comercial general de {1}"],
  [
    "Hold a {1} sales and use tax business license",
    "Contar con una licencia comercial del impuesto sobre ventas y uso de {1}",
  ],
  ["Hold a {1} sales and use tax license", "Contar con una licencia del impuesto sobre ventas y uso de {1}"],
  ["Hold {1} sales tax license", "Contar con la licencia del impuesto sobre ventas de {1}"],
  ["Hold a {1} mercantile license", "Contar con una licencia mercantil de {1}"],
  ["Hold a {1} business registration", "Contar con un registro comercial de {1}"],
  ["Hold and renew {1} business licenses", "Contar con las licencias comerciales de {1} y renovarlas"],
  [
    "Hold a {1} city endorsement on your state business license",
    "Contar con el aval de la ciudad de {1} en su licencia comercial estatal",
  ],
  [
    "Hold a {1} city business license endorsement",
    "Contar con el aval de la licencia comercial de la ciudad de {1}",
  ],
  ["Hold an {1} business license", "Contar con una licencia comercial de {1}"],
  ["Hold a {1} business license", "Contar con una licencia comercial de {1}"],
  ["Register your business with the City of {1}", "Registrar su negocio ante la ciudad de {1}"],
  [
    "Register for and renew {1} Business Tax Certificate",
    "Registrarse y renovar el certificado del impuesto comercial de {1}",
  ],
  [
    "Register for and withhold {1} occupational license tax (W-{2})",
    "Registrarse y retener el impuesto de licencia ocupacional de {1} (W-{2})",
  ],
  [
    "Register for and withhold {1} city income tax",
    "Registrarse y retener el impuesto municipal sobre la renta de {1}",
  ],
  [
    "Register for {1} payroll expense tax and local services tax",
    "Registrarse para el impuesto sobre gastos de nómina y el impuesto de servicios locales de {1}",
  ],
  [
    "Register as a lodging provider for {1} hotel occupancy tax",
    "Registrarse como proveedor de alojamiento para el impuesto de ocupación hotelera de {1}",
  ],
  ["Register or renew {1} business registration", "Registrar o renovar el registro comercial de {1}"],

  // ── Cities: renew
  ["Renew City of {1} business tax receipt", "Renovar el recibo del impuesto comercial de la ciudad de {1}"],
  ["Renew City of {1} business license", "Renovar la licencia comercial de la ciudad de {1}"],
  ["Renew {1} general business license", "Renovar la licencia comercial general de {1}"],
  [
    "Renew {1} sales tax license or business registration",
    "Renovar la licencia del impuesto sobre ventas o el registro comercial de {1}",
  ],
  ["Renew {1} business registration certificate", "Renovar el certificado de registro comercial de {1}"],
  ["Renew {1} Business Registration Certificate", "Renovar el certificado de registro comercial de {1}"],
  ["Renew {1} business registration", "Renovar el registro comercial de {1}"],
  ["Renew {1} retail business registration", "Renovar el registro comercial minorista de {1}"],
  ["Renew {1} business license tax", "Renovar el impuesto de licencia comercial de {1}"],
  [
    "Renew {1} business license and file B&O tax",
    "Renovar la licencia comercial de {1} y presentar el impuesto B&O",
  ],
  [
    "Renew the City of {1} business license (BPOL)",
    "Renovar la licencia comercial de la ciudad de {1} (BPOL)",
  ],
  ["Renew {1} business license (BPOL)", "Renovar la licencia comercial de {1} (BPOL)"],
  ["Renew the {1} business license (BPOL)", "Renovar la licencia comercial de {1} (BPOL)"],
  ["Renew {1} business license", "Renovar la licencia comercial de {1}"],
  ["Renew {1} local business tax receipt", "Renovar el recibo del impuesto comercial local de {1}"],
  ["Renew {1} business tax receipt", "Renovar el recibo del impuesto comercial de {1}"],
  ["Renew {1} business tax certificate", "Renovar el certificado del impuesto comercial de {1}"],
  ["Renew {1} occupation tax certificate", "Renovar el certificado del impuesto de ocupación de {1}"],
  ["Renew {1}, {2} occupation tax license", "Renovar la licencia del impuesto de ocupación de {1}, {2}"],
  ["Renew {1} occupational license", "Renovar la licencia ocupacional de {1}"],
  ["Renew {1} mercantile license", "Renovar la licencia mercantil de {1}"],

  // ── Cities: file, pay, withhold, provide
  ["File a {1} business certificate (DBA)", "Presentar un certificado comercial (DBA) de {1}"],
  [
    "File {1} business certificate (DBA) with the City Clerk",
    "Presentar el certificado comercial (DBA) de {1} ante la secretaría municipal",
  ],
  [
    "File fictitious firm name with the {1} County Clerk",
    "Presentar el nombre comercial ficticio ante la secretaría del condado de {1}",
  ],
  [
    "File {1} municipal net profit tax return",
    "Presentar la declaración municipal del impuesto sobre ganancias netas de {1}",
  ],
  [
    "File {1} municipal net profit return (CCA)",
    "Presentar la declaración municipal de ganancias netas de {1} (CCA)",
  ],
  [
    "File {1} business and occupation tax returns",
    "Presentar las declaraciones del impuesto sobre negocios y ocupación de {1}",
  ],
  [
    "File and pay the City of {1} Business and Occupation tax",
    "Presentar y pagar el impuesto sobre negocios y ocupación de la ciudad de {1}",
  ],
  [
    "File the City of {1} Business & Occupation tax return",
    "Presentar la declaración del impuesto sobre negocios y ocupación de la ciudad de {1}",
  ],
  [
    "File {1} gross receipts tax return",
    "Presentar la declaración del impuesto sobre ingresos brutos de {1}",
  ],
  [
    "File {1} payroll expense tax and earnings tax withholding (P-{2}/W-{3})",
    "Presentar el impuesto sobre gastos de nómina y la retención del impuesto sobre ingresos de {1} (P-{2}/W-{3})",
  ],
  [
    "File {1} payroll expense tax return",
    "Presentar la declaración del impuesto sobre gastos de nómina de {1}",
  ],
  [
    "File {1} Metro occupational license tax net profits return (OL-{2})",
    "Presentar la declaración de ganancias netas del impuesto de licencia ocupacional de {1} Metro (OL-{2})",
  ],
  [
    "File {1} corporate or partnership income tax return",
    "Presentar la declaración del impuesto sobre la renta de corporaciones o sociedades de {1}",
  ],
  [
    "File {1} city income tax withholding reconciliation",
    "Presentar la conciliación de la retención del impuesto municipal sobre la renta de {1}",
  ],
  [
    "File {1} city income tax business return",
    "Presentar la declaración comercial del impuesto municipal sobre la renta de {1}",
  ],
  [
    "File {1} earnings and profits tax return (RD-{2})",
    "Presentar la declaración del impuesto sobre ingresos y ganancias de {1} (RD-{2})",
  ],
  [
    "File {1} business earnings tax return",
    "Presentar la declaración del impuesto sobre ingresos comerciales de {1}",
  ],
  [
    "File {1} employer payroll tax returns",
    "Presentar las declaraciones del impuesto sobre la nómina del empleador de {1}",
  ],
  [
    "File {1} business net profit tax return",
    "Presentar la declaración del impuesto sobre ganancias netas comerciales de {1}",
  ],
  [
    "File {1} business income tax return",
    "Presentar la declaración del impuesto sobre la renta comercial de {1}",
  ],
  [
    "File {1} and {2} County business income taxes",
    "Presentar los impuestos sobre la renta comercial de {1} y del condado de {2}",
  ],
  ["File {1} business privilege tax", "Presentar el impuesto de privilegio comercial de {1}"],
  [
    "File {1} Business Income & Receipts Tax (BIRT)",
    "Presentar el impuesto sobre ingresos y recibos comerciales de {1} (BIRT)",
  ],
  [
    "File the {1} hotel occupancy tax report",
    "Presentar el informe del impuesto de ocupación hotelera de {1}",
  ],
  [
    "File the {1} business personal property report",
    "Presentar el informe de bienes muebles comerciales de {1}",
  ],
  ["Pay the City of {1} business license fee", "Pagar la tarifa de licencia comercial de la ciudad de {1}"],
  ["Pay {1} business operations tax", "Pagar el impuesto sobre las operaciones comerciales de {1}"],
  ["Pay {1} annual business tax", "Pagar el impuesto comercial anual de {1}"],
  [
    "Withhold and remit {1} Occupational Privilege Tax (OPT)",
    "Retener y remitir el impuesto de privilegio ocupacional de {1} (OPT)",
  ],
  [
    "Withhold and remit {1} earnings tax (RD-{2})",
    "Retener y remitir el impuesto sobre ingresos de {1} (RD-{2})",
  ],
  [
    "Withhold and remit {1} municipal income tax (CCA)",
    "Retener y remitir el impuesto municipal sobre la renta de {1} (CCA)",
  ],
  [
    "Withhold and remit {1} municipal income tax",
    "Retener y remitir el impuesto municipal sobre la renta de {1}",
  ],
  ["Withhold and remit {1} income tax", "Retener y remitir el impuesto sobre la renta de {1}"],
  ["Withhold and remit {1} Wage Tax", "Retener y remitir el impuesto sobre salarios de {1}"],
  [
    "Remit the {1} City Service Fee withheld from employees",
    "Remitir la tarifa de servicio de la ciudad de {1} retenida a los empleados",
  ],
  [
    "Complete the City of {1} business registration application",
    "Completar la solicitud de registro comercial de la ciudad de {1}",
  ],
  [
    "Provide {1} Paid Leave and Paid Sick and Safe Leave",
    "Otorgar la licencia remunerada y la licencia remunerada por enfermedad y seguridad de {1}",
  ],
  ["Provide {1} sick and safe time", "Otorgar el tiempo por enfermedad y seguridad de {1}"],

  // ── Descriptions of the state-level local licensing overview
  [
    "{1:p} cities and counties issue general business licenses and collect local sales/use taxes.",
    "Las ciudades y los condados de {1} emiten licencias comerciales generales y cobran impuestos locales sobre ventas y uso.",
  ],
  [
    "Many {1:p} municipalities require a local business license.",
    "Muchos municipios de {1} exigen una licencia comercial local.",
  ],
  [
    "Many {1} cities require their own TPT licence (or program license) and local business licenses; some cities self-administer TPT.",
    "Muchas ciudades de {1} exigen su propia licencia TPT (o licencia de programa) y licencias comerciales locales; algunas ciudades administran el TPT por su cuenta.",
  ],
  [
    "Every {1} city levies a business license tax; unincorporated areas use the county. Fictitious names are filed with the county clerk.",
    "Todas las ciudades de {1} cobran un impuesto de licencia comercial; las áreas no incorporadas dependen del condado. Los nombres ficticios se registran ante la secretaría del condado.",
  ],
  [
    "{1:p} has no general local business license; trade names are registered with the town clerk.",
    "{1} no tiene una licencia comercial local general; los nombres comerciales se registran ante la secretaría del pueblo.",
  ],
  [
    "{1:p} local governments issue business/occupation tax certificates.",
    "Los gobiernos locales de {1} emiten certificados del impuesto comercial o de ocupación.",
  ],
  [
    "{1} has no general local business license; counties issue zoning, building and industry permits.",
    "{1} no tiene una licencia comercial local general; los condados emiten permisos de zonificación, construcción y de la industria.",
  ],
  [
    "{1:p} has no general local business license; zoning and industry permits apply.",
    "{1} no tiene una licencia comercial local general; se aplican los permisos de zonificación y de la industria.",
  ],
  [
    "Some {1:p} cities require business licenses; most licensing is industry-specific.",
    "Algunas ciudades de {1} exigen licencias comerciales; la mayoría de las licencias son específicas de cada industria.",
  ],
  [
    "{1} has no general local business license; local zoning/occupancy and industry permits apply.",
    "{1} no tiene una licencia comercial local general; se aplican los permisos locales de zonificación y ocupación y los de la industria.",
  ],
  [
    "Many {1:p} cities require a local occupation or business license.",
    "Muchas ciudades de {1} exigen una licencia local de ocupación o comercial.",
  ],
  [
    "{1:p} has no general business license; municipalities license specific activities.",
    "{1} no tiene una licencia comercial general; los municipios otorgan licencias para actividades específicas.",
  ],
  [
    "{1} cities may require local business licenses; several levy city income taxes (e.g., Detroit).",
    "Las ciudades de {1} pueden exigir licencias comerciales locales; varias cobran impuestos municipales sobre la renta (p. ej., Detroit).",
  ],
  [
    "{1:p} cities license specific activities; no general state-wide business license.",
    "Las ciudades de {1} otorgan licencias para actividades específicas; no hay una licencia comercial general en todo el estado.",
  ],
  [
    "{1} City, St. Louis and many cities require business licenses and occupational taxes.",
    "{1} City, St. Louis y muchas ciudades exigen licencias comerciales e impuestos ocupacionales.",
  ],
  [
    "{1:p} cities and the state issue privilege licenses for businesses and professions.",
    "Las ciudades de {1} y el estado emiten licencias de privilegio para negocios y profesiones.",
  ],
  [
    "Some {1:p} cities and counties require a local business license.",
    "Algunas ciudades y condados de {1} exigen una licencia comercial local.",
  ],
  [
    "{1:p} repealed local privilege licenses; local zoning and occupancy approvals still apply.",
    "{1} derogó las licencias locales de privilegio; las aprobaciones locales de zonificación y ocupación siguen vigentes.",
  ],
  [
    "Some {1:p} cities license specific businesses.",
    "Algunas ciudades de {1} otorgan licencias a negocios específicos.",
  ],
  [
    "{1:p} has no general local business license; local zoning and health permits apply.",
    "{1} no tiene una licencia comercial local general; se aplican los permisos locales de zonificación y de salud.",
  ],
  [
    "{1:p} requires a local business license in addition to the state business license.",
    "{1} exige una licencia comercial local además de la licencia comercial estatal.",
  ],
  [
    "{1} has no general business license; NYC and other cities license specific industries.",
    "{1} no tiene una licencia comercial general; la Ciudad de Nueva York y otras ciudades otorgan licencias a industrias específicas.",
  ],
  [
    "{1} municipalities levy net profits and payroll income taxes; register via the {2} Business Gateway or the city.",
    "Los municipios de {1} cobran impuestos sobre la renta de las ganancias netas y de la nómina; el registro se hace mediante el {2} Business Gateway o la ciudad.",
  ],
  [
    "Some {1:p} cities require business licenses and local sales tax registration.",
    "Algunas ciudades de {1} exigen licencias comerciales y el registro del impuesto local sobre ventas.",
  ],
  [
    "Every {1} business needs a local business license under the Business License Tax Standardization Act.",
    "Todo negocio de {1} necesita una licencia comercial local conforme a la Business License Tax Standardization Act.",
  ],
  [
    "Some {1:p} cities require licenses for specific businesses.",
    "Algunas ciudades de {1} exigen licencias para negocios específicos.",
  ],
  [
    "{1} businesses obtain a local business license and file state-local Business Tax returns.",
    "Los negocios de {1} obtienen una licencia comercial local y presentan declaraciones del impuesto comercial estatal y local.",
  ],
  [
    "{1} has no general state or city business license; occupancy, health, signage and industry permits are local, and DBAs go to the county clerk.",
    "{1} no tiene una licencia comercial general estatal ni municipal; los permisos de ocupación, salud, rótulos y de la industria son locales, y los DBA se registran ante la secretaría del condado.",
  ],
  [
    "{1:p} cities and counties require business licenses.",
    "Las ciudades y los condados de {1} exigen licencias comerciales.",
  ],
  [
    "{1:p} localities require a Business, Professional and Occupational License (BPOL).",
    "Las localidades de {1} exigen una Licencia Comercial, Profesional y Ocupacional (BPOL).",
  ],
  [
    "{1:p} has no general business license; town zoning and local permits apply.",
    "{1} no tiene una licencia comercial general; se aplican la zonificación del pueblo y los permisos locales.",
  ],
  [
    "{1:p} has no general business license; local permits and zoning approvals apply.",
    "{1} no tiene una licencia comercial general; se aplican los permisos locales y las aprobaciones de zonificación.",
  ],
  [
    "{1:p} municipalities levy B&O taxes and issue local business licenses.",
    "Los municipios de {1} cobran impuestos B&O y emiten licencias comerciales locales.",
  ],
  [
    "{1:p} cities and towns issue local business licenses.",
    "Las ciudades y los pueblos de {1} emiten licencias comerciales locales.",
  ],

  // ── Florida tourist development tax registrations (the rate may carry a qualifier, translated on its own)
  [
    "Operators of hotels, motels and short-term rentals (stays of six months or less) register with the county to collect the {1} tourist development tax. Florida's Department of Revenue lists {2} as a county that collects it directly rather than through the state sales tax return; the state sales tax on the same rentals is still filed on the DR-15 (line D).",
    "Los operadores de hoteles, moteles y alquileres de corta duración (estancias de seis meses o menos) se registran ante el condado para cobrar el impuesto de desarrollo turístico del {1}. El Departamento de Ingresos de Florida incluye a {2} entre los condados que lo cobran directamente y no mediante la declaración del impuesto estatal sobre ventas; el impuesto estatal sobre ventas de los mismos alquileres se sigue presentando en el formulario DR-15 (línea D).",
  ],

  // ── New York MCTMT (payroll tax by zone)
  [
    "Employers that must withhold New York income tax and have more than $312,500 of payroll expense in a quarter within the Metropolitan Commuter Transportation District (the five New York City counties and Dutchess, Nassau, Orange, Putnam, Rockland, Suffolk and Westchester) file Form MTA-305 each quarter. {1} County is in Zone {2}, where the tax is {3}. The employer pays it and may not deduct it from wages. There are no extensions.",
    "Los empleadores que deben retener el impuesto sobre la renta de Nueva York y tienen más de $312,500 de gasto de nómina en un trimestre dentro del Distrito de Transporte Metropolitano de Viajeros (los cinco condados de la Ciudad de Nueva York y Dutchess, Nassau, Orange, Putnam, Rockland, Suffolk y Westchester) presentan el Formulario MTA-305 cada trimestre. El condado de {1} está en la Zona {2}, donde el impuesto es {3}. Lo paga el empleador y no puede descontarlo de los salarios. No hay prórrogas.",
  ],
  [
    "{1} on payroll up to {2}, {3} up to {4}, {5} up to {6} and {7} above",
    "{1} sobre la nómina de hasta {2}, {3} hasta {4}, {5} hasta {6} y {7} por encima",
  ],

  // ── Florida county business tax receipts: a fixed opening, then county-specific sentences (translated one by one)
  [
    "{1} County issues a business tax receipt through its Tax Collector. Florida law makes the receipt payable by September 30 (late penalty 10% for October, then 5% more each month, up to 25%). {2!}",
    "El condado de {1} emite un recibo del impuesto comercial mediante su recaudador de impuestos. La ley de Florida establece que el recibo se paga antes del 30 de septiembre (multa por mora del 10% en octubre y luego un 5% más cada mes, hasta el 25%). {2}",
  ],
];
