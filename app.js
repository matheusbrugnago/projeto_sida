import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

const URL_MODELO = "./model/"; 
let model, webcam, maxPredictions;
let nomeUsuarioLogado = "Usuário"; 
let api; 
let iaBloqueada = false; 
const TEMPO_ESPERA = 8000; 
let nomeSalaAtual = "";
// Variáveis de Controle de Estado
let modoCadastro = false;
let tipoUsuarioLogado = ""; // "surdo" ou "ouvinte"


// CONEXÃO ao FireBase Connect:
const firebaseConfig = {
  apiKey: "AIzaSyCapjvE2bxCI1mORfAj6Yd4n8xziBeTMFI",
  authDomain: "projeto-sida.firebaseapp.com",
  projectId: "projeto-sida",
  storageBucket: "projeto-sida.firebasestorage.app",
  messagingSenderId: "575853393592",
  appId: "1:575853393592:web:d457b310cfffd4cf34e64d",
  measurementId: "G-5S9T1PWLZQ"
};

// Inicialização
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Alterna entre tela de Login e Cadastro
window.toggleAuthMode = function() {
    modoCadastro = !modoCadastro;
    const camposCadastro = document.getElementById("register-extras");
    const btnMain = document.getElementById("btn-main");
    const title = document.getElementById("login-title");
    const link = document.getElementById("toggle-link");

    if (modoCadastro) {
        camposCadastro.style.display = "block";
        btnMain.innerText = "CRIAR CONTA";
        title.innerText = "Cadastro SIDA";
        link.innerText = "Já tenho conta";
    } else {
        camposCadastro.style.display = "none";
        btnMain.innerText = "ENTRAR";
        title.innerText = "Entrar no SIDA";
        link.innerText = "Cadastre-se";
    }
}

// Ação do Botão Principal (Entrar ou Cadastrar)
window.acaoPrincipal = async function() {
    const email = document.getElementById("email").value;
    const senha = document.getElementById("password").value;

    if (!email || !senha) return alert("Preencha todos os campos!");

    if (modoCadastro) {
        // --- LÓGICA DE CADASTRO ---
        const tipo = document.getElementById("user-type").value;
        const nome = document.getElementById("display-name").value;

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, senha);
            const user = userCredential.user;

            // Salva o perfil no Firestore (Banco de Dados)
            await setDoc(doc(db, "usuarios", user.uid), {
                nome: nome,
                tipo: tipo,
                email: email
            });

            alert("Conta criada com sucesso!");
            location.reload(); // Recarrega para entrar
        } catch (error) {
            alert("Erro ao cadastrar: " + error.message);
        }
    } else {
        // --- LÓGICA DE LOGIN ---
        try {
            await signInWithEmailAndPassword(auth, email, senha);
            // O observer 'onAuthStateChanged' cuidará do restante
        } catch (error) {
            alert("Email ou senha incorretos!");
        }
    }
}

// Reset de Senha
window.resetarSenha = function() {
    const email = document.getElementById("email").value;
    if (!email) return alert("Digite seu email primeiro!");
    
    sendPasswordResetEmail(auth, email)
        .then(() => alert("Email de recuperação enviado! Verifique sua caixa de entrada."))
        .catch((error) => alert("Erro: " + error.message));
}

onAuthStateChanged(auth, async (user) => {
    if (user) {
        // Busca o tipo do usuário no Firestore
        const docSnap = await getDoc(doc(db, "usuarios", user.uid));
        
        if (docSnap.exists()) {
            const dados = docSnap.data();
            tipoUsuarioLogado = dados.tipo;
            nomeUsuarioLogado = dados.nome || "Usuário";

            // CONFIGURAÇÃO DE TELA POR TIPO
            const btnIA = document.getElementById("btn-tradutor");
            const btnVoz = document.getElementById("btn-voz");

            if (tipoUsuarioLogado === "surdo") {
                btnIA.style.display = "block";
                btnVoz.style.display = "none";
            } else {
                btnIA.style.display = "none";
                btnVoz.style.display = "block";
            }

            // Entra no sistema (Sua função que já existia)
            entrarNoSistema(); 
        }
    } else {
        // Se deslogar, volta para a tela de login
        document.getElementById('login-screen').style.display = 'flex';
        document.getElementById('app-screen').style.display = 'none';
        if (api) api.dispose(); // Fecha o Jitsi ao sair
    }
});

// Função para Sair
window.logout = function() {
    signOut(auth);
}

// --- 1. GERAÇÃO DE ID ÚNICO ---
function gerarIdSala(tamanho) {
    const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let resultado = '';
    for (let i = 0; i < tamanho; i++) {
        resultado += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
    }
    return resultado;
}

// --- CORREÇÃO DO LINK DE COMPARTILHAMENTO ---
window.gerarLinkCompartilhamento = function() {
    // Pega a URL atual (seja localhost ou github.io)
    const urlBase = window.location.origin + window.location.pathname;
    const urlCompleta = `${urlBase}?sala=${nomeSalaAtual}`;
    
    const spanLink = document.getElementById('link-reuniao');
    if (spanLink) {
        spanLink.innerText = urlCompleta;
    }
}

window.copiarLink = function() {
    const linkTexto = document.getElementById('link-reuniao').innerText;
    
    // Tenta usar a API moderna, se falhar usa o método antigo
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(linkTexto).then(() => {
            alert("Link copiado com sucesso!");
        });
    } else {
        const textArea = document.createElement("textarea");
        textArea.value = linkTexto;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
        alert("Link copiado!");
    }
}

// --- FUNÇÃO PARA SAIR (LOGOUT) ---
window.fazerLogout = function() {
    if (confirm("Deseja realmente sair da conta?")) {
        signOut(auth).then(() => {
            // O onAuthStateChanged vai detectar a saída e recarregar a tela de login
            alert("Você saiu do sistema.");
            // Limpa a URL (remove o ?sala=ID) para não entrar na mesma sala direto
            window.location.href = window.location.origin + window.location.pathname;
        }).catch((error) => {
            alert("Erro ao sair: " + error.message);
        });
    }
}

function entrarNoSistema() {
    // Verifica se veio por link de convite
    const urlParams = new URLSearchParams(window.location.search);
    const salaPeloLink = urlParams.get('sala');

    if (salaPeloLink) {
        nomeSalaAtual = salaPeloLink;
    } else {
        nomeSalaAtual = "SIDA-" + gerarIdSala(8);
    }

    // Esconde login e mostra app
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app-screen').style.display = 'flex';
    
    iniciarJitsi(nomeSalaAtual);
    gerarLinkCompartilhamento();
}

// --- 4. LÓGICA DO JITSI ---
function iniciarJitsi(sala) {
    const domain = 'meet.jit.si';
    const options = {
        roomName: sala,
        width: '100%',
        height: '100%',
        parentNode: document.querySelector('#meet-container'),
        interfaceConfigOverwrite: { 
            TOOLBAR_BUTTONS: ['microphone', 'camera', 'chat', 'hangup'] 
        }
    };
    
    api = new JitsiMeetExternalAPI(domain, options);

    api.addEventListeners({
        incomingMessage: function (event) {
            const msg = event.message;
            const usuarioRemoto = event.nick || "Outro Usuário"; 
            const hora = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            if (msg.includes("[LIBRAS") || msg.includes("[VOZ]")) {
                const chatIA = document.getElementById("chat-ia");
                let textoLimpo = msg.replace(/\[LIBRAS - .*\]: /, "").replace("[VOZ]: ", "");

                // Acionamento do VLibras
                try {
                    if (window.plugin && window.plugin.player && window.plugin.player.loaded) {
                        window.plugin.player.translate(textoLimpo);
                    }
                } catch (e) { console.log("VLibras aguardando..."); }

                const mensagemRecebida = `
                    <div style="margin-bottom: 12px; border-bottom: 1px solid #eee; padding-bottom: 5px; background-color: #f0f7ff; border-radius: 5px; padding: 8px; border-left: 4px solid #3498db;">
                        <span style="font-size: 0.75em; color: #2980b9; display: block; font-weight: bold;">${usuarioRemoto} às ${hora}:</span>
                        <span style="font-size: 1em; color: #2c3e50;">"${textoLimpo}"</span>
                    </div>`;

                chatIA.innerHTML += mensagemRecebida;
                chatIA.scrollTop = chatIA.scrollHeight;
            }
        }
    });
}

// --- 5. RECONHECIMENTO DE VOZ ---
let gravandoVoz = false;
let recognition;

function iniciarReconhecimentoVoz() {
    const btnVoz = document.getElementById("btn-voz");
    const chatIA = document.getElementById("chat-ia");
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) return;

    if (gravandoVoz) {
        recognition.stop();
        gravandoVoz = false;
        btnVoz.innerText = "🎙️ Falar com o Surdo";
        btnVoz.style.backgroundColor = "#3498db";
        return;
    }

    recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.continuous = true;

    recognition.onstart = () => {
        gravandoVoz = true;
        btnVoz.innerText = "🛑 Parar Gravação";
        btnVoz.style.backgroundColor = "#e74c3c";
    };

    recognition.onresult = (event) => {
        let textoFinal = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
            textoFinal += event.results[i][0].transcript;
        }

        if (textoFinal.trim() !== "") {
            let textoComPontuacao = textoFinal.trim();
            if (!textoComPontuacao.endsWith("?") && !textoComPontuacao.endsWith(".")) textoComPontuacao += ".";
            const textoFormatado = textoComPontuacao.charAt(0).toUpperCase() + textoComPontuacao.slice(1);

            if (api) api.executeCommand('sendChatMessage', `[VOZ]: ${textoFormatado}`, '', true);

            const hora = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            chatIA.innerHTML += `
                <div style="margin-bottom: 12px; border-bottom: 1px solid #eee; padding-bottom: 5px; background-color: #f9f9f9; padding: 8px; border-radius: 5px;">
                    <span style="font-size: 0.85em; color: #3498db; display: block; font-weight: bold;">${nomeUsuarioLogado} às ${hora}:</span>
                    <span style="font-size: 1em; color: #2c3e50;">"${textoFormatado}"</span>
                </div>`;
            chatIA.scrollTop = chatIA.scrollHeight;
        }
    };

    recognition.start();
}

// --- 6. LÓGICA DA IA (LIBRAS) ---
// Adicione o window. antes de async
window.initIA = async function() {
    const btn = document.getElementById("btn-tradutor");
    btn.innerText = "Carregando...";
    try {
        model = await tmImage.load(URL_MODELO + "model.json", URL_MODELO + "metadata.json");
        maxPredictions = model.getTotalClasses();
        webcam = new tmImage.Webcam(224, 224, true); 
        await webcam.setup(); 
        await webcam.play();
        document.getElementById("webcam-container").appendChild(webcam.canvas);
        btn.innerText = "IA ATIVA ✅";
        btn.style.backgroundColor = "#27ae60";
        window.requestAnimationFrame(loop);
    } catch (e) { alert("Erro IA: " + e.message); }
}

async function loop() {
    webcam.update();
    await predict();
    window.requestAnimationFrame(loop);
}

async function predict() {
    if (iaBloqueada) return;
    const prediction = await model.predict(webcam.canvas);
    for (let i = 0; i < maxPredictions; i++) {
        const sinal = prediction[i].className;
        const certeza = prediction[i].probability;

        if (certeza > 0.90 && sinal !== "Fundo") {
            iaBloqueada = true; 
            falar(sinal); 
            
            if (api) api.executeCommand('sendChatMessage', `[LIBRAS - ${nomeUsuarioLogado}]: ${sinal}`, '', true);

            const hora = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            document.getElementById("chat-ia").innerHTML += `
                <div style="margin-bottom: 12px; border-bottom: 1px solid #eee; padding-bottom: 5px;">
                    <span style="font-size: 0.75em; color: #7f8c8d; display: block;">${nomeUsuarioLogado} às ${hora}:</span>
                    <span style="font-size: 1em; color: #2c3e50; font-weight: 500;">"${sinal}"</span>
                </div>`;
            document.getElementById("chat-ia").scrollTop = document.getElementById("chat-ia").scrollHeight;

            const btn = document.getElementById("btn-tradutor");
            btn.innerText = "AGUARDE...";
            setTimeout(() => {
                iaBloqueada = false;
                btn.innerText = "IA ATIVA ✅";
                btn.style.backgroundColor = "#27ae60";
            }, TEMPO_ESPERA);
            break; 
        }
    }
}

function falar(texto) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const msg = new SpeechSynthesisUtterance(texto);
        msg.lang = 'pt-BR';
        window.speechSynthesis.speak(msg);
    }
}
