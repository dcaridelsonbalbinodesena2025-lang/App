const WebSocket = require('ws');
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: "*" } });

const ATIVOS = { "R_10": "Volatility 10 Index", "1HZ10V": "Volatility 10 (1s) Index" };

function iniciarMotorReal() {
    Object.keys(ATIVOS).forEach(id => {
        const ws = new WebSocket('wss://ws.binaryws.com/websockets/v3?app_id=1089');
        ws.on('open', () => ws.send(JSON.stringify({ ticks: id })));

        let historico = [];
        let operacaoEmCurso = false;

        ws.on('message', (data) => {
            const res = JSON.parse(data.toString());
            if (!res.tick || operacaoEmCurso) return;

            const precoAtual = res.tick.quote;
            historico.push(precoAtual);
            if (historico.length > 10) historico.shift();

            // ESTRATÉGIA: 3 Ticks de força
            if (historico.length >= 4) {
                const u = historico[historico.length - 1];
                const p = historico[historico.length - 2];
                const a = historico[historico.length - 3];

                let direcao = (u > p && p > a) ? "CALL" : (u < p && p < a) ? "PUT" : null;

                if (direcao) {
                    operacaoEmCurso = true;
                    executarOperacaoReal(id, direcao, precoAtual);
                    historico = [];
                }
            }
        });
    });
}

function executarOperacaoReal(idAtivo, direcao, taxaEntrada) {
    const nome = ATIVOS[idAtivo];
    const tempoExpiracao = 10000; // 10 Segundos para checar o resultado real

    // 1. MANDA A ENTRADA
    io.emit('sinal_app', { 
        tipo: 'ENTRADA', 
        texto: `🎯 **ENTRADA REAL**\nAtivo: ${nome}\nTaxa: ${taxaEntrada}\nDireção: ${direcao === "CALL" ? "COMPRA 🟢" : "VENDA 🔴"}` 
    });

    // 2. ESPERA O TEMPO DO GRÁFICO
    setTimeout(() => {
        // Conecta rápido para pegar o preço de fechamento real
        const wsCheck = new WebSocket('wss://ws.binaryws.com/websockets/v3?app_id=1089');
        wsCheck.on('open', () => wsCheck.send(JSON.stringify({ ticks: idAtivo })));
        
        wsCheck.on('message', (data) => {
            const res = JSON.parse(data.toString());
            if (res.tick) {
                const taxaSaida = res.tick.quote;
                wsCheck.terminate();

                // 3. COMPARAÇÃO MATEMÁTICA REAL
                let ganhou = false;
                if (direcao === "CALL" && taxaSaida > taxaEntrada) ganhou = true;
                if (direcao === "PUT" && taxaSaida < taxaEntrada) ganhou = true;

                const resultado = ganhou ? 'WIN' : 'LOSS';
                const emoji = ganhou ? '✅' : '❌';

                // 4. ENVIA O RESULTADO BASEADO NO PREÇO, NÃO NA SORTE
                io.emit('sinal_app', { 
                    tipo: 'RESULTADO', 
                    texto: `${emoji} **FECHAMENTO REAL**\nEntrada: ${taxaEntrada}\nSaída: ${taxaSaida}\nResultado: ${resultado}`,
                    resultado: resultado 
                });

                // Libera para a próxima análise após 5 segundos
                setTimeout(() => { operacaoEmCurso = false; }, 5000);
            }
        });
    }, tempoExpiracao);
}

server.listen(process.env.PORT || 3000, () => {
    console.log("🚀 SISTEMA 100% REAL INICIADO");
    iniciarMotorReal();
});
