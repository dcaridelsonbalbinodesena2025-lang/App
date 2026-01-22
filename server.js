const WebSocket = require('ws');
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: "*" } });

// --- CONFIGURAÇÕES DO TELEGRAM ---
const TG_TOKEN = "8427077212:AAEiL_3_D_-fukuaR95V3FqoYYyHvdCHmEI"; 
const TG_CHAT_ID = "-1003355965894"; 

const ATIVOS = { "R_10": "Volatility 10 Index", "1HZ10V": "Volatility 10 (1s) Index" };

// Função para enviar para os dois lugares
function dispararSinal(mensagem, tipo, resultado = null) {
    // 1. Enviar para o Visor HTML
    io.emit('sinal_app', { 
        tipo: tipo, 
        texto: mensagem,
        resultado: resultado
    });

    // 2. Enviar para o Telegram
    const payload = { 
        chat_id: TG_CHAT_ID, 
        text: mensagem, 
        parse_mode: "Markdown" 
    };
    
    fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    }).catch(e => console.log("Erro Telegram:", e.message));
}

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
    const msgEntrada = `🎯 **ENTRADA CONFIRMADA**\n\n📊 Ativo: ${nome}\n🎯 Direção: ${direcao === "CALL" ? "COMPRA 🟢" : "VENDA 🔴"}\n📈 Taxa: ${taxaEntrada}`;

    dispararSinal(msgEntrada, 'ENTRADA');

    setTimeout(() => {
        const wsCheck = new WebSocket('wss://ws.binaryws.com/websockets/v3?app_id=1089');
        wsCheck.on('open', () => wsCheck.send(JSON.stringify({ ticks: idAtivo })));
        
        wsCheck.on('message', (data) => {
            const res = JSON.parse(data.toString());
            if (res.tick) {
                const taxaSaida = res.tick.quote;
                wsCheck.terminate();

                let ganhou = (direcao === "CALL" && taxaSaida > taxaEntrada) || (direcao === "PUT" && taxaSaida < taxaEntrada);
                const resultado = ganhou ? 'WIN' : 'LOSS';
                const emoji = ganhou ? '✅' : '❌';

                const msgResult = `${emoji} **RESULTADO: ${resultado}**\n\n📊 Ativo: ${nome}\n🏁 Saída: ${taxaSaida}`;
                
                dispararSinal(msgResult, 'RESULTADO', resultado);

                setTimeout(() => { operacaoEmCurso = false; }, 5000);
            }
        });
    }, 10000);
}

server.listen(process.env.PORT || 3000, () => {
    console.log("🚀 SISTEMA KCM CONECTADO: TELEGRAM + VISOR");
    iniciarMotorReal();
});
