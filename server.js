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

// --- CONFIGURAÇÕES DO GRUPO (Trago do Robô do Grupo) ---
const TG_TOKEN = "8427077212:AAEiL_3_D_-fukuaR95V3FqoYYyHvdCHmEI"; 
const TG_CHAT_ID = "-1003355965894"; 
const HORA_INICIO = 0; 
const HORA_FIM = 23;

const ATIVOS = { "R_10": "Volatility 10 Index", "1HZ10V": "Volatility 10 (1s) Index" };

// Função Unificada (Telegram + Visor HTML)
function dispararSinal(mensagem, tipo, resultado = null) {
    io.emit('sinal_app', { tipo: tipo, texto: mensagem, resultado: resultado });
    fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: TG_CHAT_ID, text: mensagem, parse_mode: "Markdown" })
    }).catch(e => console.log("Erro TG:", e.message));
}

function iniciarMotorKCM() {
    Object.keys(ATIVOS).forEach(id => {
        const ws = new WebSocket('wss://ws.binaryws.com/websockets/v3?app_id=1089');
        ws.on('open', () => ws.send(JSON.stringify({ ticks: id })));

        let m = {
            velaAb: 0, histCores: [], status: "MONITORANDO",
            opAtiva: false, forca: 50
        };

        ws.on('message', (data) => {
            const res = JSON.parse(data.toString());
            if (!res.tick || m.opAtiva) return;

            const p = res.tick.quote;
            const agora = new Date();
            const s = agora.getSeconds();
            const h = agora.getHours();

            // Cálculo de Força (Lógica do Robô do Grupo)
            if (m.velaAb > 0) {
                m.forca = Math.min(98, Math.max(2, 50 + ((p - m.velaAb) / (m.velaAb * 0.0002) * 20)));
            }

            // Fechamento de Vela (A cada minuto)
            if (s === 0 && m.velaAb !== p) {
                if (m.velaAb > 0) m.histCores.push(p > m.velaAb ? "V" : "R");
                if (m.histCores.length > 5) m.histCores.shift();
                m.velaAb = p;
            }

            // ESTRATÉGIAS DO GRUPO
            const podeOperar = h >= HORA_INICIO && h < HORA_FIM;
            if (podeOperar && !m.opAtiva) {
                
                // 1. Estratégia Sniper (Baseada em Força)
                if (m.forca >= 85 || m.forca <= 15) {
                    const dir = m.forca >= 85 ? "CALL" : "PUT";
                    executarOperacao(id, dir, p, "SNIPER REAL", 0);
                }
                
                // 2. Estratégia de Fluxo (3 cores iguais)
                else if (s === 30 && m.histCores.length >= 3) {
                    const ult3 = m.histCores.slice(-3);
                    if (ult3.every(c => c === "V")) executarOperacao(id, "CALL", p, "FLUXO KCM", 0);
                    if (ult3.every(c => c === "R")) executarOperacao(id, "PUT", p, "FLUXO KCM", 0);
                }
            }
        });

        function executarOperacao(idAtivo, direcao, taxaEntrada, estrategia, gale) {
            m.opAtiva = true;
            const nome = ATIVOS[idAtivo];
            const msg = `🚀 *ENTRADA CONFIRMADA*\n\n📊 Ativo: ${nome}\n⚡ Estratégia: ${estrategia}\n🎯 Direção: ${direcao === "CALL" ? "COMPRA 🟢" : "VENDA 🔴"}\n🔄 Nível: ${gale === 0 ? "Direta" : "Gale " + gale}`;
            
            dispararSinal(msg, 'ENTRADA');

            setTimeout(() => {
                // Checagem de Resultado
                const wsCheck = new WebSocket('wss://ws.binaryws.com/websockets/v3?app_id=1089');
                wsCheck.on('open', () => wsCheck.send(JSON.stringify({ ticks: idAtivo })));
                wsCheck.on('message', (data) => {
                    const resCheck = JSON.parse(data.toString());
                    if (resCheck.tick) {
                        const taxaSaida = resCheck.tick.quote;
                        wsCheck.terminate();

                        let ganhou = (direcao === "CALL" && taxaSaida > taxaEntrada) || (direcao === "PUT" && taxaSaida < taxaEntrada);

                        if (ganhou) {
                            dispararSinal(`✅ *WIN NO ${gale === 0 ? "DIRETO" : "GALE " + gale}*\n🎯 Estratégia: ${estrategia}`, 'RESULTADO', 'WIN');
                            setTimeout(() => { m.opAtiva = false; }, 5000);
                        } else if (gale < 2) {
                            executarOperacao(idAtivo, direcao, taxaSaida, estrategia, gale + 1);
                        } else {
                            dispararSinal(`❌ *LOSS NO GALE 2*\n📊 Ativo: ${nome}`, 'RESULTADO', 'LOSS');
                            setTimeout(() => { m.opAtiva = false; }, 5000);
                        }
                    }
                });
            }, 10000); // 10 segundos de expiração
        }
    });
}

server.listen(process.env.PORT || 3000, () => {
    console.log("🚀 SUPER ROBÔ KCM INICIADO");
    iniciarMotorKCM();
});
