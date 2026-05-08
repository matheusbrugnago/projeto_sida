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
// Função para gerar um ID aleatório para a sala
function gerarIdSala(tamanho) {
    const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let resultado = '';
    for (let i = 0; i < tamanho; i++) {
        resultado += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
    }
    return resultado;
}

// Variável global para armazenar o nome da sala da sessão atual
let nomeSalaAtual = "";

function entrarNoSistema() {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app-screen').style.display = 'flex';
    
    // NOVO: Verifica se existe um ID de sala na URL (vinda do convite)
    const urlParams = new URLSearchParams(window.location.search);
    const salaPeloLink = urlParams.get('sala');

    if (salaPeloLink) {
        nomeSalaAtual = salaPeloLink;
    } else if (!nomeSalaAtual) {
        nomeSalaAtual = "SIDA-" + gerarIdSala(8);
    }
    
    iniciarJitsi(nomeSalaAtual); // Passamos o nome dinâmico para o Jitsi
    gerarLinkCompartilhamento(); 
}
// --- LÓGICA DE RECONHECIMENTO DE VOZ (PONTO B para PONTO A) ---
// --- LÓGICA DE RECONHECIMENTO DE VOZ ATUALIZADA ---
let gravandoVoz = false; // Variável global para controlar o estado
let recognition; // Variável global para a instância

function iniciarReconhecimentoVoz() {
    const btnVoz = document.getElementById("btn-voz");
    const chatIA = document.getElementById("chat-ia");
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
        alert("API de voz não suportada.");
        return;
    }

    // Se já estiver gravando, nós paramos manualmente
    if (gravandoVoz) {
        recognition.stop();
        gravandoVoz = false;
        btnVoz.innerText = "🎙️ Falar com o Surdo";
        btnVoz.style.backgroundColor = "#3498db";
        return;
    }

    // Se não estiver gravando, iniciamos a configuração
    recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.continuous = true; // <--- O SEGREDO: Não para sozinho!
    recognition.interimResults = false; 

    recognition.onstart = () => {
        gravandoVoz = true;
        btnVoz.innerText = "🛑 Parar Gravação"; // Feedback visual de interrupção
        btnVoz.style.backgroundColor = "#e74c3c"; // Vermelho para indicar "parar"
    };

    recognition.onresult = (event) => {
        let textoFinal = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
            textoFinal += event.results[i][0].transcript;
        }

        if (textoFinal.trim() !== "") {
            // --- TRATATIVA DE PONTUAÇÃO ---
            let textoComPontuacao = textoFinal.trim();

            // 1. Detectar se a frase começa com palavras de pergunta
            const palavrasPergunta = ["quem", "qual", "onde", "quando", "por que", "como", "quanto", "será"];
            const primeiraPalavra = textoComPontuacao.split(" ")[0].toLowerCase();

            if (palavrasPergunta.includes(primeiraPalavra)) {
                // Se terminar sem sinal, coloca interrogação
                if (!textoComPontuacao.endsWith("?") && !textoComPontuacao.endsWith("!") && !textoComPontuacao.endsWith(".")) {
                    textoComPontuacao += "?";
                }
            } else {
                // Se for afirmação e não tiver nada, coloca ponto final
                if (!textoComPontuacao.endsWith("?") && !textoComPontuacao.endsWith("!") && !textoComPontuacao.endsWith(".")) {
                    textoComPontuacao += ".";
                }
            }

            // 2. Formatar Maiúscula
            const textoFormatado = textoComPontuacao.charAt(0).toUpperCase() + textoComPontuacao.slice(1);
            // ------------------------------

            const hora = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            if (api) {
                api.executeCommand('sendChatMessage', `[VOZ]: ${textoFormatado}`, '', true);
            }

            chatIA.innerHTML += `
                <div style="margin-bottom: 12px; border-bottom: 1px solid #eee; padding-bottom: 5px; background-color: #f9f9f9; padding: 8px; border-radius: 5px;">
                    <span style="font-size: 0.85em; color: #3498db; display: block; font-weight: bold;">${nomeUsuarioLogado} às ${hora}:</span>
                    <span style="font-size: 1em; color: #2c3e50;">"${textoFormatado}"</span>
                </div>`;
            chatIA.scrollTop = chatIA.scrollHeight;
        }
    };

    recognition.onerror = (event) => {
        console.error("Erro voz:", event.error);
        gravandoVoz = false;
        btnVoz.innerText = "🎙️ Falar com o Surdo";
        btnVoz.style.backgroundColor = "#3498db";
    };

    recognition.start();
}

// --- LÓGICA DO JITSI ---
function iniciarJitsi(sala) { // <--- Adicionamos o parâmetro 'sala' aqui
    const domain = 'meet.jit.si';
    const options = {
        roomName: sala, // <--- Agora ele usa a sala dinâmica gerada!
        width: '100%',
        height: '100%',
        parentNode: document.querySelector('#meet-container'),
        interfaceConfigOverwrite: { 
            TOOLBAR_BUTTONS: ['microphone', 'camera', 'chat', 'hangup'] 
        }
    };
    
    api = new JitsiMeetExternalAPI(domain, options);

    // --- NOVO: SINCRONIZAÇÃO DO CHAT ---
    // Substitua o bloco api.addEventListeners pelo código abaixo:
    api.addEventListeners({
    incomingMessage: function (event) {
        // 1. Extração de dados básicos
        const msg = event.message;
        const usuarioRemoto = event.nick || "Outro Usuário"; 
        const hora = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        // 2. Filtro: Só processa mensagens com nossas etiquetas
        if (msg.includes("[LIBRAS") || msg.includes("[VOZ]")) {
            const chatIA = document.getElementById("chat-ia");
            
            // 3. Limpeza do texto para exibição e tradução
            let textoLimpo = msg.replace(/\[LIBRAS - .*\]: /, "").replace("[VOZ]: ", "");

            // 4. Acionamento do VLibras
            // Verifica se o plugin está carregado e pronto
            try {
                if (window.plugin && window.plugin.player && window.plugin.player.loaded) {
                    window.plugin.player.translate(textoLimpo);
                }
            } catch (e) {
                console.log("Aguardando ativação do VLibras pelo usuário.");
            }

            // 5. Criação do elemento visual no chat lateral
            const mensagemRecebida = `
                <div style="margin-bottom: 12px; border-bottom: 1px solid #eee; padding-bottom: 5px; background-color: #f0f7ff; border-radius: 5px; padding: 8px; border-left: 4px solid #3498db;">
                    <span style="font-size: 0.75em; color: #2980b9; display: block; margin-bottom: 2px; font-weight: bold;">
                        ${usuarioRemoto} às ${hora}:
                    </span>
                    <span style="font-size: 1em; color: #2c3e50;">
                        "${textoLimpo}"
                    </span>
                </div>
            `;

            // 6. Inserção e Rolagem
            chatIA.innerHTML += mensagemRecebida;
            chatIA.scrollTop = chatIA.scrollHeight;
        }
    }
});
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
// 1. Função para atualizar o link na tela (chame isso dentro de entrarNoSistema)
function gerarLinkCompartilhamento() {
    // Pega o endereço atual do seu site automaticamente
    const urlBase = window.location.href.split('?')[0]; 
    
    // Cria o link que envia o ID da sala pela URL
    const urlCompleta = `${urlBase}?sala=${nomeSalaAtual}`;
    
    document.getElementById('link-reuniao').innerText = urlCompleta;
}

// 2. Função de Copiar e Colar
function copiarLink() {
    const linkTexto = document.getElementById('link-reuniao').innerText;
    
    // API de área de transferência moderna
    navigator.clipboard.writeText(linkTexto).then(() => {
        alert("Link da reunião copiado! Agora você pode enviar para os seus Colegas");
    }).catch(err => {
        console.error('Erro ao copiar: ', err);
    });
}