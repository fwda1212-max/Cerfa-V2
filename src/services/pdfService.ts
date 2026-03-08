import { PDFDocument, StandardFonts, rgb, PDFName, PDFBool } from 'pdf-lib';
import { CompanyProfile, WorkRequest } from "../types";

export const generateCerfaPDF = async (profile: CompanyProfile, request: WorkRequest) => {
  console.log("Démarrage de la génération PDF...", { profile, request });

  // ── Chargement du template ────────────────────────────────────────────────
  let pdfDoc: PDFDocument;
  try {
    const response = await fetch('/cerfaTemplate_4.pdf');
    if (!response.ok) throw new Error(`Template introuvable : ${response.status}`);

    const text = await response.text();
    let pdfBytes: Uint8Array;

    if (text.trim().startsWith('JVBERi')) {
      console.log("PDF encodé en base64 détecté, décodage...");
      const binary = atob(text.trim());
      pdfBytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        pdfBytes[i] = binary.charCodeAt(i);
      }
    } else {
      const buf = await (await fetch('/cerfaTemplate_4.pdf')).arrayBuffer();
      pdfBytes = new Uint8Array(buf);
    }

    pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  } catch (err) {
    console.error("Impossible de charger cerfaTemplate_4.pdf", err);
    throw new Error(
      "Le fichier cerfaTemplate_4.pdf est introuvable dans le dossier public/. " +
      "Veuillez y déposer le PDF officiel du CERFA 14024*01."
    );
  }

  // ── Activer NeedAppearances pour que les champs s'affichent ──────────────
  // Ce PDF (format PDF/X-1a Adobe InDesign) n'a pas d'AP streams sur ses champs.
  // Sans ce flag, les valeurs sont écrites mais invisibles à l'écran.
  const acroForm = pdfDoc.catalog.get(PDFName.of('AcroForm'));
  if (acroForm && 'set' in (acroForm as any)) {
    (acroForm as any).set(PDFName.of('NeedAppearances'), PDFBool.True);
  }

  const form  = pdfDoc.getForm();
  const pages = pdfDoc.getPages();
  const page1 = pages[0];
  const font  = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const setText = (id: string, value: string) => {
    try { form.getTextField(id).setText(value ?? ''); }
    catch { console.warn(`Champ texte introuvable : "${id}"`); }
  };

  const checkBox = (id: string, check = true) => {
    try {
      const cb = form.getCheckBox(id);
      check ? cb.check() : cb.uncheck();
    } catch { console.warn(`Case à cocher introuvable : "${id}"`); }
  };

  const draw = (page: typeof page1, text: string, x: number, y: number, size = 9) => {
    if (!text) return;
    page.drawText(text, { x, y, size, font, color: rgb(0, 0, 0) });
  };

  const parseDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00');
    return {
      fr: d.toLocaleDateString('fr-FR'),
    };
  };

  // ── PAGE 1 ────────────────────────────────────────────────────────────────

  // Le demandeur
  checkBox('Entreprise');

  // Identité de l'entreprise
  setText('Dénomination',   profile.companyName);
  setText('Représenté par', profile.contactName);
  setText('Nom de la voie', profile.address);
  setText('Code Postale',   profile.postalCode);
  setText('Localité',       profile.city);
  setText('Pays',           'France');
  setText('Téléphone',      profile.phone);
  setText('Email',          profile.email);

  // Localisation du chantier
  checkBox('En agglomération');
  setText('Nom de la voie_5', request.locationAddress);
  setText('Localité_3',       request.locationCity);

  // Nature des travaux
  checkBox('Non');
  const desc = request.workDescription ?? '';
  const L = 95;
  setText('Description des travaux 1', desc.substring(0, L));
  setText('Description des travaux 2', desc.substring(L, L * 2));
  setText('Description des travaux 3', desc.substring(L * 2, L * 3));
  setText('Description des travaux 4', desc.substring(L * 3, L * 4));

  // Date et durée des travaux
  if (request.startDate) {
    setText('Date', parseDate(request.startDate).fr);
  }
  setText('Durée', String(request.durationDays));

  // Réglementation souhaitée
  setText('Durée_2', String(request.durationDays));
  if (request.startDate) {
    setText('Date_2', parseDate(request.startDate).fr);
  }

  // Type de voirie
  if (request.trafficType === 'section_courante') checkBox('Restriction sur section courante');
  else if (request.trafficType === 'bretelle')    checkBox('Restriction sur bretelles');

  // Sens de circulation
  if (request.trafficDirection === 'bidirectionnel') {
    checkBox('undefined');
  } else {
    checkBox('Sens des Points de Repères PR décroissants');
  }

  // Mesure principale
  switch (request.trafficRegulation) {
    case 'alternat':
      setText('Par feux tricolores', 'X');
      break;
    case 'route_barree':
      checkBox('undefined_3');
      break;
    case 'restriction_chaussee':
      checkBox('Empiètement sur chaussée');
      break;
  }

  // ── PAGE 2 ────────────────────────────────────────────────────────────────
  const page2 = pages.length > 1 ? pages[1] : null;
  if (page2) {
    if (request.trafficRegulation === 'stationnement_interdit') {
      checkBox('véhicules légers');
    }
    if (request.trafficRegulation === 'route_barree') {
      checkBox('Véhicules légers');
    }
    if (request.trafficRegulation === 'vitesse_limitee') {
      setText('Vitesse', '30');
    }

    // Signalisation
    checkBox('Une entreprise spécialité');
    setText('Dénomination_2',   profile.companyName);
    setText('Représenté par_2', profile.contactName);
    setText('Pays_3',           'France');
    setText('Nom de la voie_6', profile.address);
    setText('Code Postale_4',   profile.postalCode);
    setText('Localité_4',       profile.city);
    setText('Téléphone_3',      profile.phone);
    setText('Email_3',          profile.email);

    // Attestation
    checkBox('Jatteste de lexactitude des informations fournies');

    // Fait à / Le
    setText('Fait à', profile.city);
    setText('Le',     new Date().toLocaleDateString('fr-FR'));

    // Signataire
    const parts = profile.contactName.trim().split(/\s+/);
    setText('Prénom_4', parts[0] ?? '');
    setText('Nom_4',    parts.slice(1).join(' ') || profile.contactName);
    setText('Qualité',  'Gérant');
  }

  // ── Téléchargement ────────────────────────────────────────────────────────
  const pdfBytes = await pdfDoc.save();
  const blob  = new Blob([pdfBytes], { type: 'application/pdf' });
  const url   = URL.createObjectURL(blob);
  const link  = document.createElement('a');
  link.href     = url;
  link.download = `CERFA_14024-01_${profile.companyName.replace(/\s+/g, '_')}_${request.locationCity}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  console.log("Génération et téléchargement du PDF terminés.");
};
