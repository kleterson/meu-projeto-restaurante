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
        total: carrinho.reduce((acc, item) => acc + item.preco, 0),
        tokenMP: "APP_USR-517824253559090-073117-47dad5ef4352fb0abd9e5d717275dfa3-71867761"
    };

    // Ir para tela de pagamento Pix
    document.getElementById('app-container').classList.add('hidden');
    document.getElementById('pagamento-container').classList.remove('hidden');
}

// Função para tocar o som "tum tum" de confirmação de pagamento
function tocarSomSucesso() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        
        // Primeiro tom ("tum")
        const osc1 = audioCtx.createOscillator();
        const gain1 = audioCtx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(440, audioCtx.currentTime); // Nota Lá
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
            osc2.frequency.setValueAtTime(587.33, audioCtx.currentTime); // Nota Ré mais aguda
            gain2.gain.setValueAtTime(0.3, audioCtx.currentTime);
            gain2.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
            osc2.connect(gain2);
            gain2.connect(audioCtx.destination);
            osc2.start();
            osc2.stop(audioCtx.currentTime + 0.2);
        }, 150);
    } catch (e) {
        console.log("Áudio bloqueado pelo navegador até haver interação do usuário.");
    }
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
            // Toca o som "tum tum" automaticamente ao aprovar
            tocarSomSucesso();

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