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

// --- CONFIGURAÇÕES ---
const TG_TOKEN = "8427077212:AAEiL_3_D_-fukuaR95V3FqoYYyHvdCHmEI"; 
const TG_CHAT_ID = "-1003355965894"; 
const ATIVOS = { "R_10": "Volatility 10 Index", "1HZ10V": "Volatility 10 (1s) Index" };

function dispararSinal(mensagem, tipo, resultado = null) {
    io.emit('sinal_app', { tipo: tipo, texto: mensagem, resultado: resultado });
    fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: TG_CHAT_ID, text: mensagem, parse_mode: "Markdown" })
    }).catch(e => console.log("Erro Telegram:", e.message));
}

function iniciarMotorReal() {
    Object.keys(ATIVOS).forEach(id => {
        const ws = new WebSocket('wss://ws.binaryws.com/websockets/v3?app_id=1089');
        ws.on('open', () => ws.send(JSON.stringify({ ticks: id })));

        let historico = [];
        let estado = { ativa: false, direcao: "", taxa: 0, gale: 0 };

        ws.on('message', (data) => {
            const res = JSON.parse(data.toString());
            if (!res.tick || estado.ativa) return;

            const p = res.tick.quote;
            historico.push(p);
            if (historico.length > 10) historico.shift();

            // Estratégia de 3 Ticks
            if (historico.length >= 4) {
                const u = historico[historico.length - 1];
                const p2 = historico[historico.length - 2];
                const a = historico[historico.length - 3];
                let dir = (u > p2 && p2 > a) ? "CALL" : (u < p2 && p2 < a) ? "PUT" : null;

                if (dir) {
                    executarCicloOperacional(id, dir, p, 0); // Inicia no Gale 0 (Entrada)
                    historico = [];
                }
            }
        });

        function executarCicloOperacional(idAtivo, direcao, taxaEntrada, numGale) {
            estado.ativa = true;
            const nome = ATIVOS[idAtivo];
            const prefixo = numGale === 0 ? "🎯 ENTRADA" : `🔄 GALE ${numGale}`;
            
            dispararSinal(`${prefixo} CONFIRMADA\n\n📊 Ativo: ${nome}\n🎯 Dir: ${direcao === "CALL" ? "COMPRA 🟢" : "VENDA 🔴"}`, 'ENTRADA');

            setTimeout(() => {
                const wsCheck = new WebSocket('wss://ws.binaryws.com/websockets/v3?app_id=1089');
                wsCheck.on('open', () => wsCheck.send(JSON.stringify({ ticks: idAtivo })));
                
                wsCheck.on('message', (data) => {
                    const resCheck = JSON.parse(data.toString());
                    if (resCheck.tick) {
                        const taxaSaida = resCheck.tick.quote;
                        wsCheck.terminate();

                        let ganhou = (direcao === "CALL" && taxaSaida > taxaEntrada) || (direcao === "PUT" && taxaSaida < taxaEntrada);

                        if (ganhou) {
                            dispararSinal(`✅ WIN NO ${numGale === 0 ? 'DIRETO' : 'GALE ' + numGale}\n\n📊 Ativo: ${nome}`, 'RESULTADO', 'WIN');
                            setTimeout(() => { estado.ativa = false; }, 5000);
                        } else if (numGale < 2) {
                            // Se perdeu e ainda tem Gale disponível (até G2)
                            executarCicloOperacional(idAtivo, direcao, taxaSaida, numGale + 1);
                        } else {
                            // Loss total após G2
                            dispararSinal(`❌ LOSS APÓS GALE 2\n\n📊 Ativo: ${nome}`, 'RESULTADO', 'LOSS');
                            setTimeout(() => { estado.ativa = false; }, 5000);
                        }
                    }
                });
            }, 10000); // Expiração de 10 segundos
        }
    });
}

server.listen(process.env.PORT || 3000, () => {
    console.log("🚀 SISTEMA KCM COM GALE ATIVADO");
    iniciarMotorReal();
});
