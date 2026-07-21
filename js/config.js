// Configuration file for Firebase and application defaults

export const firebaseConfig = {
    apiKey: "AIzaSyAD4y-9XFJeQV1PX1WRARszXXM2LjClG3c",
    authDomain: "maloracity.firebaseapp.com",
    databaseURL: "https://maloracity-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "maloracity",
    storageBucket: "maloracity.firebasestorage.app",
    messagingSenderId: "1023780794036",
    appId: "1:1023780794036:web:08df9ae7ade87df53cb1e1"
};

export const roleOrder = [
    "Projektleitung", "Stv. Projektleitung", "Teamleitung", "Stv. Teamleitung", 
    "Fraktionsverwaltungleitung", "Fraktionsverwaltung", "Head Developer", "Developer", 
    "Jr. Developer", "Head Analyst", "Analyst", "Probe Analyst", "Head Administrator", 
    "Sr. Administrator", "Administrator", "Test-Administrator", "Head Moderator", 
    "Sr. Moderator", "Moderator", "Test - Moderator", "Head Supporter", "Sr. Supporter", 
    "Supporter", "Test Supporter", "Einreisebeamter"
];

export const defaultTeamData = {
    "Projektleitung": ["@MC | Lyrox™"], "Stv. Projektleitung": ["@MC | DonXVitoo™", "@MC | Tobi👀"], 
    "Teamleitung": ["@MC | Paul", "@MC | ZmtxTV 👀"], "Stv. Teamleitung": ["@MC | CityNeko 👀"], 
    "Fraktionsverwaltungleitung": ["@MC | Jaden", "@MC | John"], "Fraktionsverwaltung": [], 
    "Head Developer": ["@MC | Knoppers.exe"], "Developer": [], "Jr. Developer": ["@OnlyError"], 
    "Head Analyst": ["@MC | Hassan", "<@727523575950606396>", "@MC | Ling.js", "@MC | Turbo.dll"], 
    "Analyst": ["<@562260580988092475>", "<@772069989582110732>", "@MC | Lias", "@MC | Ling.js", "<@148278991352164494>"], 
    "Probe Analyst": [], "Head Administrator": ["@MC | Pauli™"], "Sr. Administrator": ["@MC | Patrick 👀"], 
    "Administrator": ["@MC | HIRA", "@MC | Lenny"], "Test-Administrator": ["@MC I Eliasdwd"], 
    "Head Moderator": ["@MC | Matti"], "Sr. Moderator": [], 
    "Moderator": ["@MC | ★ R Y Z E ★", "@MC | Exy.lua", "@MC | Knobi", "@MC | Līåm™", "@MC | Sidney"], 
    "Test - Moderator": ["@MC | zonex", "@MC | Andre ✝"], "Head Supporter": [], 
    "Sr. Supporter": ["@MC | Kellox"], 
    "Supporter": ["@MC | Aspy", "@MC | IDropMyTable", "@MC | Jamal", "@MC | Klaisnax", "@MC | MD-01 Tim Dlnaro", "@MC | MD-02 368kk", "<@381082149803261954>", "@MC | Tristan Tiefprais", "@MC | Vito Nacé", "@MC I Jonas👀", "@MC I Louis", "@MC I Nick.exe"], 
    "Test Supporter": ["<@1456434493236711499>", "@MC | Dave Shanke", "<@704072513617133638>", "<@1066692526158905346>", "<@1266035889209872489>", "@MC | Luca Abi", "@MC | Nick", "@MC | syzulex", "@MC l Jay"], 
    "Einreisebeamter": ["@MC | ★ R Y Z E ★", "@MC | Aspy", "@MC | HIRA", "@MC | IDropMyTable", "@MC | Jamal", "@MC | Kellox", "@MC | MD-02 368kk", "@MC | syzulex", "@MC | Nick.exe"]
};

// Default weights for Uprank AI calculations
export const defaultWeights = {
    tickets: 10,
    supports: 15,
    feedbacks: 25,
    einreisen: 12,
    ausreisen: 8,
    banne: 5
};

// Default promotion thresholds for each role
export const defaultThresholds = {
    "Fraktionsverwaltungleitung": 1000,
    "Fraktionsverwaltung": 600,
    "Head Developer": 1200,
    "Developer": 800,
    "Jr. Developer": 400,
    "Head Analyst": 1000,
    "Analyst": 600,
    "Probe Analyst": 250,
    "Head Administrator": 1500,
    "Sr. Administrator": 1400,
    "Administrator": 900,
    "Test-Administrator": 450,
    "Head Moderator": 1200,
    "Sr. Moderator": 1000,
    "Moderator": 600,
    "Test - Moderator": 300,
    "Head Supporter": 1000,
    "Sr. Supporter": 800,
    "Supporter": 500,
    "Test Supporter": 200,
    "Einreisebeamter": 150
};
