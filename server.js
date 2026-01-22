const WebSocket = require('ws');
const fetch = require('node-fetch');
const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: "*" } });

const TG_TOKEN = "8427077212:AAEiL_3_D_-fukuaR95V3FqoYYyHvdCHmEI";
const TG_CHAT_ID = "-1003355965894";

let estrategiaAtual = "Fluxo Sniper";

// --- MOTOR DE ANÁLISE (O CORAÇÃO QUE FALTAVA) ---
const ativos = ["R_10", "R_25", "R_50", "R_75", "R_100", "1HZ10V", "1HZ100V"];
const conexoes = {};

function iniciarAnalise() {
    ativos.forEach(ativo => {
        const ws = new WebSocket('wss://ws.binaryws.com/websockets/v3?app_id=1089');
        
        ws.on('open', () => {
            ws.send(JSON.stringify({ ticks: ativo }));
            console.log(`Analisando: ${ativo}`);
        });

        let historico = [];
        ws.on('message', (data) => {
            const res = JSON.parse(data);
            if (res.tick) {
                historico.push(res.tick.quote);
                if (historico.length > 10) historico.shift();

                // LÓGICA DE EXEMPLO (Quando o preço sobe 3 vezes seguidas)
                if (historico.length >= 5) {
                    const ultima = historico[historico.length - 1];
                    const penultima = historico[historico.length - 2];
                    const antepenultima = historico[historico.length - 3];

                    if (ultima > penultima && penultima > antepenultima) {
                        gerarSinalReal(ativo, "COMPRA 🟢");
                        historico = []; // Reseta para não repetir o sinal
                    } else if (ultima < penultima && penultima < antepenultima) {
                        gerarSinalReal(ativo, "VENDA 🔴");
                        historico = [];
                    }
                }
            }
        });
        conexoes[ativo] = ws;
    });
}

function gerarSinalReal(ativo, direcao) {
    const nomeAtivo = ativosFormatados[ativo] || ativo;
    const msg = `🎯 **ENTRADA CONFIRMADA**\n\n` +
                `📊 Ativo: ${nomeAtivo}\n` +
                `🚀 Estratégia: ${estrategiaAtual}\n` +
                `⚡️ Direção: ${direcao}\n` +
                `⏰ Horário: ${new Date().toLocaleTimeString()}\n` +
                `📱 KCM MASTER SUPREMO`;

    enviarSinal('ALERTA', msg);
}

const ativosFormatados = {
    "R_10": "Volatility 10",
    "R_100": "Volatility 100",
    "1HZ10V": "Volatility 10 (1s)"
};

// --- FUNÇÃO DE ENVIO DUPLO ---
function enviarSinal(tipo, texto, resultado = null) {
    // 1. Manda para a sua TELA AZUL
    io.emit('sinal_app', { tipo, texto, resultado });
    
    // 2. Manda para o TELEGRAM
    fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: TG_CHAT_ID, text: texto, parse_mode: 'Markdown' })
    }).catch(e => console.log("Erro TG:", e));
}

io.on('connection', (socket) => {
    console.log("App conectado!");
    socket.on('mudar_estrategia', (novaEstrategia) => {
        estrategiaAtual = novaEstrategia;
        enviarSinal('ALERTA', `🔄 **ESTRATÉGIA ALTERADA**\n\nAgora operando: ${estrategiaAtual}`);
    });
});

app.get('/', (req, res) => { res.send('🚀 KCM MASTER ATIVO!'); });

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
    iniciarAnalise(); // Liga os motores!
});
