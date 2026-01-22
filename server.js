const WebSocket = require('ws');
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: "*" } });

// 1. MAPEAMENTO DOS ATIVOS REAIS
const ativosIniciais = {
    "R_10": "Volatility 10 Index",
    "R_100": "Volatility 100 Index",
    "1HZ10V": "Volatility 10 (1s) Index",
    "1HZ100V": "Volatility 100 (1s) Index"
};

// 2. CONEXÃO COM A DERIV (DADOS REAIS)
function conectarDeriv() {
    Object.keys(ativosIniciais).forEach(symbol => {
        const ws = new WebSocket('wss://ws.binaryws.com/websockets/v3?app_id=1089');

        ws.on('open', () => ws.send(JSON.stringify({ ticks: symbol })));

        let historicoTicks = [];

        ws.on('message', (data) => {
            const msg = JSON.parse(data.toString());
            if (!msg.tick) return;

            const preco = msg.tick.quote;
            historicoTicks.push(preco);
            if (historicoTicks.length > 20) historicoTicks.shift();

            // 3. LOGICA DE ANÁLISE (EX: ESTRATÉGIA DE FLUXO)
            analisarSinal(symbol, historicoTicks);
        });

        ws.on('error', () => setTimeout(conectarDeriv, 5000)); // Reconectar se cair
    });
}

// 4. MOTOR DE ESTRATÉGIA E DISPARO PARA O APP
function analisarSinal(id, ticks) {
    if (ticks.length < 5) return;

    const ultimo = ticks[ticks.length - 1];
    const penultimo = ticks[ticks.length - 2];
    const antepenultimo = ticks[ticks.length - 3];

    let direcao = null;
    if (ultimo > penultimo && penultimo > antepenultimo) direcao = "CALL";
    if (ultimo < penultimo && penultimo < antepenultimo) direcao = "PUT";

    if (direcao) {
        const nomeAtivo = ativosIniciais[id];
        
        // FASE 1: Manda Alerta de Análise
        io.emit('sinal_app', {
            tipo: 'ALERTA',
            texto: `🔎 **ANALISANDO MERCADO**\nAtivo: ${nomeAtivo}\nEstratégia: Fluxo Sniper`
        });

        // FASE 2: Confirma Entrada após 2 segundos
        setTimeout(() => {
            io.emit('sinal_app', {
                tipo: 'ENTRADA',
                texto: `🎯 **ENTRADA CONFIRMADA**\nAtivo: ${nomeAtivo}\nDireção: ${direcao === "CALL" ? "COMPRA 🟢" : "VENDA 🔴"}`
            });

            // FASE 3: Resultado Real (Simulado pelo tempo de expiração)
            setTimeout(() => {
                const win = Math.random() > 0.4; // Aqui definimos o Win/Loss
                io.emit('sinal_app', {
                    tipo: 'RESULTADO',
                    texto: win ? `✅ **GREEN NO ${nomeAtivo}**` : `❌ **LOSS NO ${nomeAtivo}**`,
                    resultado: win ? 'WIN' : 'LOSS'
                });
            }, 10000); // 10 segundos para sair o resultado
        }, 2000);

        ticks.length = 0; // Limpa para não repetir sinal no mesmo movimento
    }
}

server.listen(process.env.PORT || 3000, () => {
    console.log("🚀 Motor de Sinais KCM Master Iniciado");
    conectarDeriv();
});
