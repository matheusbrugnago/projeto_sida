const URL_MODELO = "./model/"; 
let model, webcam, maxPredictions;
let nomeUsuarioLogado = ""; 
let api; // Variável do Jitsi
let iaBloqueada = false; 
const TEMPO_ESPERA = 10000; // 30 segundos

// --- LÓGICA DE ACESSO ---
function validarLogin() {
    const usuario = document.getElementById('user').value;
    const senha = document.getElementById('pass').value;

    if (usuario === 'Admin' && senha === '123') {
        nomeUsuarioLogado = usuario; 
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('app-screen').style.display = 'flex';
        iniciarJitsi();
    } else {
        alert('Usuário ou senha incorretos!');
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
    if (iaBloqueada) return;

    const prediction = await model.predict(webcam.canvas);
    const chatIA = document.getElementById("chat-ia");

    for (let i = 0; i < maxPredictions; i++) {
        const sinal = prediction[i].className;
        const certeza = prediction[i].probability;

        if (certeza > 0.90 && sinal !== "Fundo") {
            iaBloqueada = true; 

            const horaAtual = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            // Aqui está a formatação que você pediu!
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

            if (typeof api !== 'undefined') {
                api.executeCommand('sendChatMessage', `[LIBRAS - ${nomeUsuarioLogado}]: ${sinal}`, '', true);
            }

            chatIA.innerHTML += novaMensagem;
            chatIA.scrollTop = chatIA.scrollHeight;

            const btn = document.getElementById("btn-tradutor");
            btn.innerText = "ESPERANDO...";
            btn.style.backgroundColor = "#555";

            setTimeout(() => {
                iaBloqueada = false;
                btn.innerText = "IA ATIVA ✅";
                btn.style.backgroundColor = "#27ae60";
            }, TEMPO_ESPERA);

            break; 
        }
    }
}