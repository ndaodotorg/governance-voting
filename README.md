# governance-voting
Governance Voting for nDAO - the Distributed Autonomous Organization: 

nDAO Governance Portal

A decentralized voting application for nDAO, powered by the XPR Network. This portal allows members to connect their wallets, create governance proposals, and vote on existing proposals using their $UBQTX token balance.The application is built with Vue.js 3, Tailwind CSS, and uses Firebase Firestore as a real-time database to cache and display proposal data.FeaturesSecure Wallet Connection: Integrates with the XPR Network via the Proton Web SDK for secure wallet authentication.Proposal Creation: Authenticated users can create new governance proposals by submitting an on-chain transaction.Token-Based Voting: Users can vote on active proposals. Voting power is conceptually tied to their $UBQTX token balance.Real-time Updates: Proposal lists and voting results are updated in real-time without needing a page refresh, powered by Firestore.Responsive UI: A clean and modern interface that works seamlessly on desktop and mobile devices.Project SetupTo run this project locally, you will need a web server and Firebase credentials.1. PrerequisitesA modern web browser.A local web server. The Live Server extension for VS Code is a great option.A Google Firebase project.2. ConfigurationYou must configure the application with your own Firebase project credentials.Create a Firebase Project: If you don't have one, create a new project at the Firebase Console.Set up Firestore: In your Firebase project, create a Firestore database.Get Credentials:Go to your Project Settings > General.Under "Your apps", click on the Web icon (</>) to register a new web app.After registering, Firebase will provide you with a firebaseConfig object.Update main.js:Open the main.js file.Locate the defaultConfig object inside the initFirebase function.Replace the placeholder values with the actual credentials from your Firebase project.// in main.js
const defaultConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};
3. Running the ApplicationPlace the index.html, style.css, and main.js files in the same directory.Start your local web server from that directory.Open the provided URL in your browser. The application should now be running.
