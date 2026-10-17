import type { Catalog } from "../../i18n";

/**
 * Templates for text with variable parts (places, forms, fees, deadlines). The first template that matches wins, so
 * the specific ones come before the general ones. Official agency and program names are kept in English.
 */
export const patterns: NonNullable<Catalog["patterns"]> = [
  // ── Renewals: "Renew every year; due <deadline>". The deadline is translated on its own.
  ["Renew every year; due {1}", "Renovar cada año; vence: {1}"],
  ["Renew every two years; due {1}", "Renovar cada dos años; vence: {1}"],

  // ── Reasons
  ["{1:w} entities need an EIN", "Las entidades del tipo {1} necesitan un EIN"],
  ["Federal tax treatment is {1:w}", "El tratamiento fiscal federal es: {1}"],
  ["{1:p} requires a general state business license", "{1} exige una licencia comercial estatal general"],
  ["Entity is doing business in {1}", "La entidad hace negocios en {1}"],
  ["Business operates in {1}", "El negocio opera en {1}"],
  ["Business is located in City of {1}, {2:c}", "El negocio se encuentra en la ciudad de {1}, {2}"],
  ["Business is located in {1} County, {2:c}", "El negocio se encuentra en el condado de {1}, {2}"],
  ["Business is located in {1}, {2:c}", "El negocio se encuentra en {1}, {2}"],
  ["{1:w} with its principal place of business in {2:c}", "{1} con su sede principal en {2}"],
  ["{1:w} formed in {2:c}", "{1} constituida en {2}"],
  [
    "{1} levies income tax on wages; {2} employees in {3}",
    "{1} grava los salarios con impuesto sobre la renta; {2} empleados en {3}",
  ],
  [
    "{1} has a mandatory paid leave/disability program; {2} employees in {3}",
    "{1} tiene un programa obligatorio de licencia remunerada o por discapacidad; {2} empleados en {3}",
  ],
  [
    "{1:n} employees in {2} meets the {3} threshold ({4})",
    "{1} empleados en {2} cumplen el umbral de {3} ({4})",
  ],
  [
    "{1:n} employees in {2}, at or above the state's {3:n}-employee threshold",
    "{1} empleados en {2}, igual o por encima del umbral estatal de {3} empleados",
  ],
  ["{1:n} employees in {2}", "{1} empleados en {2}"],
  ["{1:n} employee (even part-time)", "{1} empleado (incluso a tiempo parcial)"],
  [
    "{1:n} employee (mandatory in extra-hazardous industries; optional otherwise)",
    "{1} empleado (obligatorio en industrias de riesgo extraordinario; opcional en las demás)",
  ],
  [
    "{1:n} employees, or {2:n} employee working {3:n}+ hours per week for {4:n} weeks",
    "{1} empleados, o {2} empleado que trabaje {3} horas o más por semana durante {4} semanas",
  ],
  [
    "{1:n} employees, or {2:w} of payroll in a calendar quarter",
    "{1} empleados, o {2} de nómina en un trimestre calendario",
  ],
  [
    "{1:n} employees (more than {2:n} regularly employed)",
    "{1} empleados (más de {2} empleados de forma regular)",
  ],
  ["{1:n} employees ({2:n} in construction)", "{1} empleados ({2} en construcción)"],
  ["Annual payroll over {1}", "Nómina anual superior a {1}"],
  ["{1:n} employees (annual payroll of {2} or more)", "{1} empleados (nómina anual de {2} o más)"],
  ["{1:n} employees", "{1} empleados"],
  ["{1:n} employee", "{1} empleado"],

  // ── Federal forms
  [
    "File the final federal income tax return ({1!})",
    "Presentar la declaración federal final del impuesto sobre la renta ({1})",
  ],
  [
    "Form {1:w} with Schedule C (mark the business closed)",
    "Formulario {1} con el Anexo C (marque el negocio como cerrado)",
  ],
  ["Form {1:w} (mark the business closed)", "Formulario {1} (marque el negocio como cerrado)"],
  [
    "Keep OSHA injury and illness records and post the annual summary (Form {1:w})",
    "Conservar los registros de lesiones y enfermedades de OSHA y exhibir el resumen anual (Formulario {1})",
  ],
  [
    "Pay California LLC fee on gross receipts (Form {1:w})",
    "Pagar la tarifa de LLC de California sobre los ingresos brutos (Formulario {1})",
  ],
  [
    "Classify contractors with the ABC test before treating workers as independent ({1:p})",
    "Clasificar a los contratistas con la prueba ABC antes de tratarlos como trabajadores independientes ({1})",
  ],
  [
    "Classify contractors with the ABC test for unemployment and wage law ({1:p})",
    "Clasificar a los contratistas con la prueba ABC para las leyes de desempleo y de salarios ({1})",
  ],
  [
    "Classify contractors correctly for unemployment insurance ({1:p})",
    "Clasificar correctamente a los contratistas para el seguro de desempleo ({1})",
  ],
  [
    "Put freelance work of {1:w} or more in a written contract ({2:p})",
    "Formalizar en un contrato escrito el trabajo independiente de {1} o más ({2})",
  ],
  ["File LLP statement ({1:p})", "Presentar la declaración de LLP ({1})"],
  [
    "File Certificate of Annual Registration and annual report ({1:p})",
    "Presentar el certificado de registro anual y el informe anual ({1})",
  ],
  ["Renew LLP certificate ({1:p})", "Renovar el certificado de LLP ({1})"],
  ["Pay LLP annual registration fee ({1:p})", "Pagar la tarifa de registro anual de LLP ({1})"],
  [
    "File federal income tax return: {1}",
    "Presentar la declaración federal del impuesto sobre la renta: {1}",
  ],
  ["Form {1:w} with Schedule C", "Formulario {1} con el Anexo C"],
  ["Form {1:w} (and Schedule K-1 for each partner)", "Formulario {1} (y Anexo K-1 para cada socio)"],
  ["Form {1:w} (and Schedule K-1 for each shareholder)", "Formulario {1} (y Anexo K-1 para cada accionista)"],
  ["Form {1:w} / {2:w} / {3:w}", "Formulario {1} / {2} / {3}"],
  ["Form {1:w}", "Formulario {1}"],
  [
    "File Form {1} (Employer's Quarterly Federal Tax Return)",
    "Presentar el Formulario {1} (Declaración Federal Trimestral del Empleador)",
  ],
  [
    "File Form {1:w} (Federal Unemployment Tax)",
    "Presentar el Formulario {1} (Impuesto Federal de Desempleo)",
  ],
  [
    "File Form {1} for independent contractors",
    "Presentar el Formulario {1} para contratistas independientes",
  ],

  // ── Industry licences, by state
  ["Obtain child care facility license ({1})", "Obtener la licencia de centro de cuidado infantil ({1})"],
  [
    "Obtain contractor license or registration ({1})",
    "Obtener la licencia o el registro de contratista ({1})",
  ],
  [
    "Obtain local/trade contractor licenses ({1} has no statewide general contractor license)",
    "Obtener las licencias locales o de oficio para contratistas ({1} no tiene una licencia estatal de contratista general)",
  ],
  [
    "Obtain professional / facility license ({1})",
    "Obtener la licencia profesional o de establecimiento ({1})",
  ],
  ["Obtain real estate broker license ({1})", "Obtener la licencia de corredor de bienes raíces ({1})"],

  // ── State rules
  ["File Annual Report ({1})", "Presentar el informe anual ({1})"],
  ["File Biennial Report ({1})", "Presentar el informe bienal ({1})"],
  ["File Annual Renewal ({1})", "Presentar la renovación anual ({1})"],
  ["File Annual Franchise Tax Report ({1})", "Presentar el informe anual del impuesto de franquicia ({1})"],
  ["File annual franchise tax report ({1})", "Presentar el informe anual del impuesto de franquicia ({1})"],
  ["File Statement of Information ({1})", "Presentar la declaración de información ({1})"],
  ["File Periodic Report ({1})", "Presentar el informe periódico ({1})"],
  ["Pay LLC annual tax ({1})", "Pagar el impuesto anual de LLC ({1})"],
  ["File Annual Registration ({1})", "Presentar el registro anual ({1})"],
  ["File Annual Return ({1})", "Presentar la declaración anual ({1})"],
  ["File Business Entity Report ({1})", "Presentar el informe de entidad comercial ({1})"],
  [
    "File Annual Report and Personal Property Return ({1})",
    "Presentar el informe anual y la declaración de bienes muebles ({1})",
  ],
  ["File Annual Statement ({1})", "Presentar la declaración anual ({1})"],
  ["File Annual Registration Report ({1})", "Presentar el informe de registro anual ({1})"],
  ["Renew limited partnership certificate ({1})", "Renovar el certificado de sociedad en comandita ({1})"],
  [
    "File Biennial Occupation Tax Report ({1})",
    "Presentar el informe bienal del impuesto de ocupación ({1})",
  ],
  [
    "File Annual List of Managers/Officers and Business License Renewal ({1})",
    "Presentar la lista anual de gerentes y directivos y renovar la licencia comercial ({1})",
  ],
  ["File Biennial Statement ({1})", "Presentar la declaración bienal ({1})"],
  ["File Annual Certificate ({1})", "Presentar el certificado anual ({1})"],
  [
    "File Annual Report and Corporate License Fee (with SCDOR) ({1})",
    "Presentar el informe anual y pagar la tarifa de licencia corporativa (ante SCDOR) ({1})",
  ],
  [
    "File Franchise Tax Report and Public Information Report ({1})",
    "Presentar el informe del impuesto de franquicia y el informe de información pública ({1})",
  ],
  ["Pay Annual Registration Fee ({1})", "Pagar la tarifa de registro anual ({1})"],
  ["Pay annual registration fee ({1})", "Pagar la tarifa de registro anual ({1})"],
  [
    "File Annual Report and pay license tax ({1})",
    "Presentar el informe anual y pagar el impuesto de licencia ({1})",
  ],
  ["Pay {1} minimum franchise tax ({2})", "Pagar el impuesto mínimo de franquicia de {1} ({2})"],
  [
    "File the annual unclaimed property holder report ({1})",
    "Presentar el informe anual del poseedor de bienes no reclamados ({1})",
  ],
  [
    "Notify residents and regulators of a data breach within {1} days ({2})",
    "Notificar a los residentes y a los reguladores de una filtración de datos en un plazo de {1} días ({2})",
  ],
  ["Register for unemployment insurance ({1})", "Registrarse en el seguro de desempleo ({1})"],
  [
    "File wage reports and pay unemployment insurance contributions ({1})",
    "Presentar los informes salariales y pagar las contribuciones al seguro de desempleo ({1})",
  ],
  [
    "Report new hires to the {1} new hire directory",
    "Informar las nuevas contrataciones al directorio de nuevos empleados de {1}",
  ],
  ["Carry workers' compensation insurance ({1})", "Tener seguro de compensación para trabajadores ({1})"],
  [
    "Decide whether to subscribe to workers' compensation insurance ({1}; elective)",
    "Decidir si se contrata el seguro de compensación para trabajadores ({1}; opcional)",
  ],
  [
    "Register for state income tax withholding ({1})",
    "Registrarse para la retención del impuesto estatal sobre la renta ({1})",
  ],
  [
    "{1:p} Paid Family and Medical Leave and WA Cares premiums",
    "Primas de licencia familiar y médica remunerada de {1} y de WA Cares",
  ],
  [
    "{1:p} Paid Family and Medical Leave contributions",
    "Contribuciones de licencia familiar y médica remunerada de {1}",
  ],
  ["{1:p} FAMLI premiums", "Primas de FAMLI de {1}"],
  ["{1:p} Paid Leave premiums", "Primas de Paid Leave de {1}"],
  ["Paid Leave {1} contributions", "Contribuciones de Paid Leave de {1}"],
  ["{1:p} TDI/TCI payroll tax", "Impuesto sobre la nómina TDI/TCI de {1}"],
  [
    "Enroll in E-Verify and verify new hires ({1})",
    "Inscribirse en E-Verify y verificar a los nuevos empleados ({1})",
  ],
  [
    "Register for and file {1} entity-level taxes",
    "Registrarse y presentar los impuestos a nivel de entidad de {1}",
  ],
  ["File formation documents with the {1}", "Presentar los documentos de constitución ante {1}"],
  ["Display required {1} workplace notices", "Exhibir los avisos laborales obligatorios de {1}"],
  ["LLC publication requirement ({1})", "Requisito de publicación para LLC ({1})"],
  ["Provide paid sick leave ({1})", "Otorgar licencia por enfermedad remunerada ({1})"],
  ["Maintain a registered agent in {1}", "Mantener un agente registrado en {1}"],
  [
    "Register assumed name / DBA with the {1} County — {2!} ({3})",
    "Registrar el nombre comercial (DBA) ante el condado de {1} — {2} ({3})",
  ],
  [
    "Register assumed name / DBA with the {1} — {2!} ({3})",
    "Registrar el nombre comercial (DBA) ante {1} — {2} ({3})",
  ],
  ["Register assumed name / DBA with the {1}", "Registrar el nombre comercial (DBA) ante {1}"],
  [
    "{1:p} state business license (Business Licensing Service)",
    "Licencia comercial estatal de {1} (Business Licensing Service)",
  ],
  ["{1:p} state business license", "Licencia comercial estatal de {1}"],
  ["{1:p} State Business License", "Licencia comercial estatal de {1}"],
  [
    "{1:p} business license and gross receipts tax",
    "Licencia comercial e impuesto sobre ingresos brutos de {1}",
  ],
  [
    "{1:p} business registration certificate (includes sales tax) ({2})",
    "Certificado de registro comercial de {1} (incluye el impuesto sobre ventas) ({2})",
  ],
  ["{1:p} business registration certificate", "Certificado de registro comercial de {1}"],

  // ── Sales tax registrations, by state
  [
    "File sales tax returns and remit tax ({1})",
    "Presentar las declaraciones del impuesto sobre ventas y remitir el impuesto ({1})",
  ],
  [
    "Register for locally administered sales tax ({1})",
    "Registrarse para el impuesto sobre ventas administrado localmente ({1})",
  ],
  ["{1:p} sales tax license ({2})", "Licencia del impuesto sobre ventas de {1} ({2})"],
  ["{1:p} sales tax permit ({2})", "Permiso del impuesto sobre ventas de {1} ({2})"],
  ["{1:p} seller's permit ({2})", "Permiso de vendedor de {1} ({2})"],
  [
    "{1:p} Certificate of Registration (sales and use tax) ({2})",
    "Certificado de registro de {1} (impuesto sobre ventas y uso) ({2})",
  ],
  ["{1:p} sales and use tax registration ({2})", "Registro del impuesto sobre ventas y uso de {1} ({2})"],
  ["{1:p} Certificate of Authority ({2})", "Certificado de autoridad de {1} ({2})"],
  [
    "Local (borough/city) sales tax registration ({1})",
    "Registro del impuesto local sobre ventas (municipio o ciudad) ({1})",
  ],
  ["Sales tax account (My {1} Taxes) ({2})", "Cuenta del impuesto sobre ventas (My {1} Taxes) ({2})"],
  [
    "Transaction Privilege Tax (TPT) license ({1})",
    "Licencia del Impuesto por Privilegio de Transacción (TPT) ({1})",
  ],
  ["None ({1})", "Ninguno ({1})"],
  ["Seller's permit ({1})", "Permiso de vendedor ({1})"],
  ["Sales and use tax permit ({1})", "Permiso del impuesto sobre ventas y uso ({1})"],
  [
    "Sales and use tax registration (FR-{1}) ({2})",
    "Registro del impuesto sobre ventas y uso (FR-{1}) ({2})",
  ],
  [
    "{1:p} business license (gross receipts tax) ({2})",
    "Licencia comercial de {1} (impuesto sobre ingresos brutos) ({2})",
  ],
  [
    "{1:p} sales tax number ({2} Tax Center) ({3})",
    "Número del impuesto sobre ventas de {1} ({2} Tax Center) ({3})",
  ],
  ["General Excise Tax (GET) license ({1})", "Licencia del Impuesto General de Consumo (GET) ({1})"],
  [
    "{1:p} Certificate of Registration (Retailers' Occupation Tax) ({2})",
    "Certificado de registro de {1} (Impuesto de Ocupación de Minoristas) ({2})",
  ],
  ["Registered Retail Merchant Certificate ({1})", "Certificado de comerciante minorista registrado ({1})"],
  [
    "{1:p} retailers' sales tax registration ({2})",
    "Registro del impuesto sobre ventas para minoristas de {1} ({2})",
  ],
  ["{1:p} sales and use tax permit ({2})", "Permiso del impuesto sobre ventas y uso de {1} ({2})"],
  ["{1:p} sales tax account (LaTAP) ({2})", "Cuenta del impuesto sobre ventas de {1} (LaTAP) ({2})"],
  [
    "{1:p} sales tax registration (MassTaxConnect) ({2})",
    "Registro del impuesto sobre ventas de {1} (MassTaxConnect) ({2})",
  ],
  ["{1:p} sales and use tax license ({2})", "Licencia del impuesto sobre ventas y uso de {1} ({2})"],
  [
    "{1:p} sales tax registration (Retailer's Registration) ({2})",
    "Registro del impuesto sobre ventas de {1} (Retailer's Registration) ({2})",
  ],
  [
    "{1:p} sales tax permit ({2} Tax ID) ({3})",
    "Permiso del impuesto sobre ventas de {1} ({2} Tax ID) ({3})",
  ],
  [
    "Local option resort tax registration ({1})",
    "Registro del impuesto local opcional para centros turísticos ({1})",
  ],
  ["Meals and Rentals Tax license ({1})", "Licencia del Impuesto sobre Comidas y Alquileres ({1})"],
  [
    "{1:p} CRS (Combined Reporting System) registration ({2})",
    "Registro CRS (Combined Reporting System) de {1} ({2})",
  ],
  ["{1:p} vendor's license ({2})", "Licencia de vendedor de {1} ({2})"],
  ["{1:p} sales tax license (PA-{2}) ({3})", "Licencia del impuesto sobre ventas de {1} (PA-{2}) ({3})"],
  ["{1:p} retail license ({2})", "Licencia de minorista de {1} ({2})"],
  ["{1:p} Sales and Use Tax Permit ({2})", "Permiso del impuesto sobre ventas y uso de {1} ({2})"],
  [
    "{1:p} business license with retail sales tax endorsement ({2})",
    "Licencia comercial de {1} con aval del impuesto sobre ventas al por menor ({2})",
  ],

  // ── County and city tax returns, registrations and permits (the tax name is translated on its own)
  ["File the City of {1} {2!} return", "Presentar la declaración del {2} de la ciudad de {1}"],
  ["File the {1} Parish {2!} return", "Presentar la declaración del {2} de la parroquia de {1}"],
  ["File the {1} City {2!} return", "Presentar la declaración del {2} de la ciudad de {1}"],
  ["File the {1} County {2!} return", "Presentar la declaración del {2} del condado de {1}"],
  ["Register for the {1} County {2!}", "Registrarse para el {2} del condado de {1}"],
  [
    "Get and renew the {1} County food establishment health permit",
    "Obtener y renovar el permiso sanitario para establecimientos de alimentos del condado de {1}",
  ],
  [
    "Obtain a {1} County home improvement contractor license",
    "Obtener una licencia de contratista de mejoras del hogar del condado de {1}",
  ],
  [
    "Obtain a {1} County home improvement license",
    "Obtener una licencia de mejoras del hogar del condado de {1}",
  ],
  [
    "Obtain the {1} County occupation tax certificate",
    "Obtener el certificado del impuesto de ocupación del condado de {1}",
  ],
  [
    "Obtain or renew the {1} County occupational tax certificate",
    "Obtener o renovar el certificado del impuesto ocupacional del condado de {1}",
  ],

  // ── Local items
  [
    "Obtain certificate of occupancy for premises in {1}",
    "Obtener el certificado de ocupación del local en {1}",
  ],
  ["{1!} — {2}, {3} County, {4}", "{1} — {2}, condado de {3}, {4}"],
];
