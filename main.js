import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, onSnapshot, addDoc, doc, updateDoc, serverTimestamp, Timestamp, getDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const { createApp, ref, reactive, computed, onMounted } = Vue;

createApp({
    setup() {
        const dbError = ref(null);

        // -- Configuration --
        const CHAIN_ENDPOINTS = ['https://proton.greymass.com'];
        const CHAIN_ID = '384da888112046f4915a6b036f7b8b5d320b30e20a931442f88339b6b271a5af';
        const TOKEN_CONTRACT = 'xtokens';
        const TOKEN_SYMBOL = 'UBQTX';
        const DAO_CONTRACT = 'n.dao';
        const APP_IDENTIFIER = 'ndaogovernance';

        // -- Reactive State --
        const auth = reactive({ actor: null, permission: null });
        const isSdkReady = ref(false);
        const isLoading = ref(true);
        const proposals = ref([]);
        const selectedProposal = ref(null);
        const selectedVoteOption = ref(null);
        const ubqtxBalance = ref(0.0);
        const isVoting = ref(false);
        const isSubmitting = ref(false);
        const showCreateProposalModal = ref(false);
        const newProposal = reactive({ title: '', description: '', duration: 7 });
        const message = reactive({ text: '', type: 'success' });
        
        let db, link, session;

        // -- Methods --
        const showMessage = (text, type = 'success') => {
            message.text = text;
            message.type = type;
            setTimeout(() => message.text = '', 4000);
        };
        
        const fetchProposals = () => {
            isLoading.value = true;
            dbError.value = null;
            const appId = typeof __app_id !== 'undefined' ? __app_id : 'live-ndaogovernance';
            const q = query(collection(db, `/artifacts/${appId}/public/data/proposals`), orderBy("createdAt", "desc"));
            onSnapshot(q, snapshot => {
                proposals.value = snapshot.docs.map(doc => ({ ...doc.data(), firestore_id: doc.id, startTime: doc.data().startTime?.toDate(), endTime: doc.data().endTime?.toDate() }));
                isLoading.value = false;
            }, e => { 
                dbError.value = "Failed to fetch proposals from the database.";
                showMessage(dbError.value, 'error'); 
                isLoading.value = false; 
            });
        };

        const fetchUBQTXBalance = async (actor) => {
            try {
                const result = await link.rpc.get_currency_balance(TOKEN_CONTRACT, actor, TOKEN_SYMBOL);
                ubqtxBalance.value = result.length > 0 ? parseFloat(result[0]) : 0;
            } catch (e) { ubqtxBalance.value = 0; showMessage('Could not fetch token balance.', 'error'); }
        };

        const handleLogin = (loginSession) => {
            session = loginSession;
            auth.actor = session.auth.actor.toString();
            auth.permission = session.auth.permission.toString();
            fetchUBQTXBalance(auth.actor);
            showMessage(`Welcome ${auth.actor}!`, 'success');
        };

        const restoreSession = async () => {
            try {
                const restoredSession = await link.restoreSession(APP_IDENTIFIER);
                if (restoredSession) handleLogin(restoredSession);
            } catch (e) { console.error("Session restore failed:", e); }
        };

        const initFirebase = async () => {
            try {
                const appId = typeof __app_id !== 'undefined' ? __app_id : 'live-ndaogovernance';
                
                // IMPORTANT: You MUST replace these placeholder values with your actual Firebase project credentials.
                const defaultConfig = {
                    apiKey: "YOUR_API_KEY",
                    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
                    projectId: "YOUR_PROJECT_ID",
                    storageBucket: "YOUR_PROJECT_ID.appspot.com",
                    messagingSenderId: "YOUR_SENDER_ID",
                    appId: "YOUR_APP_ID"
                };
                
                const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : defaultConfig;

                if (!firebaseConfig.apiKey || firebaseConfig.apiKey === "YOUR_API_KEY") {
                    throw new Error("Firebase configuration is missing or uses placeholder values.");
                }

                const app = initializeApp(firebaseConfig);
                db = getFirestore(app);
                const authInstance = getAuth(app);
                onAuthStateChanged(authInstance, user => { if (user) fetchProposals(); });
                const token = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
                if (token) await signInWithCustomToken(authInstance, token);
                else await signInAnonymously(authInstance);
            } catch (e) { 
                console.error("Firebase Initialization Error:", e);
                dbError.value = e.message;
                showMessage(dbError.value, 'error');
                isLoading.value = false;
            }
        };
        
        const initWebAuth = () => {
             if (typeof Proton === 'undefined') { setTimeout(initWebAuth, 100); return; }
            try {
                link = new Proton.WebLink({ endpoints: CHAIN_ENDPOINTS, chainId: CHAIN_ID, requestAccount: APP_IDENTIFIER });
                isSdkReady.value = true;
                restoreSession();
            } catch (e) { isSdkReady.value = false; showMessage('Could not initialize wallet.', 'error'); }
        };
        
        const connectWallet = async () => {
            if (!isSdkReady.value) return showMessage('Wallet connect is not ready.', 'error');
            try {
                const { session: loginSession } = await link.login(APP_IDENTIFIER);
                handleLogin(loginSession);
            } catch (e) { showMessage(e.message || 'Failed to connect wallet.', 'error'); }
        };

        const logout = async () => {
            await link.logout(APP_IDENTIFIER);
            auth.actor = null; auth.permission = null; session = null; ubqtxBalance.value = 0;
            showMessage('Wallet disconnected.', 'success');
        };
        
         const submitProposal = async () => {
            if (!newProposal.title.trim() || !newProposal.description.trim()) return showMessage('All fields are required.', 'error');
            isSubmitting.value = true;
            try {
                const endTime = new Date(Date.now() + newProposal.duration * 86400000);
                const proposalId = String(Date.now());
                await session.transact({ actions: [{ account: DAO_CONTRACT, name: 'propose', authorization: [auth], data: { proposer: auth.actor, proposal_id: proposalId, title: newProposal.title, description: newProposal.description, expires_at: endTime.toISOString().slice(0, -1) }}] }, { broadcast: true });
                showMessage('Proposal sent!', 'success');
                showCreateProposalModal.value = false;
                newProposal.title = ''; newProposal.description = ''; newProposal.duration = 7;
            } catch (e) { showMessage(e.message || 'Transaction failed.', 'error'); } 
            finally { isSubmitting.value = false; }
        };

        const castVote = async () => {
            if (!selectedVoteOption.value) return;
            isVoting.value = true;
            try {
                await session.transact({ actions: [{ account: DAO_CONTRACT, name: 'vote', authorization: [auth], data: { voter: auth.actor, proposal_id: selectedProposal.value.id, option: selectedVoteOption.value.toLowerCase() }}] }, { broadcast: true });
                const appId = typeof __app_id !== 'undefined' ? __app_id : 'live-ndaogovernance';
                const propDocRef = doc(db, `/artifacts/${appId}/public/data/proposals`, selectedProposal.value.firestore_id);
                const docSnap = await getDoc(propDocRef);
                if (docSnap.exists()){
                    const newVotes = { ...docSnap.data().votes };
                    newVotes[selectedVoteOption.value] = (newVotes[selectedVoteOption.value] || 0) + ubqtxBalance.value;
                    await updateDoc(propDocRef, { votes: newVotes });
                }
                showMessage('Vote recorded!', 'success');
                selectedProposal.value = null;
            } catch (e) { showMessage(e.message || 'Vote failed.', 'error'); } 
            finally { isVoting.value = false; }
        };

        // -- Computed Properties --
        const totalVotes = computed(() => selectedProposal.value ? Object.values(selectedProposal.value.votes).reduce((s, v) => s + v, 0) : 0);
        const getVotePercentage = (option) => {
            if (!selectedProposal.value || totalVotes.value === 0) return 0;
            return (selectedProposal.value.votes[option] || 0) / totalVotes.value;
        };
        const getCountdown = (endTime) => {
            if (!endTime) return 'N/A';
            const diff = endTime.getTime() - Date.now();
            if (diff <= 0) return 'Ended';
            const d = Math.floor(diff / 86400000);
            const h = Math.floor(diff / 3600000) % 24;
            const m = Math.floor(diff / 60000) % 60;
            return `${d}d ${h}h ${m}m remaining`;
        };

        // -- Lifecycle Hook --
        onMounted(() => {
            initFirebase();
            initWebAuth();
        });

        return { 
            dbError,
            auth, isSdkReady, isLoading, proposals, selectedProposal, selectedVoteOption, ubqtxBalance, isVoting,
            isSubmitting, showCreateProposalModal, newProposal, message,
            connectWallet, logout, submitProposal, castVote, totalVotes, getVotePercentage, getCountdown,
            selectProposal: (p) => { selectedProposal.value = p; selectedVoteOption.value = null; }
        };
    }
}).mount('#app');
