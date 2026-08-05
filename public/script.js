let carrinho = [];

function adicionarAoCarrinho(nome, preco, itemId) {
    carrinho.push({ nome, preco, itemId });
    atualizarCarrinho();
}

function atualizarCarrinho() {
    const lista = document.getElementById('lista-carrinho');
    const subtotalEl = document.getElementById('subtotal-carrinho');
    const taxaEl = document.getElementById('taxa-entrega');
    const totalEl = document.getElementById('total-carrinho');
    
    if (!lista || !totalEl) return;
    
    lista.innerHTML = '';
    let subtotal = 0;

    carrinho.forEach((item, index) => {
        subtotal += item.preco;
        lista.innerHTML += `<li>${item.nome} - R$ ${item.preco.toFixed(2)} <button onclick="removerItem(${index})" style="background:#dc3545; padding:2px 6px; font-size:10px;">X</button></li>`;
    });

    if (subtotalEl) subtotalEl.innerText = subtotal.toFixed(2);
    
    // Pega a taxa com base no bairro selecionado
    const selectBairro = document.getElementById('cliente-bairro');
    let taxa = 0;
    if (selectBairro && selectBairro.selectedIndex > 0) {
        taxa = parseFloat(selectBairro.options[selectBairro.selectedIndex].getAttribute('data-taxa')) || 0;
    }
    if (taxaEl) taxaEl.innerText = taxa.toFixed(2);

    let totalGeral = subtotal + taxa;
    totalEl.innerText = totalGeral.toFixed(2);
}

function atualizarTaxaEntrega() {
    atualizarCarrinho();
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
    const whatsapp = document.getElementById('cliente-whatsapp').value;
    const endereco = document.getElementById('cliente-endereco').value;
    const referencia = document.getElementById('cliente-referencia').value;
    const bairroSelect = document.getElementById('cliente-bairro');
    const bairro = bairroSelect.value;
    const taxa = parseFloat(bairroSelect.options[bairroSelect.selectedIndex]?.getAttribute('data-taxa')) || 0;
    const formaPagamento = document.getElementById('forma-pagamento').value;
    let informacaoPagamento = "";

    if (!nome || !whatsapp || !endereco || !referencia || !bairro) {
        alert('Por favor, preencha todos os dados de entrega (Nome, WhatsApp, Endereço, Referência e Bairro)!');
        return;
    }

    const subtotalCarrinho = carrinho.reduce((acc, item) => acc + item.preco, 0);
    const totalCarrinho = subtotalCarrinho + taxa;

    // Gera o código aleatório de 4 dígitos para o pedido
    const codigoPedido = Math.floor(1000 + Math.random() * 9000);

    // Validação se for Dinheiro
    if (formaPagamento === 'Dinheiro') {
        const valorDinheiroInput = document.getElementById('valor-troco').value;
        if (!valorDinheiroInput) {
            alert('Por favor, informe o valor em dinheiro para o troco!');
            return;
        }
        const valorDinheiro = parseFloat(valorDinheiroInput);
        if (valorDinheiro < totalCarrinho) {
            alert('O valor em dinheiro não pode ser menor que o total do pedido!');
            return;
        }
        const trocoCalculado = valorDinheiro - totalCarrinho;
        informacaoPagamento = `Dinheiro (Vai pagar com R$ ${valorDinheiro.toFixed(2)} | Troco: R$ ${trocoCalculado.toFixed(2)})`;
    } 
    // Se for Cartão
    else if (formaPagamento.includes('Cartão') || formaPagamento.includes('Cartao')) {
        informacaoPagamento = `Cartão na Entrega (Maquininha Motoca)`;
    }

    dadosPedidoGlobal = {
        codigo: codigoPedido,
        nome,
        whatsapp,
        endereco,
        referencia,
        bairro,
        taxa,
        formaPagamento: informacaoPagamento || formaPagamento,
        itens: [...carrinho],
        total: totalCarrinho,
        status: 'Aguardando o pedido ficar pronto ⏳'
    };

    // Mudar para a tela de pagamento
    document.getElementById('app-container').classList.add('hidden');
    document.getElementById('pagamento-container').classList.remove('hidden');

    const containerPagamento = document.getElementById('pagamento-container');

    // SE FOR DINHEIRO OU CARTÃO (Vai direto sem gerar Pix)
    if (formaPagamento === 'Dinheiro' || formaPagamento.includes('Cartão') || formaPagamento.includes('Cartao')) {
        containerPagamento.innerHTML = `
            <h2>💳 Pedido Realizado com Sucesso!</h2>
            <p style="font-size: 18px; color: #f1c40f; margin: 20px 0;">Código do Pedido: <b>#${codigoPedido}</b></p>
            <p style="font-size: 16px; color: #fff; margin: 10px 0;">Forma de Pagamento: <b>${informacaoPagamento}</b></p>
            <p>Registrando seu pedido na cozinha...</p>
        `;
        
        tocarSomSucesso();
        await registrarPedidoFinal();
        
        setTimeout(() => {
            document.getElementById('pagamento-container').classList.add('hidden');
            document.getElementById('sucesso-container').classList.remove('hidden');
            document.getElementById('codigo-pedido-exibido').innerText = `Seu Código de Pedido: #${codigoPedido}`;
        }, 1500);
        return;
    }

    // SE FOR PIX (Gera QR Code do Mercado Pago)
    containerPagamento.innerHTML = `
        <h2>💳 Pagamento via Pix</h2>
        <p>Gerando QR Code do Mercado Pago...</p>
    `;

    try {
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
                
                <div class="pix-copia-cola-box" style="background: rgba(0, 0, 0, 0.5); padding: 12px; border-radius: 6px; margin-bottom: 15px; border: 1px solid #d4af37;">
                    <p style="margin: 0 0 8px 0; font-size: 14px; color: #f1c40f; font-weight: bold;">Pix Copia e Cola:</p>
                    <input type="text" id="texto-pix-copia" value="${resultado.qr_code}" readonly style="font-size: 12px; text-align: center; margin-bottom: 5px; width: 100%; padding: 8px; border-radius: 4px; border: 1px solid #ccc;">
                    <button onclick="copiarCodigoPix()" class="btn-copiar-pix" style="background-color: #27ae60; color: white; border: none; padding: 6px 14px; font-size: 13px; font-weight: bold; border-radius: 4px; cursor: pointer; margin-top: 5px;">📋 Copiar Código Pix</button>
                </div>

                <p style="font-size: 16px; color: #f1c40f;">Código do Pedido: <b>#${codigoPedido}</b></p>
                <p id="status-pagamento-pix" style="font-weight: bold; color: #f1c40f; margin-top: 15px;">
                    ⏳ Aguardando a aprovação do pagamento...
                </p>
            `;

            iniciarVerificacaoPagamentoMP(resultado.id_pagamento, codigoPedido);
        } else {
            containerPagamento.innerHTML = `<h2 style="color:red;">Erro ao gerar Pix. Tente novamente.</h2>`;
        }
    } catch (e) {
        containerPagamento.innerHTML = `<h2 style="color:red;">Erro de conexão com o servidor.</h2>`;
    }
}

function copiarCodigoPix() {
    const inputPix = document.getElementById('texto-pix-copia');
    inputPix.select();
    inputPix.setSelectionRange(0, 99999); 
    
    navigator.clipboard.writeText(inputPix.value).then(() => {
        alert('Código Pix copiado com sucesso!');
    }).catch(err => {
        console.error('Erro ao copiar o código Pix: ', err);
    });
}

function tocarSomSucesso() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        
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

function iniciarVerificacaoPagamentoMP(idPagamento, codigoPedido) {
    intervaloVerificacao = setInterval(async () => {
        try {
            const res = await fetch(`/api/verificar-pagamento/${idPagamento}`);
            const dados = await res.json();

            if (dados.status === "approved") {
                clearInterval(intervaloVerificacao);
                tocarSomSucesso();
                await registrarPedidoFinal();

                document.getElementById('pagamento-container').classList.add('hidden');
                document.getElementById('sucesso-container').classList.remove('hidden');
                document.getElementById('codigo-pedido-exibido').innerText = `Seu Código de Pedido: #${codigoPedido}`;
            }
        } catch (e) {
            console.log("Aguardando confirmação...");
        }
    }, 4000);
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
            const meuPedido = pedidos.find(p => p.id === idPedido || p.codigo === dadosPedidoGlobal.codigo);
            if (meuPedido) {
                const textoStatus = document.getElementById('status-pedido-texto');
                if (textoStatus) textoStatus.innerText = meuPedido.status;
            }
        } catch(e) {}
    }, 3000);
}

// Sincronizar esgotados do cardápio visualmente na página principal ao carregar
async function verificarCardapioEsgotado() {
    try {
        const res = await fetch('/api/cardapio');
        const itens = await res.json();
        
        itens.forEach(item => {
            // Se você tiver elementos mapeados por ID na página
            const elementoItem = document.getElementById(item.id);
            if (elementoItem && item.esgotado) {
                elementoItem.classList.add('esgotado');
                const btn = elementoItem.querySelector('button');
                if (btn) {
                    btn.disabled = true;
                    btn.innerText = 'ESGOTADO';
                    btn.style.background = '#555';
                }
            }
        });
    } catch (e) {
        console.error("Erro ao verificar itens esgotados", e);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    verificarCardapioEsgotado();
    setInterval(verificarCardapioEsgotado, 5000);
});