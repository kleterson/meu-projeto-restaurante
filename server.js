let carrinho = [];
let formaPagamentoSelecionada = '';

function mudarAba(aba) {
    document.getElementById('secao-cardapio').classList.add('hidden');
    document.getElementById('secao-carrinho').classList.add('hidden');
    document.getElementById('secao-status').classList.add('hidden');

    // Remove classe ativa de todas as abas
    const tabs = document.querySelectorAll('.nav-tab');
    tabs.forEach(t => t.classList.remove('active'));

    if (aba === 'cardapio') {
        document.getElementById('secao-cardapio').classList.remove('hidden');
        tabs[0].classList.add('active');
    } else if (aba === 'carrinho') {
        document.getElementById('secao-carrinho').classList.remove('hidden');
        tabs[1].classList.add('active');
    } else if (aba === 'status') {
        document.getElementById('secao-status').classList.remove('hidden');
        tabs[2].classList.add('active');
    }
}

function adicionarAoCarrinho(nome, preco, botaoEl) {
    carrinho.push({ nome, preco });
    atualizarCarrinho();

    if (botaoEl) {
        botaoEl.style.backgroundColor = '#e74c3c';
        botaoEl.innerText = 'Adicionado ✓';
        setTimeout(() => {
            botaoEl.style.backgroundColor = '#27ae60';
            botaoEl.innerText = 'Adicionar';
        }, 1500);
    }
}

function atualizarCarrinho() {
    const lista = document.getElementById('lista-carrinho');
    const totalEl = document.getElementById('total-carrinho');
    const contadorEl = document.getElementById('contador-carrinho');
    
    lista.innerHTML = '';
    let total = 0;

    carrinho.forEach((item, index) => {
        total += item.preco;
        lista.innerHTML += `<li style="margin-bottom: 8px; border-bottom: 1px solid #555; padding-bottom: 4px;">${item.nome} - R$ ${item.preco.toFixed(2)} <button onclick="removerItem(${index})" style="background:#c0392b; padding:2px 6px; font-size:10px; margin-left:10px; border-radius:3px;">X</button></li>`;
    });

    totalEl.innerText = total.toFixed(2);
    contadorEl.innerText = carrinho.length;
}

function removerItem(index) {
    carrinho.splice(index, 1);
    atualizarCarrinho();
}

function selecionarPagamento(tipo) {
    formaPagamentoSelecionada = tipo;

    // Reseta cor de todos os botões de pagamento
    document.getElementById('pag-pix').classList.remove('selecionado');
    document.getElementById('pag-dinheiro').classList.remove('selecionado');
    document.getElementById('pag-cartao').classList.remove('selecionado');

    // Esconde blocos extras
    document.getElementById('bloco-troco').classList.add('hidden');
    document.getElementById('bloco-pix').classList.add('hidden');

    // Ativa o botão correto e mostra a opção correspondente
    if (tipo === 'Pix') {
        document.getElementById('pag-pix').classList.add('selecionado');
        document.getElementById('bloco-pix').classList.remove('hidden');
    } else if (tipo === 'Dinheiro') {
        document.getElementById('pag-dinheiro').classList.add('selecionado');
        document.getElementById('bloco-troco').classList.remove('hidden');
    } else if (tipo === 'Cartão') {
        document.getElementById('pag-cartao').classList.add('selecionado');
    }
}

function calcularTroco() {
    const total = carrinho.reduce((acc, item) => acc + item.preco, 0);
    const valorDado = parseFloat(document.getElementById('valor-troco-cliente').value) || 0;
    const troco = valorDado - total;

    if (troco > 0) {
        document.getElementById('display-troco').innerText = troco.toFixed(2);
    } else {
        document.getElementById('display-troco').innerText = "0.00";
    }
}

async function finalizarCompra() {
    if (carrinho.length === 0) {
        alert('Seu carrinho está vazio!');
        mudarAba('cardapio');
        return;
    }
    const nome = document.getElementById('cliente-nome').value;
    const endereco = document.getElementById('cliente-endereco').value;
    const bairro = document.getElementById('cliente-bairro').value;

    if (!nome || !endereco || !bairro) {
        alert('Por favor, preencha nome, endereço e bairro!');
        return;
    }

    if (!formaPagamentoSelecionada) {
        alert('Por favor, selecione uma forma de pagamento (Pix, Dinheiro ou Cartão)!');
        return;
    }

    let informacaoTroco = "Não precisa";
    let total = carrinho.reduce((acc, item) => acc + item.preco, 0);

    if (formaPagamentoSelecionada === 'Dinheiro') {
        const valorDado = parseFloat(document.getElementById('valor-troco-cliente').value) || 0;
        if (valorDado < total) {
            alert('O valor informado para o dinheiro é menor que o total do pedido!');
            return;
        }
        const trocoCalc = valorDado - total;
        informacaoTroco = `R$ ${trocoCalc.toFixed(2)} (Para R$ ${valorDado.toFixed(2)})`;
    }

    const dadosPedido = {
        nome,
        endereco,
        bairro,
        itens: [...carrinho],
        total,
        pagamento: formaPagamentoSelecionada,
        trocoParaLevar: informacaoTroco
    };

    try {
        const response = await fetch('/api/pedidos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dadosPedido)
        });
        const resultado = await response.json();
        
        if (resultado.success) {
            carrinho = [];
            atualizarCarrinho();
            mudarAba('status');
            verificarStatusPedido(resultado.pedido.id);
        }
    } catch (e) {
        alert('Erro ao registrar pedido no servidor.');
    }
}

async function verificarStatusPedido(idPedido) {
    const intervalo = setInterval(async () => {
        try {
            const res = await fetch('/api/pedidos');
            const pedidos = await res.json();
            const meuPedido = pedidos.find(p => p.id === idPedido);
            if (meuPedido) {
                const textoStatus = document.getElementById('status-pedido-texto');
                textoStatus.innerHTML = `Status: ${meuPedido.status}<br><br><span style="font-size:14px; color:#fff;">Forma de Pagamento: ${meuPedido.pagamento}</span>`;
                if(meuPedido.pagamento === 'Dinheiro') {
                    textoStatus.innerHTML += `<br><span style="font-size:14px; color:#2ecc71;">Troco que o motoboy levará: ${meuPedido.trocoParaLevar}</span>`;
                }
            }
        } catch(e) {}
    }, 3000);
}