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

// --- Le reste de tes fonctions (checkCode, showForm, etc.) reste identique ---
// Assure-toi juste que checkCode() n'échoue pas si loadGuestsData n'a pas fini (async)
