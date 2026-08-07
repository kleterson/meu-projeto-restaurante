// --- SCRIPT COMPLEMENTAR DE CHECKOUT, WHATSAPP E PAINEL ---

// Função melhorada de finalizar compra que integra Painel Admin e WhatsApp
async function finalizarCompraCompleta() {
    if (typeof carrinho === 'undefined' || carrinho.length === 0) {
        alert('Seu carrinho está vazio!');
        return;
    }
    
    const nome = document.getElementById('cliente-nome')?.value;
    const whatsapp = document.getElementById('cliente-whatsapp')?.value;
    const endereco = document.getElementById('cliente-endereco')?.value;
    const bairroSelect = document.getElementById('cliente-bairro');
    const formaPagamento = document.getElementById('forma-pagamento')?.value;
    
    if (!nome || !whatsapp || !endereco || !bairroSelect || !bairroSelect.value) {
        alert('Por favor, preencha todos os dados de entrega (Nome, WhatsApp, Endereço e Bairro)!');
        return;
    }

    const taxa = parseFloat(bairroSelect.options[bairroSelect.selectedIndex].getAttribute('data-taxa')) || 0;
    const subtotal = carrinho.reduce((acc, item) => acc + item.preco, 0);
    const totalCarrinho = subtotal + taxa;
    const codigoPedido = Math.floor(1000 + Math.random() * 9000);

    let informacaoPagamento = formaPagamento;
    if (formaPagamento === 'Dinheiro') {
        const trocoVal = document.getElementById('valor-troco')?.value;
        if (!trocoVal) { 
            alert('Informe o valor para troco!'); 
            return; 
        }
        informacaoPagamento = `Dinheiro (Troco para R$ ${parseFloat(trocoVal).toFixed(2)})`;
    }

    // Monta o objeto do pedido para enviar ao servidor (Painel do Administrador)
    const dadosPedido = {
        codigo: codigoPedido,
        nome: nome,
        whatsapp: whatsapp,
        endereco: endereco,
        bairro: bairroSelect.value,
        taxa: taxa,
        formaPagamento: informacaoPagamento,
        itens: [...carrinho],
        total: totalCarrinho,
        status: "⏳ Aguardando preparo na cozinha"
    };

    try {
        // 1. Envia o pedido para o servidor para aparecer no Painel do Administrador
        await fetch('/api/pedidos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dadosPedido)
        });
    } catch (e) {
        console.error("Erro ao registrar pedido no painel:", e);
    }

    // 2. Formata a mensagem detalhada para o WhatsApp do estabelecimento
    let mensagemItens = carrinho.map(i => `▪️ ${i.nome} - R$ ${i.preco.toFixed(2)}`).join('\n');
    
    let textoWhatsApp = `*NOVO PEDIDO #${codigoPedido}* 🍔🍲\n\n` +
        `*Cliente:* ${nome}\n` +
        `*WhatsApp:* ${whatsapp}\n` +
        `*Endereço:* ${endereco} (${bairroSelect.value})\n\n` +
        `*Itens do Pedido:*\n${mensagemItens}\n\n` +
        `*Subtotal:* R$ ${subtotal.toFixed(2)}\n` +
        `*Taxa de Entrega:* R$ ${taxa.toFixed(2)}\n` +
        `*TOTAL A PAGAR:* *R$ ${totalCarrinho.toFixed(2)}*\n` +
        `*Forma de Pagamento:* ${informacaoPagamento}`;

    // Substitua abaixo pelo número de WhatsApp do seu restaurante (com DDD e DDI, ex: 5534999999999)
    const numeroWhatsAppRestaurante = "5513920065761"; 
    const urlWhatsApp = `https://api.whatsapp.com/send?phone=${numeroWhatsAppRestaurante}&text=${encodeURIComponent(textoWhatsApp)}`;

    // 3. Limpa o carrinho e redireciona o cliente para o WhatsApp com o pedido pronto
    carrinho = [];
    if (typeof atualizarCarrinho === 'function') atualizarCarrinho();

    // Abre o WhatsApp em nova aba e avisa o cliente
    window.open(urlWhatsApp, '_blank');

    // Exibe tela de sucesso se houver no HTML
    const appContainer = document.getElementById('app-container');
    const sucessoContainer = document.getElementById('sucesso-container');
    if (appContainer) appContainer.classList.add('hidden');
    if (sucessoContainer) {
        sucessoContainer.classList.remove('hidden');
        const codExibido = document.getElementById('codigo-pedido-exibido');
        if (codExibido) codExibido.innerText = `Código do Pedido: #${codigoPedido}`;
    }
}