import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    sendPasswordResetEmail, 
    onAuthStateChanged, 
    signOut,
    updateProfile, // Adicionado
    updatePassword // Adicionado
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";

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
window.acaoPrincipal = async function(e) {
    // 1. Evita o recarregamento acidental da página caso seja um formulário
    if (e && e.preventDefault) {
        e.preventDefault();
    }

    // 2. Captura os valores e usa o .trim() para limpar espaços invisíveis
    const email = document.getElementById("email").value.trim();
    const senha = document.getElementById("password").value;

    if (!email || !senha) return alert("Preencha todos os campos!");

    // INTERCEPTAÇÃO DO SUPER ADMIN (Corrigida e isolada)
    if (email === "admin" && senha === "1234") {
        alert("Acesso Administrativo Iniciado!");
        window.location.href = "admin.html"; 
        return; // IMPORTANTE: interrompe a execução para não ir pro Firebase
    }

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
            location.reload(); 
        } catch (error) {
            alert("Erro ao cadastrar: " + error.message);
        }
    } else {
        // --- LÓGICA DE LOGIN COM VALIDAÇÃO DE STATUS DA EMPRESA ---
        try {
            // A) Tenta autenticar o usuário com e-mail e senha no Auth
            const userCredential = await signInWithEmailAndPassword(auth, email, senha);
            const user = userCredential.user;

            // B) Busca o documento do usuário no Firestore para descobrir a empresa dele
            const userDocRef = doc(db, "usuarios", user.uid);
            const userDocSnap = await getDoc(userDocRef);

            if (userDocSnap.exists()) {
                const dadosUsuario = userDocSnap.data();
                const empresaId = dadosUsuario.empresaId; // Pega a string (ex: "Sisplan" ou "empresaA")

                if (empresaId) {
                    // C) Busca o documento correspondente na coleção "empresas"
                    const empresaDocRef = doc(db, "empresas", empresaId);
                    const empresaDocSnap = await getDoc(empresaDocRef);

                    if (empresaDocSnap.exists()) {
                        const dadosEmpresa = empresaDocSnap.data();

                        // D) Se a empresa estiver bloqueada, derruba a sessão na hora
                        if (dadosEmpresa.status === "bloqueado") {
                            await auth.signOut(); // Desloga imediatamente do Firebase Auth
                            alert("Acesso Negado: A empresa vinculada a este usuário encontra-se desativada. Contate o administrador.");
                            return; // IMPORTANTE: Mata a execução aqui e não deixa o observer seguir
                        }
                    }
                }
            }

            // Se o documento não existir, ou a empresa não estiver bloqueada, o código flui.
            // O seu observer 'onAuthStateChanged' cuidará do redirecionamento para a tela do app.
            
        } catch (error) {
            console.error("Erro Firebase Auth:", error);
            alert("Email ou senha incorretos!");
        }
    }
}

// Reset de Senha
// --- RESET DE SENHA ATUALIZADO COM PROMPT ---
window.resetarSenha = function() {
    // Abre uma caixinha perguntando o e-mail direto ao usuário
    const emailInformado = prompt("Digite o seu e-mail cadastrado para receber o link de redefinição:");
    
    // Se o usuário clicar em cancelar ou deixar vazio, não faz nada
    if (emailInformado === null) return; 
    const emailFormatado = emailInformado.trim();
    if (emailFormatado === "") return alert("Você precisa informar um e-mail válido!");

    // Dispara o e-mail real pelo Firebase
    sendPasswordResetEmail(auth, emailFormatado)
        .then(() => {
            alert(`E-mail de recuperação enviado com sucesso para: ${emailFormatado}\nVerifique sua caixa de entrada ou spam!`);
        })
        .catch((error) => {
            console.error("Erro no reset:", error);
            if (error.code === "auth/user-not-found") {
                alert("Este e-mail não está cadastrado no sistema!");
            } else if (error.code === "auth/invalid-email") {
                alert("O formato do e-mail digitado é inválido.");
            } else {
                alert("Erro ao enviar e-mail: " + error.message);
            }
        });
}

onAuthStateChanged(auth, async (user) => {
    if (user) {
        // Busca o tipo do usuário no Firestore
        const docSnap = await getDoc(doc(db, "usuarios", user.uid));
        
        if (docSnap.exists()) {
            const dados = docSnap.data();
            tipoUsuarioLogado = dados.tipo;
            nomeUsuarioLogado = dados.nome || "Usuário";

            // NOVO: Injeta o nome do usuário logado na barra superior azul
            const elNomeHeader = document.getElementById("header-user-name");
            if (elNomeHeader) {
                elNomeHeader.innerText = `Olá, ${nomeUsuarioLogado}`;
            }

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
// --- 4. LÓGICA DO JITSI COM NOME AUTOMÁTICO ---
function iniciarJitsi(sala) {
    const domain = 'meet.jit.si';
    const options = {
        roomName: sala,
        width: '100%',
        height: '100%',
        parentNode: document.querySelector('#meet-container'),
        
        // NOVO: Passa automaticamente o nome de quem logou no Firebase para o Jitsi
        userInfo: {
            displayName: nomeUsuarioLogado
        },
        
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

// --- ENVIO MANUAL DE MENSAGENS ---
// --- ENVIO MANUAL DE MENSAGENS (CORRIGIDO) ---
// --- ENVIO MANUAL DE MENSAGENS (ESTILIZAÇÃO CORRETA) ---
window.enviarMensagemManual = function() {
    const inputMsg = document.getElementById("msg-manual");
    const texto = inputMsg.value.trim();

    // Se o campo estiver vazio, não faz nada
    if (texto === "") return;

    // 1. Envia para o Jitsi (para que o outro participante e o VLibras dele vejam)
    if (api) {
        api.executeCommand('sendChatMessage', `[VOZ]: ${texto}`, '', true);
    }

    // 2. Insere IMEDIATAMENTE no seu próprio chat usando o padrão visual cinza local
    const chatIA = document.getElementById("chat-ia");
    const hora = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // Usando exatamente a mesma estilização cinza padrão das suas mensagens de voz locais
    chatIA.innerHTML += `
        <div style="margin-bottom: 12px; border-bottom: 1px solid #eee; padding-bottom: 5px; background-color: #f9f9f9; padding: 8px; border-radius: 5px;">
            <span style="font-size: 0.85em; color: #3498db; display: block; font-weight: bold;">${nomeUsuarioLogado} às ${hora}:</span>
            <span style="font-size: 1em; color: #2c3e50;">"${texto}"</span>
        </div>`;
    
    // Auto-scroll para acompanhar as novas mensagens
    chatIA.scrollTop = chatIA.scrollHeight;

    // Limpa o campo de texto
    inputMsg.value = "";
}

// BÔNUS: Permitir enviar a mensagem apertando a tecla "Enter"
document.addEventListener("keypress", function(e) {
    if (e.key === "Enter") {
        const inputMsg = document.getElementById("msg-manual");
        // Verifica se o usuário está com o cursor focado no campo de texto
        if (document.activeElement === inputMsg) {
            window.enviarMensagemManual();
        }
    }
});

// Função de Reconhecimento de Voz corrigida para Módulos
window.iniciarReconhecimentoVoz = function() {
    const btnVoz = document.getElementById("btn-voz");
    const chatIA = document.getElementById("chat-ia");
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
        alert("Seu navegador não suporta reconhecimento de voz. Tente usar o Google Chrome.");
        return;
    }

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
            // Adiciona pontuação básica se não houver
            if (!textoComPontuacao.endsWith("?") && !textoComPontuacao.endsWith(".")) {
                textoComPontuacao += ".";
            }
            
            // Primeira letra em maiúscula
            const textoFormatado = textoComPontuacao.charAt(0).toUpperCase() + textoComPontuacao.slice(1);

            // Envia para o Jitsi (para os outros verem)
            if (api) {
                api.executeCommand('sendChatMessage', `[VOZ]: ${textoFormatado}`, '', true);
            }

            // Mostra no seu próprio chat local
            const hora = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            chatIA.innerHTML += `
                <div style="margin-bottom: 12px; border-bottom: 1px solid #eee; padding-bottom: 5px; background-color: #f9f9f9; padding: 8px; border-radius: 5px;">
                    <span style="font-size: 0.85em; color: #3498db; display: block; font-weight: bold;">${nomeUsuarioLogado} às ${hora}:</span>
                    <span style="font-size: 1em; color: #2c3e50;">"${textoFormatado}"</span>
                </div>`;
            
            chatIA.scrollTop = chatIA.scrollHeight;
        }
    };

    recognition.onerror = (event) => {
        console.error("Erro no reconhecimento: ", event.error);
        gravandoVoz = false;
        btnVoz.innerText = "🎙️ Falar com o Surdo";
        btnVoz.style.backgroundColor = "#3498db";
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

// --- LÓGICA DE CONFIGURAÇÕES DO USUÁRIO ---

window.abrirConfiguracoes = async function() {
    const user = auth.currentUser;
    if (!user) return;

    // Preenche os campos com os dados atuais
    document.getElementById("edit-email").value = user.email;
    
    // Busca os dados extras no Firestore
    const docSnap = await getDoc(doc(db, "usuarios", user.uid));
    if (docSnap.exists()) {
        const dados = docSnap.data();
        document.getElementById("edit-nome").value = dados.nome;
        document.getElementById("edit-tipo").value = dados.tipo;
    }

    document.getElementById("modal-settings").style.display = "flex";
}

window.fecharConfiguracoes = function() {
    document.getElementById("modal-settings").style.display = "none";
    document.getElementById("edit-password").value = ""; // Limpa senha por segurança
}

window.salvarConfiguracoes = async function() {
    const user = auth.currentUser;
    const novoNome = document.getElementById("edit-nome").value.trim();
    const novoTipo = document.getElementById("edit-tipo").value;
    const novaSenha = document.getElementById("edit-password").value;

    if (!novoNome) return alert("O nome não pode estar vazio.");

    try {
        // 1. Atualiza no Firestore (Nome e Tipo)
        await setDoc(doc(db, "usuarios", user.uid), {
            nome: novoNome,
            tipo: novoTipo,
            email: user.email
        }, { merge: true });

        // 2. Atualiza o Perfil do Auth (Nome de exibição)
        await updateProfile(user, { displayName: novoNome });

        // 3. Atualiza Senha (se preenchida)
        if (novaSenha && novaSenha.length >= 6) {
            await updatePassword(user, novaSenha);
        } else if (novaSenha && novaSenha.length < 6) {
            return alert("A senha deve ter pelo menos 6 caracteres.");
        }

        alert("Informações Alteradas com Sucesso!");
        
        // 4. Sai do sistema e volta para o login
        signOut(auth).then(() => {
            window.location.href = window.location.origin + window.location.pathname;
        });

    } catch (error) {
        console.error(error);
        if (error.code === "auth/requires-recent-login") {
            alert("Para alterar a senha, você precisa ter logado recentemente. Por favor, saia e entre novamente.");
        } else {
            alert("Erro ao salvar: " + error.message);
        }
    }
}
