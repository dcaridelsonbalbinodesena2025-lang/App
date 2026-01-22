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

const TG_TOKEN = "8427077212:AAEiL_3_D_-fukuaR95V3FqoYYyHvdCHmEI"; 
const TG_CHAT_ID = "-1003355965894"; 

// Adicionei todos os ativos para o servidor reconhecer o que vem do App
const ATIVOS = { 
    "R_10": "Volatility 10 Index", 
    "1HZ10V": "Volatility 10 (1s) Index",
    "R_100": "Volatility 100 Index",
    "1HZ100V": "Volatility 100 (1s) Index"
    // O servidor aceita qualquer ID enviado, mas aqui definimos os nomes bonitos
};

function dispararSinal(mensagem, tipo, resultado = null) {
    // Envia para o App
    io.emit('sinal_app', { tipo: tipo, texto: mensagem, resultado: resultado });
    
    // Envia para o Telegram
    fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: TG_CHAT_ID, text: mensagem, parse_mode: "HTML" })
    }).catch(e => console.log("Erro TG:", e.message));
}

function iniciarMotorKCM() {
    // Monitora os ativos principais (Você pode adicionar mais IDs aqui)
    ["R_10", "1HZ10V", "R_100", "1HZ100V"].forEach(id => {
        const ws = new WebSocket('wss://ws.binaryws.com/websockets/v3?app_id=1089');
        ws.on('open', () => ws.send(JSON.stringify({ ticks: id })));

        let m = { velaAb: 0, histCores: [], opAtiva: false, forca: 50 };

        ws.on('message', (data) => {
            const res = JSON.parse(data.toString());
            if (!res.tick || m.opAtiva) return;

            const p = res.tick.quote;
            const agora = new Date();
            const s = agora.getSeconds();

            if (m.velaAb > 0) m.forca = Math.min(98, Math.max(2, 50 + ((p - m.velaAb) / (m.velaAb * 0.0002) * 20)));

            if (s === 0 && m.velaAb !== p) {
                if (m.velaAb > 0) m.histCores.push(p > m.velaAb ? "V" : "R");
                if (m.histCores.length > 5) m.histCores.shift();
                m.velaAb = p;
            }

            // Estratégia Sniper
            if (m.forca >= 90 || m.forca <= 10) {
                executarOperacao(id, m.forca >= 90 ? "CALL" : "PUT", p, "SNIPER", 0);
            }
        });

        function executarOperacao(idAtivo, direcao, taxaEntrada, estrategia, gale) {
            m.opAtiva = true;
            const nome = ATIVOS[idAtivo] || idAtivo;
            
            // CÁLCULO DE HORÁRIOS (O que você pediu)
            const tempoInicio = new Date();
            const tempoFim = new Date(tempoInicio.getTime() + 10000); // 10 segundos depois
            
            const hI = tempoInicio.toLocaleTimeString();
            const hF = tempoFim.toLocaleTimeString();

            const msg = `🚀 <b>${gale === 0 ? "ENTRADA" : "GALE " + gale} CONFIRMADA</b>\n\n` +
                        `📊 Ativo: ${nome}\n` +
                        `🎯 Direção: ${direcao === "CALL" ? "COMPRA 🟢" : "VENDA 🔴"}\n` +
                        `⏰ Início: ${hI}\n` +
                        `⏳ Fim: ${hF}`;
            
            dispararSinal(msg, 'ENTRADA');

            setTimeout(() => {
                const wsCheck = new WebSocket('wss://ws.binaryws.com/websockets/v3?app_id=1089');
                wsCheck.on('open', () => wsCheck.send(JSON.stringify({ ticks: idAtivo })));
                wsCheck.on('message', (data) => {
                    const resCheck = JSON.parse(data.toString());
                    if (resCheck.tick) {
                        const ganhou = (direcao === "CALL" && resCheck.tick.quote > taxaEntrada) || (direcao === "PUT" && resCheck.tick.quote < taxaEntrada);
                        wsCheck.terminate();

                        if (ganhou) {
                            dispararSinal(`✅ <b>WIN</b>\n${nome}\nNo ${gale === 0 ? "Direto" : "Gale " + gale}`, 'RESULTADO', 'WIN');
                            setTimeout(() => m.opAtiva = false, 5000);
                        } else if (gale < 2) {
                            executarOperacao(idAtivo, direcao, resCheck.tick.quote, estrategia, gale + 1);
                        } else {
                            dispararSinal(`❌ <b>LOSS</b>\n${nome}\nFim de Ciclo`, 'RESULTADO', 'LOSS');
                            setTimeout(() => m.opAtiva = false, 5000);
                        }
                    }
                });
            }, 10000);
        }
    });
}

server.listen(process.env.PORT || 3000, () => { iniciarMotorKCM(); });
