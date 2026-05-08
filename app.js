const URL_MODELO = "./model/"; 
let model, webcam, maxPredictions;
let nomeUsuarioLogado = "Usuário"; 
let api; 
let iaBloqueada = false; 
const TEMPO_ESPERA = 8000; 
let nomeSalaAtual = ""; 

// --- 1. GERAÇÃO DE ID ÚNICO ---
function gerarIdSala(tamanho) {
    const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let resultado = '';
    for (let i = 0; i < tamanho; i++) {
        resultado += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
    }
    return resultado;
}

// --- 2. LÓGICA DE ACESSO ---
function validarLogin() {
    const usuarioInput = document.getElementById('user').value;
    const senha = document.getElementById('pass').value;
    const btnIA = document.getElementById("btn-tradutor");
    const btnVoz = document.getElementById("btn-voz");

    if ((usuarioInput === 'Admin' && senha === '123') || (usuarioInput === 'Colega' && senha === '456')) {
        nomeUsuarioLogado = usuarioInput;
        
        // Exibe botões baseado no cargo
        if (nomeUsuarioLogado === 'Admin') {
            btnIA.style.display = "block";
            btnVoz.style.display = "none";
        } else {
            btnIA.style.display = "none";
            btnVoz.style.display = "block";
        }

        // Verifica se veio por link de convite
        const urlParams = new URLSearchParams(window.location.search);
        const salaPeloLink = urlParams.get('sala');

        if (salaPeloLink) {
            nomeSalaAtual = salaPeloLink;
        } else {
            nomeSalaAtual = "SIDA-" + gerarIdSala(8);
        }

        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('app-screen').style.display = 'flex';
        
        iniciarJitsi(nomeSalaAtual);
        gerarLinkCompartilhamento();
    } else {
        alert('Usuário ou senha incorretos!');
    }
}

// --- 3. LINK DE COMPARTILHAMENTO ---
function gerarLinkCompartilhamento() {
    // Pega a URL do seu GitHub Pages automaticamente
    const urlBase = window.location.origin + window.location.pathname;
    const urlCompleta = `${urlBase}?sala=${nomeSalaAtual}`;
    document.getElementById('link-reuniao').innerText = urlCompleta;
}

function copiarLink() {
    const linkTexto = document.getElementById('link-reuniao').innerText;
    navigator.clipboard.writeText(linkTexto).then(() => {
        alert("Link copiado! Envie para que outros entrem no seu SIDA.");
    });
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
async function initIA() {
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
