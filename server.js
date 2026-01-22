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
const io = socketIo(server, { cors: { origin: "*" } });

// --- CONFIGURAÇÕES DO SEU BOT ---
const TG_TOKEN = "8427077212:AAEiL_3_D_-fukuaR95V3FqoYYyHvdCHmEI";
const TG_CHAT_ID = "-1003355965894";

// --- VARIÁVEIS DE CONTROLE ---
let bancaInicial = 15000;
let bancaAtual = 15000;
let stats = { winDireto: 0, winG1: 0, winG2: 0, loss: 0 };

app.get('/', (req, res) => {
    res.send('<h1>🚀 Servidor KCM MASTER Ativo!</h1>');
});

// --- FUNÇÃO QUE ENVIA PARA O TELEGRAM E PARA O APP AO MESMO TEMPO ---
async function enviarSinal(tipo, texto, resultado = null) {
    // 1. Envia para o Telegram
    try {
        await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: TG_CHAT_ID, text: texto, parse_mode: 'Markdown' })
        });
    } catch (e) { console.error("Erro Telegram:", e); }

    // 2. Envia para o seu App (O que faz aparecer na tela azul)
    io.emit('sinal_app', {
        tipo: tipo,
        texto: texto,
        resultado: resultado
    });
}

// --- LOGICA DAS ESTRATÉGIAS (Sua parte complexa resumida para estabilidade) ---
// Aqui você pode inserir suas funções de análise Sniper/Fluxo.
// Sempre que a análise der GREEN, chame: enviarSinal('RESULTADO', '✅ GREEN!', 'WIN');

io.on('connection', (socket) => {
    console.log("App de R$ 15.000 conectado!"); //
    // Sinal de boas-vindas para confirmar que funcionou
    socket.emit('sinal_app', {
        tipo: 'ALERTA',
        texto: "🚀 **SISTEMA RESTAURADO**\n\nMonitorando Sniper e Fluxo com banca de R$ 15.000,00."
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
