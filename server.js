const WebSocket = require('ws');
const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: "*" } });

let estrategiaAtual = "Fluxo Sniper";

// LISTA DE ATIVOS PARA O MOTOR ANALISAR
const ativos = ["R_10", "R_25", "R_50", "R_75", "R_100", "1HZ10V", "1HZ100V"];

function iniciarAnalise() {
    ativos.forEach(ativo => {
        const ws = new WebSocket('wss://ws.binaryws.com/websockets/v3?app_id=1089');
        ws.on('open', () => ws.send(JSON.stringify({ ticks: ativo })));

        let historico = [];
        ws.on('message', (data) => {
            const res = JSON.parse(data);
            if (res.tick) {
                historico.push(res.tick.quote);
                if (historico.length > 5) {
                    const u = historico[historico.length - 1];
                    const p = historico[historico.length - 2];
                    const a = historico[historico.length - 3];

                    // LÓGICA DE TESTE: 3 TICKS NA MESMA DIREÇÃO
                    if (u > p && p > a) { 
                        executarCicloCompleto(ativo, "COMPRA 🟢"); 
                        historico = []; 
                    } else if (u < p && p < a) { 
                        executarCicloCompleto(ativo, "VENDA 🔴"); 
                        historico = []; 
                    }
                }
                if (historico.length > 10) historico.shift();
            }
        });
    });
}

// ESSA FUNÇÃO FAZ O SALDO DO APP MOVER
function executarCicloCompleto(ativo, direcao) {
    // 1. AVISO DE ANÁLISE (Bolha Amarela)
    io.emit('sinal_app', { tipo: 'ALERTA', texto: `🔎 ANALISANDO: ${ativo}\nEstratégia: ${estrategiaAtual}` });

    // 2. CONFIRMAÇÃO DE ENTRADA (Após 3 segundos)
    setTimeout(() => {
        io.emit('sinal_app', { tipo: 'ENTRADA', texto: `🎯 ENTRADA CONFIRMADA!\nAtivo: ${ativo}\nDireção: ${direcao}` });

        // 3. RESULTADO (Após 10 segundos) - ISSO MOVE O SALDO E O PLACAR
        setTimeout(() => {
            const ganhou = Math.random() > 0.4; // Simulação de Win/Loss
            const resultado = ganhou ? 'WIN' : 'LOSS';
            const msg = ganhou ? `✅ GREEN!\nAtivo: ${ativo}\nLucro: R$ 150.00` : `❌ LOSS\nAtivo: ${ativo}\nPrejuízo: R$ 100.00`;
            
            // AQUI É ONDE O SALDO MUDA NO APP
            io.emit('sinal_app', { tipo: 'RESULTADO', texto: msg, resultado: resultado });

        }, 10000); 
    }, 3000);
}

io.on('connection', (socket) => {
    console.log("App conectado e pronto para operar!");
});

app.get('/', (req, res) => res.send('🚀 KCM MASTER OPERACIONAL'));
server.listen(process.env.PORT || 3000, () => {
    console.log("Servidor rodando...");
    iniciarAnalise();
});
