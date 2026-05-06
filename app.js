const URL_MODELO = "./model/"; 
let model, webcam, maxPredictions;
let nomeUsuarioLogado = "Usuário"; 
let api; // Variável do Jitsi
let iaBloqueada = false; 
const TEMPO_ESPERA = 8000; // 30 segundos

// --- LÓGICA DE ACESSO ---
function validarLogin() {
    const usuarioInput = document.getElementById('user').value; // Pega o que foi digitado
    const senha = document.getElementById('pass').value;
    const btnIA = document.getElementById("btn-tradutor");
    const btnVoz = document.getElementById("btn-voz");

    if (usuarioInput === 'Admin' && senha === '123') {
        nomeUsuarioLogado = usuarioInput; // Agora ele salva "Admin" exatamente
        btnIA.style.display = "block";
        btnVoz.style.display = "none";
        entrarNoSistema();
    } 
    else if (usuarioInput === 'Colega' && senha === '456') {
        nomeUsuarioLogado = usuarioInput; // Agora ele salva "Colega" exatamente
        btnIA.style.display = "none";
        btnVoz.style.display = "block";
        entrarNoSistema();
    } 
    else {
        alert('Usuário ou senha incorretos!');
    }
}
function entrarNoSistema() {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app-screen').style.display = 'flex';
    iniciarJitsi();
}
// --- LÓGICA DE RECONHECIMENTO DE VOZ (PONTO B para PONTO A) ---
// --- LÓGICA DE RECONHECIMENTO DE VOZ ATUALIZADA ---
function iniciarReconhecimentoVoz() {
    console.log("Botão clicado! Tentando iniciar reconhecimento...");
    
    const btnVoz = document.getElementById("btn-voz");
    const chatIA = document.getElementById("chat-ia");
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
        alert("API de voz não encontrada.");
        return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.continuous = false; 
    recognition.interimResults = false;

    // EVENTO DE ERRO - MUITO IMPORTANTE AGORA
    recognition.onerror = (event) => {
        console.error("ERRO REAL DETECTADO:", event.error);
        if (event.error === 'not-allowed') {
            alert("ERRO: Acesso ao microfone negado! Clique no cadeado lá em cima na barra de endereços e permita o microfone.");
        }
    };

    recognition.onstart = () => {
        console.log("AGORA SIM: Microfone ativo no navegador.");
        btnVoz.innerText = "🎙️ Ouvindo... fale agora";
        btnVoz.style.backgroundColor = "#e67e22";
    };

    recognition.onresult = (event) => {
        const textoFalado = event.results[0][0].transcript;
        const hora = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        if (api) {
            api.executeCommand('sendChatMessage', `[VOZ]: ${textoFalado}`, '', true);
        }

        chatIA.innerHTML += `
            <div style="margin-bottom: 12px; border-bottom: 1px solid #eee; padding-bottom: 5px;">
                <span style="font-size: 0.85em; color: #3498db; display: block;">${nomeUsuarioLogado} às ${hora}:</span>
                <span style="font-size: 1em; color: #2c3e50;">"${textoFalado}"</span>
            </div>`;
        chatIA.scrollTop = chatIA.scrollHeight;
    };

    recognition.onend = () => {
        console.log("Reconhecimento finalizado.");
        btnVoz.innerText = "🎙️ Falar com o Surdo";
        btnVoz.style.backgroundColor = "#3498db";
    };

    // O PULO DO GATO:
    // Às vezes o navegador precisa de um "empurrão". 
    // Vamos tentar dar um stop antes do start para limpar qualquer tentativa anterior travada.
    try {
        recognition.stop(); 
        setTimeout(() => {
            recognition.start();
        }, 100); 
    } catch (e) {
        recognition.start();
    }
}

// --- LÓGICA DO JITSI ---
function iniciarJitsi() {
    const domain = 'meet.jit.si';
    const options = {
        roomName: 'SIDA_Meeting_2026',
        width: '100%',
        height: '100%',
        parentNode: document.querySelector('#meet-container'),
        interfaceConfigOverwrite: { TOOLBAR_BUTTONS: ['microphone', 'camera', 'chat', 'hangup'] }
    };
    api = new JitsiMeetExternalAPI(domain, options);
}

// --- LÓGICA DA IA ---
async function initIA() {
    const btn = document.getElementById("btn-tradutor");
    btn.innerText = "Carregando...";

    try {
        model = await tmImage.load(URL_MODELO + "model.json", URL_MODELO + "metadata.json");
        maxPredictions = model.getTotalClasses();

        const flip = true; 
        webcam = new tmImage.Webcam(224, 224, flip); 
        await webcam.setup(); 
        await webcam.play();
        
        document.getElementById("webcam-container").appendChild(webcam.canvas);
        
        btn.innerText = "IA ATIVA ✅";
        btn.style.backgroundColor = "#27ae60";

        window.requestAnimationFrame(loop);
    } catch (e) {
        alert("Erro ao iniciar IA: " + e.message);
    }
}

async function loop() {
    webcam.update();
    await predict();
    window.requestAnimationFrame(loop);
}

async function predict() {
    // 1. Se a IA estiver no tempo de espera (bloqueada), não faz nada
    if (iaBloqueada) return;

    const prediction = await model.predict(webcam.canvas);
    const chatIA = document.getElementById("chat-ia");

    for (let i = 0; i < maxPredictions; i++) {
        const sinal = prediction[i].className;
        const certeza = prediction[i].probability;

        // 2. Verifica se a confiança é alta e se não é apenas o fundo
        if (certeza > 0.90 && sinal !== "Fundo") {
            
            // BLOQUEIO IMEDIATO: Ativa a trava para não repetir a mensagem
            iaBloqueada = true; 

            const horaAtual = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            // --- PARTE DA VOZ ---
            // Chamamos a função de voz aqui para o computador dizer o nome do sinal
            falar(sinal); 
            // --------------------

            // Monta o HTML da mensagem para a barra lateral
            const novaMensagem = `
                <div style="margin-bottom: 12px; border-bottom: 1px solid #eee; padding-bottom: 5px;">
                    <span style="font-size: 0.75em; color: #7f8c8d; display: block; margin-bottom: 2px;">
                        ${nomeUsuarioLogado} às ${horaAtual}:
                    </span>
                    <span style="font-size: 1em; color: #2c3e50; font-weight: 500;">
                        "${sinal}"
                    </span>
                </div>
            `;

            // Envia para o chat do Jitsi
            if (typeof api !== 'undefined') {
                api.executeCommand('sendChatMessage', `[LIBRAS - ${nomeUsuarioLogado}]: ${sinal}`, '', true);
            }

            // Atualiza o chat na tela e faz o scroll
            chatIA.innerHTML += novaMensagem;
            chatIA.scrollTop = chatIA.scrollHeight;

            // Feedback visual no botão
            const btn = document.getElementById("btn-tradutor");
            btn.innerText = "ESPERANDO INTERVALO...";
            btn.style.backgroundColor = "#555";

            // Libera a IA novamente após o tempo de espera (ex: 30 ou 60 segundos)
            setTimeout(() => {
                iaBloqueada = false;
                btn.innerText = "IA ATIVA ✅";
                btn.style.backgroundColor = "#27ae60";
            }, TEMPO_ESPERA);

            break; 
        }
    }
}
// ESTA FUNÇÃO DEVE ESTAR NO FINAL DO SEU APP.JS
function falar(texto) {
    if ('speechSynthesis' in window) {
        // Cancela qualquer fala que ainda esteja acontecendo
        window.speechSynthesis.cancel();
        
        const mensagem = new SpeechSynthesisUtterance(texto);
        mensagem.lang = 'pt-BR';
        mensagem.rate = 1.1; // Velocidade um pouco mais rápida que o normal
        
        window.speechSynthesis.speak(mensagem);
    }
}