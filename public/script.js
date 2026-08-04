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
    const formaPagamento = document.getElementById('forma-pagamento').value;
    let informacaoPagamento = "";

    if (!nome || !endereco || !bairro) {
        alert('Por favor, preencha nome, endereço e bairro!');
        return;
    }

    const totalCarrinho = carrinho.reduce((acc, item) => acc + item.preco, 0);

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
    // Se for Cartão (Faz o mesmo caminho do dinheiro, direto para a cozinha/motoboy)
    else if (formaPagamento === 'Cartão (Na Entrega)') {
        informacaoPagamento = `Cartão na Entrega (Maquininha Motoca)`;
    }

    dadosPedidoGlobal = {
        nome,
        endereco,
        bairro,
        formaPagamento: informacaoPagamento || formaPagamento,
        itens: [...carrinho],
        total: totalCarrinho
    };

    // Mudar para a tela de pagamento
    document.getElementById('app-container').classList.add('hidden');
    document.getElementById('pagamento-container').classList.remove('hidden');

    const containerPagamento = document.getElementById('pagamento-container');

    // SE FOR DINHEIRO OU CARTÃO (Vai direto para o sistema sem abrir QR Code Pix)
    if (formaPagamento === 'Dinheiro' || formaPagamento === 'Cartão (Na Entrega)') {
        containerPagamento.innerHTML = `
            <h2>💳 Pedido Realizado com Sucesso!</h2>
            <p style="font-size: 18px; color: #f1c40f; margin: 20px 0;">Forma de Pagamento: <b>${informacaoPagamento}</b></p>
            <p>Registrando seu pedido na cozinha...</p>
        `;
        
        tocarSomSucesso();
        await registrarPedidoFinal();
        
        setTimeout(() => {
            document.getElementById('pagamento-container').classList.add('hidden');
            document.getElementById('sucesso-container').classList.remove('hidden');
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

                <p id="status-pagamento-pix" style="font-weight: bold; color: #f1c40f; margin-top: 15px;">
                    ⏳ Aguardando a aprovação do pagamento...
                </p>
            `;

            iniciarVerificacaoPagamentoMP(resultado.id_pagamento);
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

function iniciarVerificacaoPagamentoMP(idPagamento) {
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
            const meuPedido = pedidos.find(p => p.id === idPedido);
            if (meuPedido) {
                const textoStatus = document.getElementById('status-pedido-texto');
                textoStatus.innerText = meuPedido.status;
            }
        } catch(e) {}
    }, 3000);
}