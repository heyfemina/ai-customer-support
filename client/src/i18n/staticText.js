import en from "./en.json";
import es from "./es.json";
import fr from "./fr.json";
import it from "./it.json";

const resources = { en, it, es, fr };

const supplemental = {
  "Settings": { it: "Impostazioni", es: "Configuracion", fr: "Parametres" },
  "Profile information": { it: "Informazioni profilo", es: "Informacion del perfil", fr: "Informations du profil" },
  "Name": { it: "Nome", es: "Nombre", fr: "Nom" },
  "Email": { it: "Email", es: "Email", fr: "Email" },
  "Role": { it: "Ruolo", es: "Rol", fr: "Role" },
  "Language preference": { it: "Preferenza lingua", es: "Preferencia de idioma", fr: "Preference de langue" },
  "Save profile": { it: "Salva profilo", es: "Guardar perfil", fr: "Enregistrer le profil" },
  "Change password": { it: "Cambia password", es: "Cambiar contrasena", fr: "Changer le mot de passe" },
  "Current password": { it: "Password attuale", es: "Contrasena actual", fr: "Mot de passe actuel" },
  "New password": { it: "Nuova password", es: "Nueva contrasena", fr: "Nouveau mot de passe" },
  "Confirm password": { it: "Conferma password", es: "Confirmar contrasena", fr: "Confirmer le mot de passe" },
  "Two-factor authentication": { it: "Autenticazione a due fattori", es: "Autenticacion de dos factores", fr: "Authentification a deux facteurs" },
  "Two-factor authentication adds extra security to your account.": { it: "L'autenticazione a due fattori aggiunge sicurezza extra al tuo account.", es: "La autenticacion de dos factores agrega seguridad adicional a tu cuenta.", fr: "L'authentification a deux facteurs ajoute une securite supplementaire a votre compte." },
  "Enabled": { it: "Abilitato", es: "Activado", fr: "Active" },
  "Disabled": { it: "Disabilitato", es: "Desactivado", fr: "Desactive" },
  "Enable 2FA": { it: "Abilita 2FA", es: "Activar 2FA", fr: "Activer 2FA" },
  "Disable 2FA": { it: "Disabilita 2FA", es: "Desactivar 2FA", fr: "Desactiver 2FA" },
  "Theme preference": { it: "Preferenza tema", es: "Preferencia de tema", fr: "Preference de theme" },
  "Choose a professional panel theme. Your selection is saved locally.": { it: "Scegli un tema professionale per il pannello. La selezione viene salvata localmente.", es: "Elige un tema profesional para el panel. La seleccion se guarda localmente.", fr: "Choisissez un theme professionnel pour le panneau. La selection est enregistree localement." },
  "Privacy requests": { it: "Richieste privacy", es: "Solicitudes de privacidad", fr: "Demandes de confidentialite" },
  "Request data export": { it: "Richiedi esportazione dati", es: "Solicitar exportacion de datos", fr: "Demander l'export des donnees" },
  "Request account deletion": { it: "Richiedi eliminazione account", es: "Solicitar eliminacion de cuenta", fr: "Demander la suppression du compte" },
  "No privacy requests yet.": { it: "Nessuna richiesta privacy.", es: "Aun no hay solicitudes de privacidad.", fr: "Aucune demande de confidentialite pour le moment." },
  "Role details": { it: "Dettagli ruolo", es: "Detalles del rol", fr: "Details du role" },
  "Department": { it: "Reparto", es: "Departamento", fr: "Departement" },
  "Categories / skills": { it: "Categorie / competenze", es: "Categorias / habilidades", fr: "Categories / competences" },
  "Agent status": { it: "Stato agente", es: "Estado del agente", fr: "Statut de l'agent" },
  "Max active chats": { it: "Chat attive massime", es: "Maximo de chats activos", fr: "Chats actifs maximum" },
  "Security summary": { it: "Riepilogo sicurezza", es: "Resumen de seguridad", fr: "Resume de securite" },
  "Contact/profile details": { it: "Dettagli contatto/profilo", es: "Detalles de contacto/perfil", fr: "Details contact/profil" },
  "Support request": { it: "Richiesta supporto", es: "Solicitud de soporte", fr: "Demande de support" },
  "Assigned ticket": { it: "Ticket assegnato", es: "Ticket asignado", fr: "Ticket assigne" },
  "Current ticket": { it: "Ticket corrente", es: "Ticket actual", fr: "Ticket actuel" },
  "Uploaded attachments": { it: "Allegati caricati", es: "Archivos adjuntos cargados", fr: "Pieces jointes chargees" },
  "No attachments uploaded.": { it: "Nessun allegato caricato.", es: "No se cargaron adjuntos.", fr: "Aucune piece jointe chargee." },
  "Attachment available": { it: "Allegato disponibile", es: "Adjunto disponible", fr: "Piece jointe disponible" },
  "Click to preview": { it: "Clicca per anteprima", es: "Haz clic para previsualizar", fr: "Cliquer pour previsualiser" },
  "Open file": { it: "Apri file", es: "Abrir archivo", fr: "Ouvrir le fichier" },
  "Add a reply": { it: "Aggiungi risposta", es: "Agregar respuesta", fr: "Ajouter une reponse" },
  "Write a customer reply": { it: "Scrivi una risposta al cliente", es: "Escribe una respuesta al cliente", fr: "Ecrire une reponse au client" },
  "Send reply": { it: "Invia risposta", es: "Enviar respuesta", fr: "Envoyer la reponse" },
  "Ticket summary": { it: "Riepilogo ticket", es: "Resumen del ticket", fr: "Resume du ticket" },
  "Customer details": { it: "Dettagli cliente", es: "Detalles del cliente", fr: "Details client" },
  "Ticket ID": { it: "ID ticket", es: "ID del ticket", fr: "ID du ticket" },
  "Created": { it: "Creato", es: "Creado", fr: "Cree" },
  "Priority": { it: "Priorita", es: "Prioridad", fr: "Priorite" },
  "Category": { it: "Categoria", es: "Categoria", fr: "Categorie" },
  "Assigned agent": { it: "Agente assegnato", es: "Agente asignado", fr: "Agent assigne" },
  "Last updated": { it: "Ultimo aggiornamento", es: "Ultima actualizacion", fr: "Derniere mise a jour" },
  "Resolution time": { it: "Tempo di risoluzione", es: "Tiempo de resolucion", fr: "Temps de resolution" },
  "Pending": { it: "In sospeso", es: "Pendiente", fr: "En attente" },
  "Agent feedback": { it: "Feedback agente", es: "Comentarios del agente", fr: "Retour agent" },
  "Rating": { it: "Valutazione", es: "Calificacion", fr: "Evaluation" },
  "Complaint to admin": { it: "Reclamo all'admin", es: "Queja al admin", fr: "Reclamation a l'admin" },
  "Complaint subject": { it: "Oggetto reclamo", es: "Asunto de la queja", fr: "Sujet de reclamation" },
  "Send complaint": { it: "Invia reclamo", es: "Enviar queja", fr: "Envoyer la reclamation" },
  "Chat about this ticket": { it: "Chat su questo ticket", es: "Chat sobre este ticket", fr: "Chat sur ce ticket" },
  "Chat with customer": { it: "Chat con cliente", es: "Chat con cliente", fr: "Chat avec le client" },
  "Accept / Claim": { it: "Accetta / Prendi", es: "Aceptar / Reclamar", fr: "Accepter / Prendre" },
  "In progress": { it: "In lavorazione", es: "En progreso", fr: "En cours" },
  "Propose Resolution": { it: "Proponi risoluzione", es: "Proponer resolucion", fr: "Proposer une resolution" },
  "Open live chat": { it: "Apri chat live", es: "Abrir chat en vivo", fr: "Ouvrir le chat en direct" },
  "Start new chat": { it: "Avvia nuova chat", es: "Iniciar nuevo chat", fr: "Demarrer un nouveau chat" },
  "Live inbox": { it: "Inbox live", es: "Bandeja en vivo", fr: "Boite live" },
  "Support queue": { it: "Coda supporto", es: "Cola de soporte", fr: "File de support" },
  "Search chats": { it: "Cerca chat", es: "Buscar chats", fr: "Rechercher des chats" },
  "All": { it: "Tutti", es: "Todo", fr: "Tous" },
  "Connected": { it: "Connesso", es: "Conectado", fr: "Connecte" },
  "Waiting for agent": { it: "In attesa agente", es: "Esperando agente", fr: "En attente d'un agent" },
  "Waiting for available agent.": { it: "In attesa di un agente disponibile.", es: "Esperando un agente disponible.", fr: "En attente d'un agent disponible." },
  "Select or start a conversation.": { it: "Seleziona o avvia una conversazione.", es: "Selecciona o inicia una conversacion.", fr: "Selectionnez ou demarrez une conversation." },
  "Internal communication": { it: "Comunicazione interna", es: "Comunicacion interna", fr: "Communication interne" },
  "Conversations": { it: "Conversazioni", es: "Conversaciones", fr: "Conversations" },
  "Start conversation": { it: "Avvia conversazione", es: "Iniciar conversacion", fr: "Demarrer la conversation" },
  "Select agent": { it: "Seleziona agente", es: "Seleccionar agente", fr: "Selectionner un agent" },
  "No messages yet": { it: "Nessun messaggio", es: "Aun no hay mensajes", fr: "Aucun message" },
  "Message admin or agent": { it: "Messaggio ad admin o agente", es: "Mensaje a admin o agente", fr: "Message a l'admin ou agent" },
  "You": { it: "Tu", es: "Tu", fr: "Vous" },
  "Light": { it: "Chiaro", es: "Claro", fr: "Clair" },
  "Dark": { it: "Scuro", es: "Oscuro", fr: "Sombre" },
  "Slate": { it: "Ardesia", es: "Pizarra", fr: "Ardoise" },
  "Blue": { it: "Blu", es: "Azul", fr: "Bleu" },
  "Emerald": { it: "Smeraldo", es: "Esmeralda", fr: "Emeraude" },
  "Violet": { it: "Viola", es: "Violeta", fr: "Violet" },
  "Rose": { it: "Rosa", es: "Rosa", fr: "Rose" },
  "Amber": { it: "Ambra", es: "Ambar", fr: "Ambre" },
  "Minimal": { it: "Minimale", es: "Minimal", fr: "Minimal" },
  "Corporate": { it: "Corporate", es: "Corporativo", fr: "Corporate" },
  "OPEN": { it: "APERTO", es: "ABIERTO", fr: "OUVERT" },
  "IN_PROGRESS": { it: "IN LAVORAZIONE", es: "EN PROGRESO", fr: "EN COURS" },
  "WAITING_CUSTOMER": { it: "IN ATTESA CLIENTE", es: "ESPERANDO CLIENTE", fr: "EN ATTENTE CLIENT" },
  "RESOLUTION_PROPOSED": { it: "RISOLUZIONE PROPOSTA", es: "RESOLUCION PROPUESTA", fr: "RESOLUTION PROPOSEE" },
  "REOPENED": { it: "RIAPERTO", es: "REABIERTO", fr: "ROUVERT" },
  "AUTO_CLOSED": { it: "CHIUSO AUTOMATICAMENTE", es: "CERRADO AUTOMATICAMENTE", fr: "FERME AUTOMATIQUEMENT" },
  "CLOSED": { it: "CHIUSO", es: "CERRADO", fr: "FERME" },
};

function flattenValues(value, output = []) {
  if (typeof value === "string") output.push(value);
  else if (Array.isArray(value)) value.forEach((item) => flattenValues(item, output));
  else if (value && typeof value === "object") Object.values(value).forEach((item) => flattenValues(item, output));
  return output;
}

function normalizeText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

const phraseMaps = Object.fromEntries(["it", "es", "fr"].map((language) => {
  const map = new Map();
  const sourceValues = flattenValues(resources.en);
  const targetValues = flattenValues(resources[language]);
  sourceValues.forEach((source, index) => {
    if (!source || source.includes("{{")) return;
    const target = targetValues[index];
    if (target && !target.includes("{{")) map.set(normalizeText(source), target);
  });
  Object.entries(supplemental).forEach(([source, translations]) => {
    if (translations[language]) map.set(normalizeText(source), translations[language]);
  });
  return [language, map];
}));

const reversePhraseMap = new Map();
Object.entries(phraseMaps).forEach(([, map]) => {
  map.forEach((target, source) => reversePhraseMap.set(normalizeText(target), source));
});

export function translateStaticText(value, language) {
  if (language === "en") return value;
  const text = normalizeText(value);
  if (!text) return value;
  return phraseMaps[language]?.get(text) || value;
}

export function normalizeStaticSource(value) {
  const text = normalizeText(value);
  return reversePhraseMap.get(text) || text;
}
