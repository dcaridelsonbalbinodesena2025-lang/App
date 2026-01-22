const WebSocket = require('ws');
const fetch = require('node-fetch');
const express = require('express');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 3000; 

// --- CONFIGURAÇÕES ---
const TG_TOKEN = "8427077212:AAEiL_3_D_-fukuaR95V3FqoYYyHvdCHmEI"; 
const TG_CHAT_ID = "-1003355965894"; 
const LINK_CORRETORA = "https://track.deriv.com/_S_W1N_"; 

let configEstrategias = { "REGRA 1": true, "FLUXO SNIPER": true, "ZIGZAG FRACTAL": true, "SNIPER (RETRAÇÃO)": true };
let fin = { bancaInicial: 5000, bancaAtual: 5000, payout: 0.95 };
let stats = { winDireto: 0, winG1: 0, winG2: 0, loss: 0, totalAnalises: 0 };
let rankingEstrategias = {
    "REGRA 1": { d: 0, g1: 0, g2: 0, l: 0, t: 0 },
    "FLUXO SNIPER": { d: 0, g1: 0, g2: 0, l: 0, t: 0 },
    "ZIGZAG FRACTAL": { d: 0, g1: 0, g2: 0, l: 0, t: 0 },
    "SNIPER (RETRAÇÃO)": { d: 0, g1: 0, g2: 0, l: 0, t: 0 }
};

let motores = {};

// --- COMUNICAÇÃO TELEGRAM ---
function enviarTelegram(msg, comBotao = true) {
    let payload = { chat_id: TG_CHAT_ID, text: msg, parse_mode: "Markdown" };
    if (comBotao) payload.reply_markup = { inline_keyboard: [[{ text: "📲 ACESSAR CORRETORA", url: LINK_CORRETORA }]] };
    
    fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    }).catch(e => console.log("Erro TG:", e.message));
}

// --- LÓGICA DO MOTOR ---
function iniciarMotor(cardId, ativoId, nomeAtivo) {
    // Mata conexão antiga se existir
    if (motores[cardId]?.ws) {
        motores[cardId].ws.terminate();
    }
    
    if (ativoId === "OFF") {
        return motores[cardId] = { nome: "OFF", status: "OFF", preco: "---" };
    }

    let m = {
        nome: nomeAtivo, 
        ws: new WebSocket('wss://ws.binaryws.com/websockets/v3?app_id=1089'),
        preco: "0.0000", forca: 50, velaAb: 0, histCores: [],
        op: { ativa: false, est: "", pre: 0, t: 0, dir: "", g: 0, val: 0 }
    };

    m.ws.on('open', () => m.ws.send(JSON.stringify({ ticks: ativoId })));

    m.ws.on('message', (data) => {
        const res = JSON.parse(data.toString()); // Conversão segura de Buffer para String
        if (!res.tick) return;
        
        const p = res.tick.quote;
        const s = new Date().getSeconds();
        m.preco = p.toFixed(5);

        // Lógica de fechamento de vela e força
        if (s === 0 && m.velaAb !== p) {
            if (m.velaAb > 0) m.histCores.push(p > m.velaAb ? "V" : "R");
            if (m.histCores.length > 5) m.histCores.shift();
            m.velaAb = p;
        }

        // Gerenciamento de Operação Ativa
        if (m.op.ativa) {
            m.op.t--;
            if (m.op.t <= 0) {
                verificarResultado(m, p);
            }
        } else {
            processarEstrategias(m, p, s);
        }
    });

    motores[cardId] = m;
}

function processarEstrategias(m, preco, segundos) {
    // Exemplo: Fluxo Sniper aos 30 segundos da vela
    if (segundos === 30 && configEstrategias["FLUXO SNIPER"]) {
        let ult3 = m.histCores.slice(-3);
        if (ult3.length === 3 && ult3.every(c => c === ult3[0])) {
            disparar(m, "FLUXO SNIPER", ult3[0] === "V" ? "CALL" : "PUT", fin.bancaAtual * 0.01, preco, 30);
        }
    }
}

function verificarResultado(m, precoFinal) {
    let ganhou = (m.op.dir === "CALL" && precoFinal > m.op.pre) || (m.op.dir === "PUT" && precoFinal < m.op.pre);
    let est = m.op.est;

    if (ganhou) {
        let lucro = m.op.val * fin.payout;
        fin.bancaAtual += (m.op.val + lucro);
        registrarWin(est, m.op.g);
        enviarTelegram(`✅ *GREEN: ${est}*\nAtivo: ${m.nome}\nPlacar: ${stats.winDireto + stats.winG1 + stats.winG2}W - ${stats.loss}L`);
        m.op.ativa = false;
    } else if (m.op.g < 1) { // Tenta Gale 1
        m.op.g++;
        m.op.val *= 2.2;
        fin.bancaAtual -= m.op.val;
        m.op.t = 60;
        m.op.pre = precoFinal;
    } else {
        stats.loss++;
        rankingEstrategias[est].l++;
        stats.totalAnalises++;
        enviarTelegram(`❌ *RED: ${est}*\nAtivo: ${m.nome}`);
        m.op.ativa = false;
    }
}

function registrarWin(est, gale) {
    stats.totalAnalises++;
    rankingEstrategias[est].t++;
    if (gale === 0) { stats.winDireto++; rankingEstrategias[est].d++; }
    else if (gale === 1) { stats.winG1++; rankingEstrategias[est].g1++; }
}

function disparar(m, est, dir, val, pre, t) {
    if (fin.bancaAtual < val) return; // Proteção de banca
    fin.bancaAtual -= val;
    m.op = { ativa: true, est: est, pre: pre, t: t, dir: dir, g: 0, val: val };
    enviarTelegram(`🚀 *ENTRADA CONFIRMADA*\nAtivo: ${m.nome}\nEstratégia: ${est}\nDireção: ${dir}`);
}

// --- ENDPOINTS API ---
app.get('/status', (req, res) => {
    res.json({
        banca: fin.bancaAtual.toFixed(2),
        lucro: (fin.bancaAtual - fin.bancaInicial).toFixed(2),
        placar: `${stats.winDireto + stats.winG1 + stats.winG2}W | ${stats.loss}L`,
        ativos: Object.keys(motores).map(id => ({ id, nome: motores[id].nome, preco: motores[id].preco }))
    });
});

app.post('/mudar', (req, res) => {
    iniciarMotor(req.body.cardId, req.body.ativoId, req.body.nomeAtivo);
    res.json({ success: true });
});

app.listen(PORT, () => console.log(`Servidor KCM Master rodando na porta ${PORT}`));
