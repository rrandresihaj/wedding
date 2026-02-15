// Remplace cette URL par celle que tu as obtenue lors de la "Publication sur le web"
const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vT1xGSzmMTYaKRLiaclOcaPFNViauutaaXqhRJ25rW8XTKeE1eD5njclI3yAVc0l4CCpI9frHhkhV2b/pub?output=csv";

let GUESTS_DB = [];

// Fonction pour charger les données depuis Google Sheets au démarrage
async function loadGuestsData() {
    try {
        const response = await fetch(SHEET_CSV_URL);
        const data = await response.text();
        
        // Parsing du CSV (très simple)
        const lines = data.split('\n');
        const headers = lines[0].split(',');

        GUESTS_DB = lines.slice(1).map(line => {
            const values = line.split(',');
            if (values.length < headers.length) return null;
            
            return {
                id: values[0].trim().toUpperCase(),
                nom: values[1].trim(),
                email: values[2].trim(),
                acces: {
                    ceremonie: values[3].trim().toUpperCase() === "TRUE",
                    cocktail: values[4].trim().toUpperCase() === "TRUE",
                    diner: values[5].trim().toUpperCase() === "TRUE",
                    soiree: values[6].trim().toUpperCase() === "TRUE",
                    brunch: values[7].trim().toUpperCase() === "TRUE"
                }
            };
        }).filter(g => g !== null);
        
        console.log("Base de données synchronisée");
    } catch (error) {
        console.error("Erreur de chargement des données:", error);
    }
}

// Appeler le chargement dès le début
loadGuestsData();

// Libellés propres pour l'affichage
const EVENT_NAMES = {
    ceremonie: "Cérémonie Laïque (15h)",
    cocktail: "Cocktail de bienvenue (17h)",
    diner: "Dîner de prestige (20h)",
    soiree: "Soirée dansante",
    brunch: "Brunch du lendemain"
};

// 2. INITIALISATION EMAILJS
(function() {
    // REMPLACER PAR TON PUBLIC_KEY
    emailjs.init("VOTRE_PUBLIC_KEY");
})();

let currentGuest = null;

// 3. FONCTION DE VÉRIFICATION DU CODE
function checkCode() {
    const codeInput = document.getElementById('guest-code').value.trim().toUpperCase();
    const errorMsg = document.getElementById('error-msg');
    
    currentGuest = GUESTS_DB.find(g => g.id === codeInput);

    if (currentGuest) {
        errorMsg.style.display = 'none';
        showForm();
    } else {
        errorMsg.style.display = 'block';
    }
}

// 4. GÉNÉRATION DYNAMIQUE DU FORMULAIRE
function showForm() {
    document.getElementById('auth-section').style.display = 'none';
    document.getElementById('rsvp-section').style.display = 'block';
    document.getElementById('welcome-name').innerText = `Bonjour ${currentGuest.nom} !`;
    document.getElementById('guest-email').value = currentGuest.email;

    const container = document.getElementById('dynamic-events');
    container.innerHTML = '<h3>Serez-vous présent ?</h3>';

    // On boucle sur les accès autorisés de l'invité
    for (const [eventKey, hasAccess] of Object.entries(currentGuest.acces)) {
        if (hasAccess) {
            const div = document.createElement('div');
            div.className = 'event-row';
            div.innerHTML = `
                <span>${EVENT_NAMES[eventKey]}</span>
                <select name="${eventKey}" class="event-response">
                    <option value="Présent">Présent</option>
                    <option value="Absent">Absent</option>
                </select>
            `;
            container.appendChild(div);
        }
    }
}

// 5. ENVOI DES DONNÉES
document.getElementById('rsvp-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const btn = document.getElementById('submit-btn');
    btn.innerText = "Envoi en cours...";
    btn.disabled = true;

    // Récupération des présences
    let recapPresence = "";
    document.querySelectorAll('.event-row').forEach(row => {
        const event = row.querySelector('span').innerText;
        const status = row.querySelector('select').value;
        recapPresence += `${event} : ${status}\n`;
    });

    const templateParams = {
        to_name: "L'organisateur",
        from_name: currentGuest.nom,
        guest_email: document.getElementById('guest-email').value,
        message: recapPresence,
        notes: document.getElementById('guest-notes').value
    };

    // REMPLACER PAR TES IDENTIFIANTS EMAILJS (SERVICE_ID, TEMPLATE_ID)
    emailjs.send('YOUR_SERVICE_ID', 'YOUR_TEMPLATE_ID', templateParams)
        .then(() => {
            document.getElementById('rsvp-section').style.display = 'none';
            document.getElementById('success-msg').style.display = 'block';
        }, (error) => {
            alert("Erreur lors de l'envoi : " + JSON.stringify(error));
            btn.disabled = false;
            btn.innerText = "Réessayer";
        });
});
