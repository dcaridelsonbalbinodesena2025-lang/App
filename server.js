const WebSocket = require('ws');
const fetch = require('node-fetch');
const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
app.use(express.json());
app.use(cors());

const server = http.createServer(app);
const io = socketIo(server, {
    cors: { origin: "*" }
});

const PORT = process.env.PORT || 3000; 

// --- CONFIGURAÇÕES ATUALIZADAS PELAS SUAS FOTOS ---
const TG_TOKEN = "8207372927:AAHWK0-klpRkwyChNqAEYsPKnN-pmuo2m38"; // Token da sua foto
const TG_CHAT_ID = "-1003583741616"; // ID do seu grupo da foto
const LINK_CORRETORA = "https://track.deriv.com/_S_W1N_"; 

// Variáveis de Estado (Certifique-se de que estão definidas no seu código completo)
let stats = { winDireto: 0, winG1: 0, winG2: 0, loss: 0 };

// --- FUNÇÃO PARA RESOLVER O "CANNOT GET /" ---
app.get('/', (req, res) => {
    res.send('<h1>🚀 Servidor KCM MASTER Ativo!</h1><p>Conectado e analisando o mercado...</p>');
});

// --- FUNÇÃO DE ENVIO PARA O TELEGRAM ---
async function enviarTelegram(texto, mostrarBotao = true) {
    const url = `https://api.telegram.org/bot${TG_TOKEN}/sendMessage`;
    const body = {
        chat_id: TG_CHAT_ID,
        text: texto,
        parse_mode: "Markdown"
    };
    if (mostrarBotao) {
        body.reply_markup = {
            inline_keyboard: [[{ text: "💻 OPERAR AGORA", url: LINK_CORRETORA }]]
        };
    }
    await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
}

// --- FUNÇÃO DE ENVIO PARA O APP ---
function enviarParaApp(canal, dados) {
    io.emit(canal, dados);
}

// --- MENSAGENS CONFIGURADAS PARA O SEU APP ---
function msgAlerta(m, est, dir) { 
    const texto = `🔍 *ALERTA DE SINAL*\n\n📊 Ativo: ${m.nome}\n⚡ Estratégia: ${est}\n🎯 Direção: ${dir}`;
    enviarTelegram(texto, false); 
    enviarParaApp('sinal_app', { tipo: 'ALERTA', texto: texto });
}

function msgEntrada(m, est, dir) { 
    let placar = `✅ ${stats.winDireto + stats.winG1 + stats.winG2} | ❌ ${stats.loss}`;
    const texto = `🚀 *ENTRADA CONFIRMADA*\n\n📊 Ativo: ${m.nome}\n⚡ Estratégia: ${est}\n🎯 Direção: ${dir === "CALL" ? "COMPRA 🟢" : "VENDA 🔴"}\n🕒 Placar: ${placar}`;
    enviarTelegram(texto); 
    enviarParaApp('sinal_app', { tipo: 'ENTRADA', texto: texto });
}

function msgResultado(m, est, res, status) {
    let emoji = res === 'WIN' ? '✅' : '❌';
    let placar = `✅ ${stats.winDireto + stats.winG1 + stats.winG2} | ❌ ${stats.loss}`;
    const texto = `${emoji} *RESULTADO: ${res === 'WIN' ? 'GREEN' : 'RED'}*\n\n🚦 Status: ${status}\n📊 Ativo: ${m.nome}\n📈 Placar: ${placar}`;
    enviarTelegram(texto);
    enviarParaApp('sinal_app', { tipo: 'RESULTADO', resultado: res, texto: texto });
}

// ... (Mantenha aqui todo o seu motor de análise WebSocket da Deriv) ...

server.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
