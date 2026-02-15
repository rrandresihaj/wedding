// Remplace cette URL par celle que tu as obtenue lors de la "Publication sur le web"
const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vT1xGSzmMTYaKRLiaclOcaPFNViauutaaXqhRJ25rW8XTKeE1eD5njclI3yAVc0l4CCpI9frHhkhV2b/pub?gid=0&single=true&output=csv";


// Identifiants EmailJS
const EMAILJS_PUBLIC_KEY = "TA_PUBLIC_KEY";
const EMAILJS_SERVICE_ID = "TON_SERVICE_ID";
const EMAILJS_TEMPLATE_ID = "TON_TEMPLATE_ID";

// Libellés pour l'affichage
const EVENT_LABELS = {
    ceremonie: "💍 Cérémonie",
    cocktail: "🥂 Cocktail",
    diner: "🍽️ Dîner",
    soiree: "💃 Soirée",
    brunch: "🥐 Brunch"
};

/* LOGIQUE DU CODE 
   ----------------------------------------------------------
*/
let GUESTS_DB = []; // Contiendra toutes les lignes du CSV
let currentFamily = []; // Contiendra les membres de la famille connectée

// 1. Chargement de la base de données au lancement de la page
async function loadGuestsData() {
    try {
        const response = await fetch(SHEET_CSV_URL);
        const data = await response.text();
        const lines = data.split('\n').slice(1); // On ignore la ligne d'en-tête

        GUESTS_DB = lines.map(line => {
            const cols = line.split(',');
            if (cols.length < 2) return null; // Sécurité ligne vide
            
            // Fonction utilitaire pour nettoyer les textes (enlève les guillemets Excel)
            const clean = (txt) => txt ? txt.replace(/['"]+/g, '').trim() : "";
            const isTrue = (val) => clean(val).toUpperCase() === 'TRUE';

            return {
                familyId: clean(cols[0]).toUpperCase(), // Le Code Famille
                prenom: clean(cols[1]),
                acces: {
                    ceremonie: isTrue(cols[2]),
                    cocktail: isTrue(cols[3]),
                    diner: isTrue(cols[4]),
                    soiree: isTrue(cols[5]),
                    brunch: isTrue(cols[6])
                }
            };
        }).filter(x => x !== null);
        
        console.log("Données chargées : " + GUESTS_DB.length + " invités trouvés.");
    } catch (e) {
        console.error("Erreur CSV:", e);
    }
}

// Initialisation immédiate
(function() {
    emailjs.init(EMAILJS_PUBLIC_KEY);
    loadGuestsData();
})();

// 2. Vérification du Code Famille
function checkCode() {
    const codeInput = document.getElementById('guest-code').value.trim().toUpperCase();
    
    // On cherche TOUS les membres qui ont ce code
    currentFamily = GUESTS_DB.filter(p => p.familyId === codeInput);

    if (currentFamily.length > 0) {
        document.getElementById('error-msg').style.display = 'none';
        showForm();
    } else {
        document.getElementById('error-msg').style.display = 'block';
    }
}

// 3. Affichage du formulaire pour toute la famille
function showForm() {
    // Changement d'écran
    document.getElementById('auth-section').style.display = 'none';
    document.getElementById('rsvp-section').style.display = 'block';
    
    // Titre personnalisé avec le Prénom du premier membre (souvent le chef de famille) ou le Code
    document.getElementById('welcome-name').innerText = `Bienvenue Famille ${currentFamily[0].familyId} !`;

    const container = document.getElementById('dynamic-events');
    container.innerHTML = ''; // Nettoyage

    // BOUCLE : On crée une "Carte" pour chaque membre de la famille
    currentFamily.forEach(member => {
        const card = document.createElement('div');
        card.className = 'family-member-card';
        
        let html = `<h3 class="member-name">${member.prenom}</h3><div class="member-options">`;

        // A. Les cases à cocher pour les événements
        for (const [key, label] of Object.entries(EVENT_LABELS)) {
            // On affiche l'option SEULEMENT si la personne est invitée (TRUE dans le CSV)
            if (member.acces[key]) {
                html += `
                    <div class="option-row">
                        <span class="label">${label}</span>
                        <div class="radio-group">
                            <label><input type="radio" name="${member.prenom}_${key}" value="Présent" checked> Oui</label>
                            <label><input type="radio" name="${member.prenom}_${key}" value="Absent"> Non</label>
                        </div>
                    </div>
                `;
            }
        }

        // B. Le choix du repas (Seulement si invité au Dîner)
        if (member.acces.diner) {
            html += `
                <div class="meal-row">
                    <label>🍖 Choix du plat :</label>
                    <select name="${member.prenom}_repas" class="meal-select">
                        <option value="Classique (Viande)">Classique (Viande)</option>
                        <option value="Végétarien">Végétarien</option>
                        <option value="Enfant">Menu Enfant</option>
                        <option value="Aucun">Ne mange pas</option>
                    </select>
                </div>
            `;
        }

        html += `</div>`; // Fin member-options
        card.innerHTML = html;
        container.appendChild(card);
    });
}

// 4. Envoi des réponses via EmailJS
document.getElementById('rsvp-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const btn = document.getElementById('submit-btn');
    btn.innerText = "Envoi en cours...";
    btn.disabled = true;

    // Construction du message récapitulatif
    let messageRecap = "RÉPONSE RSVP MARIAGE\n====================\n\n";

    // Pour chaque membre, on récupère ses choix
    currentFamily.forEach(member => {
        messageRecap += `👤 ${member.prenom}\n`;
        
        // Récupération des présences
        for (const key of Object.keys(EVENT_LABELS)) {
            if (member.acces[key]) {
                const radios = document.getElementsByName(`${member.prenom}_${key}`);
                let val = "Non spécifié";
                for (const r of radios) { if (r.checked) val = r.value; }
                messageRecap += `- ${EVENT_LABELS[key]} : ${val}\n`;
            }
        }

        // Récupération du repas
        if (member.acces.diner) {
            const repasSelect = document.querySelector(`select[name="${member.prenom}_repas"]`);
            if (repasSelect) {
                messageRecap += `🍽️ REPAS : ${repasSelect.value}\n`;
            }
        }
        messageRecap += "\n--------------------\n";
    });

    // Paramètres envoyés à EmailJS
    const params = {
        famille: currentFamily[0].familyId,
        email_contact: document.getElementById('guest-email').value,
        message: messageRecap,
        notes: document.getElementById('guest-notes').value
    };

    emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, params)
        .then(() => {
            document.getElementById('rsvp-section').style.display = 'none';
            document.getElementById('success-msg').style.display = 'block';
        })
        .catch((err) => {
            alert("Oups ! Une erreur est survenue. Contactez-nous.");
            console.error(err);
            btn.disabled = false;
            btn.innerText = "Réessayer";
        });
});
