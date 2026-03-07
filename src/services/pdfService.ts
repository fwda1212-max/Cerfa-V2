import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { CompanyProfile, WorkRequest } from "../types";

/**
 * Génère un CERFA 14024*01 pré-rempli à partir du template officiel.
 * Le fichier "cerfaTemplate.pdf" doit être placé dans le dossier public/ du projet.
 */
export const generateCerfaPDF = async (profile: CompanyProfile, request: WorkRequest) => {
  console.log("Démarrage de la génération PDF...", { profile, request });

  // ── Chargement du template ────────────────────────────────────────────────
  let pdfDoc: PDFDocument;
  try {
    const response = await fetch('/cerfaTemplate_4.pdf');
    if (!response.ok) throw new Error(`Template introuvable : ${response.status}`);

    // Détection automatique : le fichier peut être binaire ou encodé en base64
    // (Google AI Studio sauvegarde parfois les PDF en base64 au lieu du binaire)
    const text = await response.text();
    let pdfBytes: Uint8Array;

    if (text.trim().startsWith('JVBERi')) {
      // Fichier sauvegardé en base64 par l'IA
      console.log("PDF encodé en base64 détecté, décodage...");
      const binary = atob(text.trim());
      pdfBytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        pdfBytes[i] = binary.charCodeAt(i);
      }
    } else {
      // Fichier binaire normal
      const buf = await (await fetch('/cerfaTemplate_4.pdf')).arrayBuffer();
      pdfBytes = new Uint8Array(buf);
    }

    pdfDoc = await PDFDocument.load(pdfBytes);
  } catch (err) {
    console.error("Impossible de charger cerfaTemplate_4.pdf", err);
    throw new Error(
      "Le fichier cerfaTemplate_4.pdf est introuvable dans le dossier public/. " +
      "Veuillez y déposer le PDF officiel du CERFA 14024*01."
    );
  }

  const form  = pdfDoc.getForm();
  const pages = pdfDoc.getPages();
  const page1 = pages[0];
  const page2 = pages.length > 1 ? pages[1] : null;
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

  // Dessine du texte directement sur la page (y=0 = bas de page dans pdf-lib)
  const draw = (page: typeof page1, text: string, x: number, y: number, size = 9) => {
    if (!text) return;
    page.drawText(text, { x, y, size, font, color: rgb(0, 0, 0) });
  };

  const parseDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00');
    return {
      dd:   String(d.getDate()).padStart(2, '0'),
      mm:   String(d.getMonth() + 1).padStart(2, '0'),
      yyyy: String(d.getFullYear()),
      fr:   d.toLocaleDateString('fr-FR'),
    };
  };

  // ── PAGE 1 ────────────────────────────────────────────────────────────────

  // Le demandeur
  checkBox('Entreprise');
  setText('Dénomination',   profile.companyName);
  setText('Représenté par', profile.contactName);
  setText('Nom de la voie', profile.address);
  setText('Code Postale',   profile.postalCode);
  setText('Localité',       profile.city);
  setText('Pays',           'France');
  setText('Email',          profile.email);
  // Téléphone : pas de champ texte dédié → dessin direct
  draw(page1, profile.phone, 80, 601);

  // Localisation du chantier
  checkBox('En agglomération');
  setText('Nom de la voie_5', request.locationAddress);
  setText('Localité_3',       request.locationCity);

  // Nature et date des travaux
  checkBox('Non'); // Pas de permission de voirie antérieure
  const desc = request.workDescription ?? '';
  const L = 95;
  setText('Description des travaux 1', desc.substring(0, L));
  setText('Description des travaux 2', desc.substring(L, L * 2));
  setText('Description des travaux 3', desc.substring(L * 2, L * 3));
  setText('Description des travaux 4', desc.substring(L * 3, L * 4));

  // Date de début des travaux (cases graphiques)
  if (request.startDate) {
    const { dd, mm, yyyy } = parseDate(request.startDate);
    draw(page1, dd,   182, 200);
    draw(page1, mm,   206, 200);
    draw(page1, yyyy, 230, 200);
  }
  // Durée des travaux (case graphique)
  draw(page1, String(request.durationDays), 482, 200);

  // Réglementation souhaitée
  // Durée réglementation (case graphique)
  draw(page1, String(request.durationDays), 80, 163);
  // Date début réglementation (vrai champ texte)
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

  // Mesure principale de réglementation
  switch (request.trafficRegulation) {
    case 'alternat':
      setText('Par feux tricolores', 'X'); // champ texte de type case graphique
      break;
    case 'route_barree':
      checkBox('undefined_3'); // "Fermeture à la circulation"
      break;
    case 'restriction_chaussee':
      checkBox('Empiètement sur chaussée');
      break;
  }

  // ── PAGE 2 ────────────────────────────────────────────────────────────────
  if (page2) {
    const draw2 = (text: string, x: number, y: number, size = 9) =>
      draw(page2, text, x, y, size);

    // Interdictions
    if (request.trafficRegulation === 'stationnement_interdit') {
      checkBox('véhicules légers'); // Stationner - véhicules légers
    }
    if (request.trafficRegulation === 'route_barree') {
      checkBox('Véhicules légers'); // Circuler - véhicules légers
    }
    if (request.trafficRegulation === 'vitesse_limitee') {
      setText('Vitesse', '30'); // Vrai champ texte dans ce template
    }

    // Signalisation effectuée par le demandeur lui-même
    checkBox('Une entreprise spécialité');
    setText('Dénomination_2',   profile.companyName);
    setText('Représenté par_2', profile.contactName);
    setText('Pays_3',           'France');

    // Adresse + CP + Ville (page 2, section signalisation)
    draw2(profile.address,    115, 500);
    draw2(profile.postalCode,  90, 453);
    draw2(profile.city,       213, 453);

    // Attestation
    checkBox('Jatteste de lexactitude des informations fournies');

    // Fait à / Le
    draw2(profile.city, 70, 283, 10);
    setText('Le', new Date().toLocaleDateString('fr-FR'));

    // Signataire
    const parts = profile.contactName.trim().split(/\s+/);
    setText('Prénom_4', parts[0] ?? '');
    // Nom_4 n'existe pas dans ce template → dessin direct
    draw2(parts.slice(1).join(' ') || profile.contactName, 67, 270, 10);
    setText('Qualité', 'Gérant');
  }

  // ── Téléchargement ────────────────────────────────────────────────────────
  const pdfBytes = await pdfDoc.save();
  const blob     = new Blob([pdfBytes], { type: 'application/pdf' });
  const url      = URL.createObjectURL(blob);
  const link     = document.createElement('a');
  link.href      = url;
  link.download  = `CERFA_14024-01_${profile.companyName.replace(/\s+/g, '_')}_${request.locationCity}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  console.log("Génération et téléchargement du PDF terminés.");
};
