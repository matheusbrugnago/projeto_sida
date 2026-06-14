O QUE É O SIDA?

É um projeto de chamada de video que inclua a comunicação em libras em ambientes corporativos.
Foi desenvolvido com o propósito de acessibilidade na comunicação interna à empresa, para inclusão dos surdos em reuniões ao vivo no espaço empresarial.
Hoje, o site está hospedado em https://matheusbrugnago.github.io/projeto_sida/.

COMO ELE TRABALHA?

Há dois tipos de mensagens entre a comunidade surda e o mundo, um tenta falar e o outro demonstrar os sinais. Para resolução foi trabalhado em dois canais:

1°)Surdo -> Mundo ( Ativação de IA que traduz os sinais para português escrito, e automaticamente para linguagem falada )
2°)Mundo -> Surdo ( Funcionalidade de Falar para o Surdo e encaminhar português escrito em chat )

Para trabalhar com o caminho 1, foi implantado inicialmente a tecnologia do Google Teachnable Machine que trabalha com o aprendizado da máquina por meio de imagens, entretanto na fase de testes foi desaprovado em virtude de a cada segundo haver muitos quadros(imagens), na qual quando o usuário emitia os sinais o sistema respondia em todos esses frames, o que acabava sobrecarregando o chat local. Para evitar isso e também para o treinamento de sinais ser melhorado, foi aplicado o framework MediaPipe LandMarks, que basicamente marca 21 pontos nos dedos das mãos e que com cálculos matemáticos é possível definir os sinais. Foi treinado o alfabeto inteiro com exceção da letra Z, além de inclusão do sinal de "Oi", por padrão, na linguagem em Libras a conversa não é feita por soletramento e sim por sinais dinâmicos, todavia, não foi possível essa implementação por falta de tecnologia e um custo investido para que apostasse nesse dinamismo. Com o sinal emitido pelo surdo, o sistema envia essa mensagem ao Chat após um Buffer, ou seja espera que seja sinalizado todas as letras, e assim o sistema por meio da ferramenta speechSynthesis emite um som ( lê a mensagem com a Voz automática do Windows ) para todos os ouvintes da chamada. Logo, português escrito e falado aqui são apresentados!

Para o caminho 2, foi mais simples, pois a necessidade é que ao falar seja gravado em português escrito, e isso foi aplicado com a função speechSynthesis que basicamente emula um gravador de Voz aonde o usuário inicia a gravação, fala e depois emite ao Chat. No outro lado da conversa, os surdos têm a opção da utilização do Widget do VLibras na qual abre uma mini tela durante a chamada, que com auxílio de um boneco 3D o usuário seleciona a frase recebida no chat e é traduzido em Libras graficamente. Uma excelente opção para tradução rápida.

Diante dessa estrutura, o sistema está construido sob a API do Jistsi na qual é um Open Source que disponibilizou a possibilidade de ter chamada de videos gratuitamente. E com essas "calls" foi introduzido essas aplicações de tradução em Libras. Assim é possível ter encontros on-line entre os usuários surdos e os ouvintes, dentro de uma mesma sessão.
Abaixo segue alguns pontos também que agregam à esse sistema de chamada:
-> Administrador tem acesso exclusivo à página de criação e edição de Empresas e Usuários
-> Para cada usuário criado é necessário vinculá-la à alguma empresa cadastrada
-> Os usuários acessam com seu Login e necessitam ter Login no Jitsi Meeting, para acesso à API Local, quando faço login à primeira vez nas próximas será automático
-> Dentro da sessão há a possibilidade do usuário copiar um Link e encaminhar à quem vai participar da reunião
-> O usuário tem a possibilidade de edição de Senha e Tipo de Usuário.
-> Há possibilidade de envio de mensagens manualmente por meio do Chat Automático, tanto do surdo como do ouvinte
-> Opção de Sair/LogOut na chamada

Uma observação, para testes internos e validação dos sinais calculados por meio dos pontos das mãos foi criado o arquivo tradutor.html, que ainda ficará em destaque no código para caso precise analisar o funcionamento de alguns sinais. Pelo o que foi validado no dia 11 de Junho, o sistema está apresentando falhas nas leituras do "A","K","X","Z", porém isso já era esperado em virtude da dificuldade de cálculo em tela.

USUARIOS PARA ACESSO E TESTE:

Para acesso ao painel de Administrador:
usuario: admin
senha: GuiMarMa1234

Acesso ao Surdo:
usuario: brugnagomatheus98@gmail.com
senha: sida1234

Acesso ao Ouvinte:
usuario: arthurbrugnago@gmail.com.br
senha: sida456

LIMITAÇÕES ENCONTRADAS:

Em virtude do uso da API Jitsi gratuitamente, o tempo máximo da chamada é de 5 minutos e nada além, porém futuramente a ideia é que o sistema possa estar trabalhando com encontros ilimitados no tempo que for necessário para os usuários.
O sistema tem funções de envio de Voz e autorização de Microfone que alguns navegadores não possuem, nesse caso, é recomendado o uso do Google Chrome que com base nos testes é o que melhor performou e demonstrou 100 % de sucesso em suas funções.
Houve uma falha encontrada na função de resetar a senha, por isso não é recomendado o uso dela para resetar as senhas temporariamente.

PARA TESTE LOCAL:

1-Faça download dos arquivos para repositório local
2-Clique com botão direito em cima do index.html e rode o Live Server no Chrome
3-Já irá abrir na Aplicação

TECNOLOGIAS UTILIZADAS:
-> HTML, CSS e JavaScript
-> API Jitsi Meeting
-> Framework MediaPipe LandMarks
-> Biblioteca VLibras
-> Base de Dados NOSQL FireBase

