// Remplace cette URL par celle que tu as obtenue lors de la "Publication sur le web"
const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vT1xGSzmMTYaKRLiaclOcaPFNViauutaaXqhRJ25rW8XTKeE1eD5njclI3yAVc0l4CCpI9frHhkhV2b/pub?gid=0&single=true&output=csv";

// Configuration EmailJS
const EMAILJS_PUBLIC_KEY = "TA_PUBLIC_KEY";
const EMAILJS_SERVICE_ID = "TON_SERVICE_ID";
const EMAILJS_TEMPLATE_ID = "TON_TEMPLATE_ID";

// Mapping des noms pour l'affichage
const EVENT_LABELS = {
    ceremonie: "Cérémonie",
    cocktail: "Cocktail",
    diner: "Dîner",
    soiree: "Soirée",
    brunch: "Brunch"
};

let GUESTS_DB = [];
let currentFamily = []; // Ce sera un tableau de personnes

// 2. CHARGEMENT DES DONNÉES (Au démarrage)
async function loadGuestsData() {
    try {
        const response = await fetch(SHEET_CSV_URL);
        const data = await response.text();
        
        const lines = data.split('\n');
        // On suppose que la ligne 0 est l'en-tête, on commence à 1
        // Structure attendue du CSV : Code, Prenom, Ceremonie, Cocktail, Diner, Soiree, Brunch
        
        GUESTS_DB = lines.slice(1).map(line => {
            const cols = line.split(',');
            if (cols.length < 2) return null; // Ligne vide
            
            // Nettoyage des guillemets éventuels et espaces
            const clean = (val) => val ? val.replace(/['"]+/g, '').trim() : "";
            const isTrue = (val) => val && clean(val).toUpperCase() === 'TRUE';

            return {
                familyId: clean(cols[0]).toUpperCase(),
                prenom: clean(cols[1]),
                acces: {
                    ceremonie: isTrue(cols[2]),
                    cocktail: isTrue(cols[3]),
                    diner: isTrue(cols[4]),
                    soiree: isTrue(cols[5]),
                    brunch: isTrue(cols[6])
                }
            };
        }).filter(g => g !== null);

        console.log("Base de données chargée : " + GUESTS_DB.length + " invités.");
    } catch (error) {
        console.error("Erreur CSV:", error);
        alert("Erreur de chargement des invités.");
    }
}

// Initialisation
(function() {
    emailjs.init(EMAILJS_PUBLIC_KEY);
    loadGuestsData();
})();

// 3. VÉRIFICATION DU CODE (Login)
function checkCode() {
    const codeInput = document.getElementById('guest-code').value.trim().toUpperCase();
    const errorMsg = document.getElementById('error-msg');
    
    // On filtre pour trouver TOUS les membres de la famille
    currentFamily = GUESTS_DB.filter(member => member.familyId === codeInput);

    if (currentFamily.length > 0) {
        errorMsg.style.display = 'none';
        showForm();
    } else {
        errorMsg.style.display = 'block';
    }
}

// 4. AFFICHAGE DYNAMIQUE (Boucle sur chaque membre)
function showForm() {
    document.getElementById('auth-section').style.display = 'none';
    document.getElementById('rsvp-section').style.display = 'block';
    
    // Titre personnalisé
    const familyName = currentFamily[0].familyId; // Ou un nom générique
    document.getElementById('welcome-name').innerText = `Famille ${familyName} - Bienvenue !`;

    const container = document.getElementById('dynamic-events');
    container.innerHTML = ''; // Reset

    // Pour chaque membre de la famille trouvée...
    currentFamily.forEach((member, index) => {
        const memberDiv = document.createElement('div');
        memberDiv.className = 'member-card'; // Classe CSS à ajouter
        memberDiv.style.border = "1px solid #ddd";
        memberDiv.style.padding = "15px";
        memberDiv.style.marginBottom = "20px";
        memberDiv.style.borderRadius = "8px";
        memberDiv.style.background = "#fff";

        let htmlContent = `<h3>👤 ${member.prenom}</h3>`;
        
        // Boucle sur les accès
        for (const [evt, allowed] of Object.entries(member.acces)) {
            if (allowed) {
                // Création d'un ID unique pour chaque input : prenom_event
                const inputId = `${member.prenom}_${evt}`;
                htmlContent += `
                    <div class="event-row">
                        <label for="${inputId}">${EVENT_LABELS[evt]}</label>
                        <select id="${inputId}" class="rsvp-response" data-member="${member.prenom}" data-event="${EVENT_LABELS[evt]}">
                            <option value="Présent">Présent</option>
                            <option value="Absent">Absent</option>
                        </select>
                    </div>
                `;
            }
        }

        // Ajout option Repas (seulement si invité au dîner)
        if (member.acces.diner) {
            htmlContent += `
                <div class="meal-row" style="margin-top:10px; border-top:1px dashed #ccc; padding-top:10px;">
                    <label>🍽️ Choix du repas :</label>
                    <select class="meal-choice" data-member="${member.prenom}">
                        <option value="Standard">Classique (Viande/Poisson)</option>
                        <option value="Végétarien">Végétarien</option>
                        <option value="Enfant">Menu Enfant</option>
                        <option value="Allergie">Spécial (préciser en notes)</option>
                    </select>
                </div>
            `;
        }

        memberDiv.innerHTML = htmlContent;
        container.appendChild(memberDiv);
    });
}

// 5. ENVOI DU FORMULAIRE
document.getElementById('rsvp-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const btn = document.getElementById('submit-btn');
    btn.innerText = "Envoi en cours...";
    btn.disabled = true;

    // Construction du message récapitulatif
    let fullMessage = "";

    // 1. Récupérer les présences
    const responses = document.querySelectorAll('.rsvp-response');
    responses.forEach(select => {
        const who = select.getAttribute('data-member');
        const what = select.getAttribute('data-event');
        const answer = select.value;
        fullMessage += `${who} - ${what} : ${answer}\n`;
    });

    // 2. Récupérer les repas
    fullMessage += "\n--- REPAS ---\n";
    const meals = document.querySelectorAll('.meal-choice');
    meals.forEach(select => {
        const who = select.getAttribute('data-member');
        const choice = select.value;
        // On ne note le repas que si la personne n'a pas décliné le dîner (logique simplifiée)
        // Pour faire simple ici, on envoie tout le choix
        fullMessage += `${who} : ${choice}\n`;
    });

    const templateParams = {
        family_id: currentFamily[0].familyId,
        guest_email: document.getElementById('guest-email').value,
        message: fullMessage,
        notes: document.getElementById('guest-notes').value
    };

    emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams)
        .then(() => {
            document.getElementById('rsvp-section').style.display = 'none';
            document.getElementById('success-msg').style.display = 'block';
        }, (error) => {
            alert("Erreur : " + JSON.stringify(error));
            btn.disabled = false;
            btn.innerText = "Réessayer";
        });
});
