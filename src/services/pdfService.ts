import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { CompanyProfile, WorkRequest } from "../types";

/**
 * Generates a filled CERFA 14024*01 PDF using the official form fields.
 * Place "cerfaTemplate.pdf" inside the Public/ folder of the project.
 */
export const generateCerfaPDF = async (profile: CompanyProfile, request: WorkRequest) => {
  console.log("Starting PDF generation...", { profile, request });

  // 1. Load the official CERFA template
  let pdfDoc: PDFDocument;
  try {
    console.log("Fetching template with cache-busting...");
    // Using fetch with cache-busting to ensure we get the latest version
    const response = await fetch(`/cerfaTemplate.pdf?v=${Date.now()}`);
    if (!response.ok) {
      throw new Error(`Template not found at /cerfaTemplate.pdf: ${response.status} ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    
    console.log("Template loaded, size:", arrayBuffer.byteLength);
    pdfDoc = await PDFDocument.load(arrayBuffer);
  } catch (loadError) {
    console.error("Could not load cerfaTemplate.pdf", loadError);
    
    // Fallback: Create a blank PDF if the template is missing, so the user at least gets something
    console.warn("Falling back to blank PDF generation...");
    pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage();
    page.drawText("ERREUR: Modèle CERFA introuvable.", { x: 50, y: 700, size: 20 });
    page.drawText("Veuillez vérifier que 'cerfaTemplate.pdf' est bien dans le dossier public/.", { x: 50, y: 670, size: 12 });
    page.drawText(`Erreur: ${loadError instanceof Error ? loadError.message : String(loadError)}`, { x: 50, y: 650, size: 10 });
  }

  const form  = pdfDoc.getForm();
  
  // Log available fields for debugging
  try {
    const fields = form.getFields();
    console.log("Available PDF fields:", fields.map(f => f.getName()));
  } catch (e) {
    console.warn("Could not list PDF fields", e);
  }

  const pages = pdfDoc.getPages();
  const page1 = pages[0] || pdfDoc.addPage();
  const page2 = pages.length > 1 ? pages[1] : null;
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // Helper : remplir un champ texte
  const setText = (fieldId: string, value: string) => {
    try { form.getTextField(fieldId).setText(value ?? ''); }
    catch { console.warn(`TextField not found: "${fieldId}"`); }
  };

  // Helper : cocher une case
  const checkBox = (fieldId: string, shouldCheck = true) => {
    try {
      const cb = form.getCheckBox(fieldId);
      shouldCheck ? cb.check() : cb.uncheck();
    } catch { console.warn(`Checkbox not found: "${fieldId}"`); }
  };

  // Helper : dessiner du texte directement (y=0 en bas de page dans pdf-lib)
  const drawOn = (page: typeof page1, text: string, x: number, y: number, size = 9) => {
    if (!text) return;
    page.drawText(text, { x, y, size, font: helveticaFont, color: rgb(0, 0, 0) });
  };

  // Formater la date
  const parseDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00');
    return {
      dd:   String(d.getDate()).padStart(2, '0'),
      mm:   String(d.getMonth() + 1).padStart(2, '0'),
      yyyy: String(d.getFullYear()),
      fr:   d.toLocaleDateString('fr-FR'),
    };
  };

  // ── PAGE 1 ────────────────────────────────────────────────────────────────────

  // Section : Le demandeur
  checkBox('Entreprise');
  setText('Dénomination',   profile.companyName);
  setText('Représenté par', profile.contactName);
  setText('Nom de la voie', profile.address);   // Champ "Adresse de la voie" (fusionné dans ce template)
  setText('Localité',       profile.city);
  setText('Pays',           'France');
  setText('Code Postale',   profile.postalCode); // Vrai champ texte dans ce template !
  setText('Email',          profile.email);
  // Téléphone : champ graphique dans la section demandeur, on dessine directement
  drawOn(page1, profile.phone, 80, 599);

  // Section : Localisation du site
  checkBox('En agglomération');
  setText('Nom de la voie_5', request.locationAddress); // Adresse de la voie chantier
  setText('Localité_3',       request.locationCity);

  // Section : Nature et date des travaux
  checkBox('Non'); // Permission de voirie antérieure : Non
  const desc = request.workDescription ?? '';
  const L = 95;
  setText('Description des travaux 1', desc.substring(0, L));
  setText('Description des travaux 2', desc.substring(L, L * 2));
  setText('Description des travaux 3', desc.substring(L * 2, L * 3));
  setText('Description des travaux 4', desc.substring(L * 3, L * 4));

  // Date de début des travaux (champ graphique — cases individuelles)
  if (request.startDate) {
    const { dd, mm, yyyy } = parseDate(request.startDate);
    drawOn(page1, dd,   182, 200);
    drawOn(page1, mm,   206, 200);
    drawOn(page1, yyyy, 230, 200);
  }
  // Durée des travaux (champ graphique)
  drawOn(page1, String(request.durationDays), 482, 200);

  // Section : Réglementation souhaitée
  // Durée réglementation (champ graphique)
  drawOn(page1, String(request.durationDays), 80, 163);

  // Date début réglementation — vrai champ texte dans ce template !
  if (request.startDate) {
    setText('Date_2', parseDate(request.startDate).fr);
  }

  // Type de voirie
  if (request.trafficType === 'section_courante') checkBox('Restriction sur section courante');
  else if (request.trafficType === 'bretelle')    checkBox('Restriction sur bretelles');

  // Sens de circulation
  if (request.trafficDirection === 'bidirectionnel') {
    checkBox('undefined'); // "Deux sens de circulation"
  } else {
    checkBox('Sens des Points de Repères PR décroissants');
  }

  // Mesure principale
  switch (request.trafficRegulation) {
    case 'alternat':
      drawOn(page1, 'X', 228, 54); // "Par feux tricolores" (champ graphique)
      break;
    case 'route_barree':
      checkBox('undefined_3'); // "Fermeture à la circulation"
      break;
    case 'restriction_chaussee':
      checkBox('Empiètement sur chaussée');
      break;
  }

  // ── PAGE 2 ────────────────────────────────────────────────────────────────────
  if (page2) {
    const drawP2 = (text: string, x: number, y: number, size = 9) =>
      drawOn(page2, text, x, y, size);

    if (request.trafficRegulation === 'stationnement_interdit') checkBox('véhicules légers');
    if (request.trafficRegulation === 'route_barree')           checkBox('Véhicules légers');
    if (request.trafficRegulation === 'vitesse_limitee')        drawP2('30', 165, 715, 10);

    // Signalisation effectuée par l'entreprise elle-même
    checkBox('Une entreprise spécialité');
    setText('Dénomination_2',   profile.companyName);
    setText('Représenté par_2', profile.contactName);
    setText('Pays_3',           'France');
    // Adresse de la voie (page 2, signalisation)
    drawP2(profile.address, 115, 500, 9);
    // Code postal + Localité (page 2)
    drawP2(profile.postalCode, 90, 453, 9);
    drawP2(profile.city,       213, 453, 9);

    // Attestation
    checkBox('Jatteste de lexactitude des informations fournies');

    // Fait à / Le
    const today = new Date().toLocaleDateString('fr-FR');
    drawP2(profile.city, 70, 563, 10);
    setText('Le', today); // Vrai champ texte dans ce template !

    // Nom / Prénom / Qualité
    const nameParts = profile.contactName.trim().split(/\s+/);
    setText('Prénom_4', nameParts[0] ?? '');
    // Nom_4 n'existe pas dans ce template — on dessine directement
    drawP2(nameParts.slice(1).join(' ') || profile.contactName, 67, 270, 10);
    setText('Qualité', 'Gérant');
  }

  // Sauvegarde et téléchargement
  console.log("Saving PDF...");
  const pdfBytes = await pdfDoc.save();
  console.log("PDF saved, size:", pdfBytes.length);
  
  const blob  = new Blob([pdfBytes], { type: 'application/pdf' });
  const url   = URL.createObjectURL(blob);
  console.log("PDF Blob URL created:", url);
  
  const safeCompanyName = profile.companyName.replace(/[^a-z0-9]/gi, '_');
  const safeCity = request.locationCity.replace(/[^a-z0-9]/gi, '_');
  const fileName = `CERFA_14024-01_${safeCompanyName}_${safeCity}.pdf`;

  console.log("Triggering download:", fileName);
  
  // Method 1: Hidden link (Standard)
  const link  = document.createElement('a');
  link.href   = url;
  link.download = fileName;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  
  // Method 2: Fallback window.open (if link.click fails)
  setTimeout(() => {
    try {
      // window.location.assign is often better for Blobs in iframes
      window.location.assign(url);
      // As a last resort, try window.open
      window.open(url, '_blank');
    } catch (e) {
      console.warn("Fallback download method failed", e);
    }
  }, 500);
  
  // Cleanup
  setTimeout(() => {
    if (document.body.contains(link)) {
      document.body.removeChild(link);
    }
    // We keep the URL valid for a bit longer to ensure download starts
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    console.log("Download cleanup complete.");
  }, 1000);
};
