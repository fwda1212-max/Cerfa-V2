import React, { useState } from 'react';
import { CompanyProfile, WorkRequest } from '../types';
import { generateCerfaPDF } from '../services/pdfService';
import { 
  FileDown, 
  MapPin, 
  Calendar, 
  Info, 
  AlertCircle,
  ArrowRight,
  Loader2,
  CheckCircle
} from 'lucide-react';

interface RequestFormProps {
  profile: CompanyProfile | null;
  onRedirectToProfile: () => void;
}

const RequestForm: React.FC<RequestFormProps> = ({ profile, onRedirectToProfile }) => {
  const [formData, setFormData] = useState<WorkRequest>({
    locationAddress: '',
    locationCity: '',
    workDescription: '',
    startDate: '',
    durationDays: 1,
    trafficType: 'section_courante',
    trafficRegulation: 'alternat',
    trafficDirection: 'bidirectionnel',
    additionalInfo: '',
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!profile) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center max-w-2xl mx-auto">
        <div className="mx-auto w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mb-6">
          <AlertCircle className="w-10 h-10 text-amber-500" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Profil incomplet</h2>
        <p className="text-gray-600 mb-8">
          Vous devez configurer les informations de votre entreprise avant de pouvoir générer une demande de travaux.
        </p>
        <button
          onClick={onRedirectToProfile}
          className="inline-flex items-center px-8 py-3 bg-brand-600 text-white font-bold rounded-xl shadow-lg shadow-brand-200 hover:bg-brand-700 transition-all"
        >
          Configurer mon profil
          <ArrowRight className="ml-2 w-5 h-5" />
        </button>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    setError(null);
    setSuccess(false);

    try {
      console.log("Submitting form with profile:", profile);
      console.log("Form data:", formData);
      await generateCerfaPDF(profile, formData);
      setSuccess(true);
      // Reset success after a few seconds
      setTimeout(() => setSuccess(false), 5000);
    } catch (err) {
      console.error("PDF Generation Error:", err);
      setError(err instanceof Error ? err.message : "Une erreur est survenue lors de la génération du PDF.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: name === 'durationDays' ? parseInt(value) || 0 : value 
    }));
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      <header>
        <h1 className="text-3xl font-bold text-gray-900">Nouvelle Demande</h1>
        <p className="text-gray-600 mt-2">Remplissez les détails du chantier pour générer votre CERFA 14024*01.</p>
      </header>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl flex items-start space-x-3 animate-in fade-in slide-in-from-top-2">
          <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-bold">Erreur de génération</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-6 py-5 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-start space-x-3">
            <CheckCircle className="w-6 h-6 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-bold text-lg">CERFA généré avec succès !</p>
              <p className="text-sm opacity-90">Le téléchargement a été lancé automatiquement. Si rien ne se passe, cliquez sur le bouton à droite.</p>
            </div>
          </div>
          <button 
            onClick={handleSubmit}
            className="whitespace-nowrap px-6 py-2 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-all shadow-md"
          >
            Télécharger à nouveau
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 md:p-8 space-y-10">
          {/* Section: Localisation */}
          <section>
            <div className="flex items-center space-x-2 mb-6">
              <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                <MapPin className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="text-lg font-bold text-gray-900 uppercase tracking-tight">Localisation du chantier</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Adresse des travaux</label>
                <input
                  required
                  type="text"
                  name="locationAddress"
                  value={formData.locationAddress}
                  onChange={handleChange}
                  placeholder="Ex: 15 rue de la Paix"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Commune</label>
                <input
                  required
                  type="text"
                  name="locationCity"
                  value={formData.locationCity}
                  onChange={handleChange}
                  placeholder="Ex: Lyon"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none"
                />
              </div>
            </div>
          </section>

          {/* Section: Détails temporels */}
          <section>
            <div className="flex items-center space-x-2 mb-6">
              <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="text-lg font-bold text-gray-900 uppercase tracking-tight">Dates et Durée</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Date de début prévue</label>
                <input
                  required
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Durée estimée (jours)</label>
                <input
                  required
                  type="number"
                  min="1"
                  name="durationDays"
                  value={formData.durationDays}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none"
                />
              </div>
            </div>
          </section>

          {/* Section: Nature des travaux */}
          <section>
            <div className="flex items-center space-x-2 mb-6">
              <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                <Info className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="text-lg font-bold text-gray-900 uppercase tracking-tight">Nature des travaux</h2>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Description détaillée</label>
              <textarea
                required
                name="workDescription"
                value={formData.workDescription}
                onChange={handleChange}
                rows={4}
                placeholder="Décrivez précisément les travaux (ex: Réfection de chaussée, pose de fibre optique...)"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none resize-none"
              ></textarea>
            </div>
          </section>

          {/* Section: Réglementation */}
          <section>
            <div className="flex items-center space-x-2 mb-6">
              <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="text-lg font-bold text-gray-900 uppercase tracking-tight">Réglementation de la circulation</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Type de voirie</label>
                <select
                  name="trafficType"
                  value={formData.trafficType}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none appearance-none"
                >
                  <option value="section_courante">Section courante</option>
                  <option value="bretelle">Bretelle</option>
                  <option value="carrefour">Carrefour</option>
                  <option value="trottoir">Trottoir</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Mesure principale</label>
                <select
                  name="trafficRegulation"
                  value={formData.trafficRegulation}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none appearance-none"
                >
                  <option value="alternat">Alternat (Feux/Piquets)</option>
                  <option value="route_barree">Route barrée / Déviation</option>
                  <option value="restriction_chaussee">Empiètement chaussée</option>
                  <option value="stationnement_interdit">Stationnement interdit</option>
                  <option value="vitesse_limitee">Vitesse limitée</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Sens de circulation</label>
                <select
                  name="trafficDirection"
                  value={formData.trafficDirection}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none appearance-none"
                >
                  <option value="bidirectionnel">Bidirectionnel</option>
                  <option value="sens_unique">Sens unique</option>
                </select>
              </div>
            </div>
          </section>
        </div>

        <div className="bg-gray-50 px-8 py-8 flex flex-col md:flex-row items-center justify-between border-t border-gray-100 gap-4">
          <div className="flex items-center text-sm text-gray-500">
            <Info className="w-4 h-4 mr-2 text-blue-500" />
            Le PDF généré respecte le format officiel CERFA 14024*01.
          </div>
          
          <button
            type="submit"
            disabled={isGenerating}
            className={`
              inline-flex items-center px-10 py-4 bg-brand-600 text-white font-bold rounded-xl shadow-xl shadow-brand-200 
              hover:bg-brand-700 transform transition active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed
              ${isGenerating ? 'animate-pulse' : ''}
            `}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                Génération en cours...
              </>
            ) : (
              <>
                <FileDown className="w-5 h-5 mr-3" />
                Générer le CERFA
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default RequestForm;
