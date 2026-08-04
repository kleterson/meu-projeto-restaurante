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

function finalizarCompra() {
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

    // Ir para tela de pagamento Pix
    document.getElementById('app-container').classList.add('hidden');
    document.getElementById('pagamento-container').classList.remove('hidden');
}

async function simularPagamentoEfetuado() {
    try {
        const response = await fetch('/api/pedidos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dadosPedidoGlobal)
        });
        const resultado = await response.json();
        
        if (resultado.success) {
            document.getElementById('pagamento-container').classList.add('hidden');
            document.getElementById('sucesso-container').classList.remove('hidden');
            
            // Iniciar checagem de status em tempo real para o cliente
            verificarStatusPedido(resultado.pedido.id);
        }
    } catch (e) {
        alert('Erro ao registrar pedido no servidor.');
    }
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