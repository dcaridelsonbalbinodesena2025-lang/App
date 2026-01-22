const WebSocket = require('ws');
const fetch = require('node-fetch');
const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = socketIo(server, { 
    cors: { origin: "*", methods: ["GET", "POST"] },
    transports: ['websocket', 'polling'] 
});

const TG_TOKEN = "8427077212:AAEiL_3_D_-fukuaR95V3FqoYYyHvdCHmEI";
const TG_CHAT_ID = "-1003355965894";
let estrategiaAtual = "Fluxo Sniper";

const ativos = ["R_10", "R_25", "R_50", "R_75", "R_100", "1HZ10V", "1HZ100V"];
const ativosFormatados = { "R_10": "Volatility 10", "R_100": "Volatility 100", "1HZ10V": "Volatility 10 (1s)" };

function iniciarAnalise() {
    ativos.forEach(ativo => {
        const ws = new WebSocket('wss://ws.binaryws.com/websockets/v3?app_id=1089');
        ws.on('open', () => ws.send(JSON.stringify({ ticks: ativo })));
        let hist = [];
        ws.on('message', (data) => {
            const res = JSON.parse(data);
            if (res.tick) {
                hist.push(res.tick.quote);
                if (hist.length > 5) {
                    const u = hist[hist.length-1], p = hist[hist.length-2], a = hist[hist.length-3];
                    if (u > p && p > a) { gerarSinalReal(ativo, "COMPRA 🟢"); hist = []; }
                    else if (u < p && p < a) { gerarSinalReal(ativo, "VENDA 🔴"); hist = []; }
                    if (hist.length > 10) hist.shift();
                }
            }
        });
    });
}

function gerarSinalReal(ativo, direcao) {
    const nome = ativosFormatados[ativo] || ativo;
    const msg = `🎯 ENTRADA CONFIRMADA\n\n📊 Ativo: ${nome}\n🚀 Estratégia: ${estrategiaAtual}\n⚡️ Direção: ${direcao}\n⏰ Horário: ${new Date().toLocaleTimeString()}\n📱 KCM MASTER SUPREMO`;
    enviarSinal('ALERTA', msg);
}

function enviarSinal(tipo, texto, resultado = null) {
    // Envia para o App (Limpando formatação que trava o chat)
    const textoLimpo = texto.replace(/\*/g, "");
    io.emit('sinal_app', { tipo, texto: textoLimpo, resultado });
    
    // Envia para o Telegram
    fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: TG_CHAT_ID, text: texto, parse_mode: 'Markdown' })
    }).catch(e => console.log("Erro TG:", e));
}

io.on('connection', (socket) => {
    console.log("App Conectado via Socket!");
    socket.on('mudar_estrategia', (nova) => {
        estrategiaAtual = nova;
        enviarSinal('ALERTA', `🔄 ESTRATÉGIA ALTERADA\n\nOperando agora: ${estrategiaAtual}`);
    });
});

app.get('/', (req, res) => res.send('🚀 KCM MASTER ATIVO!'));
server.listen(process.env.PORT || 3000, () => { console.log("Servidor ON"); iniciarAnalise(); });
