let carrinho = [];

function adicionarAoCarrinho(nome, preco) {
    carrinho.push({ nome, preco });
    atualizarCarrinho();
}

function atualizarCarrinho() {
    const lista = document.getElementById('lista-carrinho');
    const totalEl = document.getElementById('total-carrinho');
    lista.innerHTML = '';
    let total = 0;

    carrinho.forEach((item, index) => {
        total += item.preco;
        lista.innerHTML += `<li>${item.nome} - R$ ${item.preco.toFixed(2)} <button onclick="removerItem(${index})" style="background:#dc3545; padding:2px 6px; font-size:10px;">X</button></li>`;
    });

    totalEl.innerText = total.toFixed(2);
}

function removerItem(index) {
    carrinho.splice(index, 1);
    atualizarCarrinho();
}

let dadosPedidoGlobal = {};
let intervaloVerificacao = null;

async function finalizarCompra() {
    if (carrinho.length === 0) {
        alert('Seu carrinho está vazio!');
        return;
    }
    const nome = document.getElementById('cliente-nome').value;
    const endereco = document.getElementById('cliente-endereco').value;
    const bairro = document.getElementById('cliente-bairro').value;

    if (!nome || !endereco || !bairro) {
        alert('Por favor, preencha nome, endereço e bairro!');
        return;
    }

    dadosPedidoGlobal = {
        nome,
        endereco,
        bairro,
        itens: [...carrinho],
        total: carrinho.reduce((acc, item) => acc + item.preco, 0)
    };

    // Mudar para a tela de pagamento
    document.getElementById('app-container').classList.add('hidden');
    document.getElementById('pagamento-container').classList.remove('hidden');

    // Alterar o conteúdo da tela de pagamento para exibir o QR Code real
    const containerPagamento = document.getElementById('pagamento-container');
    containerPagamento.innerHTML = `
        <h2>💳 Pagamento via Pix</h2>
        <p>Gerando QR Code do Mercado Pago...</p>
    `;

    try {
        // Pede ao servidor para criar o pagamento real no Mercado Pago
        const resposta = await fetch('/api/criar-pagamento', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dadosPedidoGlobal)
        });
        const resultado = await resposta.json();

        if (resultado.qr_code_base64) {
            containerPagamento.innerHTML = `
                <h2>💳 Pagamento via Pix</h2>
                <p>Escaneie o QR Code abaixo com o app do seu banco:</p>
                <div style="margin: 15px;">
                    <img src="data:image/jpeg;base64,${resultado.qr_code_base64}" alt="QR Code Pix" style="max-width: 200px; border-radius: 8px;">
                </div>
                <p style="font-size: 13px; word-break: break-all; background: rgba(0,0,0,0.3); padding: 8px; border-radius: 5px;">
                    <b>Pix Copia e Cola:</b><br>${resultado.qr_code}
                </p>
                <p id="status-pagamento-pix" style="font-weight: bold; color: #f1c40f; margin-top: 15px;">
                    ⏳ Aguardando a aprovação do pagamento...
                </p>
            `;

            // Iniciar checagem automática do pagamento
            iniciarVerificacaoPagamentoMP(resultado.id_pagamento);
        } else {
            containerPagamento.innerHTML = `<h2 style="color:red;">Erro ao gerar Pix. Tente novamente.</h2>`;
        }
    } catch (e) {
        containerPagamento.innerHTML = `<h2 style="color:red;">Erro de conexão com o servidor.</h2>`;
    }
}

// Função para tocar o som "tum tum" de confirmação de pagamento
function tocarSomSucesso() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        
        // Primeiro tom ("tum")
        const osc1 = audioCtx.createOscillator();
        const gain1 = audioCtx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(440, audioCtx.currentTime);
        gain1.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain1.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
        osc1.connect(gain1);
        gain1.connect(audioCtx.destination);
        osc1.start();
        osc1.stop(audioCtx.currentTime + 0.15);

        // Segundo tom ("tum") logo em seguida
        setTimeout(() => {
            const osc2 = audioCtx.createOscillator();
            const gain2 = audioCtx.createGain();
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(587.33, audioCtx.currentTime);
            gain2.gain.setValueAtTime(0.3, audioCtx.currentTime);
            gain2.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
            osc2.connect(gain2);
            gain2.connect(audioCtx.destination);
            osc2.start();
            osc2.stop(audioCtx.currentTime + 0.2);
        }, 150);
    } catch (e) {
        console.log("Áudio bloqueado pelo navegador.");
    }
}

// Verifica periodicamente se o Pix foi pago no Mercado Pago
function iniciarVerificacaoPagamentoMP(idPagamento) {
    intervaloVerificacao = setInterval(async () => {
        try {
            const res = await fetch(`/api/verificar-pagamento/${idPagamento}`);
            const dados = await res.json();

            if (dados.status === "approved") {
                clearInterval(intervaloVerificacao);

                // Toca o som "tum tum" automaticamente
                tocarSomSucesso();

                // Salva o pedido definitivamente no painel do restaurante/motoboy
                await registrarPedidoFinal();

                // Muda para a tela de sucesso
                document.getElementById('pagamento-container').classList.add('hidden');
                document.getElementById('sucesso-container').classList.remove('hidden');
            }
        } catch (e) {
            console.log("Aguardando confirmação...");
        }
    }, 4000); // Checa a cada 4 segundos
}

async function registrarPedidoFinal() {
    try {
        const response = await fetch('/api/pedidos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dadosPedidoGlobal)
        });
        const resultado = await response.json();
        if (resultado.success) {
            verificarStatusPedido(resultado.pedido.id);
        }
    } catch (e) {}
}

async function verificarStatusPedido(idPedido) {
    setInterval(async () => {
        try {
            const res = await fetch('/api/pedidos');
            const pedidos = await res.json();
            const meuPedido = pedidos.find(p => p.id === idPedido);
            if (meuPedido) {
                const textoStatus = document.getElementById('status-pedido-texto');
                textoStatus.innerText = meuPedido.status;
            }
        } catch(e) {}
    }, 3000);
}