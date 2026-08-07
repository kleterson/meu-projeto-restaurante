let carrinho = [];
let dadosPedidoGlobal = {};
let intervaloVerificacao = null;

// --- LÓGICA DE CARRINHO ---

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
        lista.innerHTML += `<li>${item.nome} - R$ ${item.preco.toFixed(2)} <button onclick="removerItem(${index})" style="background:#dc3545; padding:2px 6px; font-size:10px; border:none; color:white; border-radius:3px;">X</button></li>`;
    });

    if (subtotalEl) subtotalEl.innerText = subtotal.toFixed(2);
    
    const selectBairro = document.getElementById('cliente-bairro');
    let taxa = 0;
    if (selectBairro && selectBairro.selectedIndex > 0) {
        taxa = parseFloat(selectBairro.options[selectBairro.selectedIndex].getAttribute('data-taxa')) || 0;
    }
    if (taxaEl) taxaEl.innerText = taxa.toFixed(2);

    let totalGeral = subtotal + taxa;
    totalEl.innerText = totalGeral.toFixed(2);
}

function removerItem(index) {
    carrinho.splice(index, 1);
    atualizarCarrinho();
}

// --- LÓGICA DE CARREGAMENTO DINÂMICO E DIVISÃO POR GRUPOS ---

async function carregarCardapioDinamico() {
    const path = window.location.pathname;
    let tipoPagina = 'almoco'; // Padrão
    if (path.includes('lanches')) tipoPagina = 'lanches';
    if (path.includes('bebidas')) tipoPagina = 'bebidas';

    try {
        const res = await fetch('/api/cardapio');
        const todosItens = await res.json();
        const itensFiltrados = todosItens.filter(item => item.tipo === tipoPagina);
        
        const container = document.getElementById('lista-produtos');
        const titulo = document.getElementById('titulo-categoria');
        
        if (titulo) {
            if (tipoPagina === 'lanches') titulo.innerText = '🍔 Lanches Especiais';
            else if (tipoPagina === 'bebidas') titulo.innerText = '🥤 Bebidas e Sucos';
            else titulo.innerText = '🍲 Pratos e Marmitas';
        }
        
        if (!container) return;
        container.innerHTML = '';

        if (itensFiltrados.length === 0) {
            container.innerHTML = '<p style="color: #aaa; text-align: center; padding: 20px;">Nenhum item cadastrado nesta categoria no momento.</p>';
            return;
        }

        // Recupera os grupos do adm
        let gruposSalvos = JSON.parse(localStorage.getItem('grupos_cardapio')) || {};
        let listaGrupos = gruposSalvos[tipoPagina] || [];
        listaGrupos.sort((a, b) => a.ordem - b.ordem);

        // Se não houver grupos salvos para essa página, cria automaticamente com base nas categorias dos itens
        if (listaGrupos.length === 0) {
            const categoriasUnicas = [...new Set(itensFiltrados.map(i => i.categoria || 'Geral'))];
            listaGrupos = categoriasUnicas.map((cat, idx) => ({ nome: cat, ordem: idx + 1 }));
        }

        let itensExibidosIds = new Set();

        // Renderiza os grupos configurados
        listaGrupos.forEach(grupo => {
            const itensDoGrupo = itensFiltrados.filter(i => (i.categoria || 'Geral').trim().toLowerCase() === grupo.nome.trim().toLowerCase());
            
            if (itensDoGrupo.length === 0) return;

            const secaoDiv = document.createElement('div');
            secaoDiv.style.marginBottom = "25px";

            const isDestaque = grupo.ordem === 1 || grupo.nome.toLowerCase().includes('prato do dia');

            secaoDiv.innerHTML = `
                <h3 style="color: ${isDestaque ? '#f1c40f' : '#2ecc71'}; border-bottom: 2px solid ${isDestaque ? '#f1c40f' : '#444'}; padding-bottom: 5px; margin-bottom: 12px; font-size: ${isDestaque ? '20px' : '17px'};">
                    ${isDestaque ? '⭐ ' : ''}${grupo.nome}
                </h3>
            `;

            const itensContainer = document.createElement('div');
            itensContainer.style.display = "flex";
            itensContainer.style.flexDirection = "column";
            itensContainer.style.gap = "10px";

            itensDoGrupo.forEach(item => {
                itensExibidosIds.add(item.id);
                const div = document.createElement('div');
                div.className = 'item';
                div.id = item.id;
                
                if (isDestaque) {
                    div.style.border = "2px solid #f1c40f";
                    div.style.background = "rgba(241, 196, 15, 0.08)";
                }

                let htmlAcompanhamento = '';
                if (item.acompanhamento && item.acompanhamento.trim() !== '') {
                    htmlAcompanhamento = `<div style="font-size: 13px; color: #3498db; margin-top: 4px;">${item.acompanhamento}</div>`;
                }

                div.innerHTML = `
                    <div style="flex-grow: 1;">
                        <span style="font-weight: bold; color: #fff; font-size: 16px;">${item.nome}</span>
                        <p style="color: #f1c40f; margin: 4px 0; font-size: 15px;">R$ ${item.preco.toFixed(2)}</p>
                        ${htmlAcompanhamento}
                    </div>
                    <button onclick="adicionarAoCarrinho('${item.nome.replace(/'/g, "\\'")}', ${item.preco}, '${item.id}')" 
                        style="background: #27ae60; color: white; border: none; padding: 8px 12px; border-radius: 5px; cursor: pointer; font-weight: bold;"
                        ${item.esgotado ? 'disabled' : ''}>
                        ${item.esgotado ? 'ESGOTADO' : 'Adicionar'}
                    </button>
                `;
                itensContainer.appendChild(div);
            });

            secaoDiv.appendChild(itensContainer);
            container.appendChild(secaoDiv);
        });

        // Garante que nenhum item fique de fora caso a categoria não batesse exatamente
        const itensRestantes = itensFiltrados.filter(i => !itensExibidosIds.has(i.id));
        if (itensRestantes.length > 0) {
            const secaoOutros = document.createElement('div');
            secaoOutros.style.marginBottom = "25px";
            secaoOutros.innerHTML = `<h3 style="color: #2ecc71; border-bottom: 2px solid #444; padding-bottom: 5px; margin-bottom: 12px; font-size: 17px;">Outros Itens</h3>`;
            
            const itensContainer = document.createElement('div');
            itensContainer.style.display = "flex";
            itensContainer.style.flexDirection = "column";
            itensContainer.style.gap = "10px";

            itensRestantes.forEach(item => {
                const div = document.createElement('div');
                div.className = 'item';
                div.id = item.id;
                div.innerHTML = `
                    <div style="flex-grow: 1;">
                        <span style="font-weight: bold; color: #fff; font-size: 16px;">${item.nome}</span>
                        <p style="color: #f1c40f; margin: 4px 0; font-size: 15px;">R$ ${item.preco.toFixed(2)}</p>
                    </div>
                    <button onclick="adicionarAoCarrinho('${item.nome.replace(/'/g, "\\'")}', ${item.preco}, '${item.id}')" 
                        style="background: #27ae60; color: white; border: none; padding: 8px 12px; border-radius: 5px; cursor: pointer; font-weight: bold;"
                        ${item.esgotado ? 'disabled' : ''}>
                        ${item.esgotado ? 'ESGOTADO' : 'Adicionar'}
                    </button>
                `;
                itensContainer.appendChild(div);
            });
            secaoOutros.appendChild(itensContainer);
            container.appendChild(secaoOutros);
        }

        verificarCardapioEsgotado();
    } catch (e) { console.error("Erro ao carregar cardápio:", e); }
}

// --- LÓGICA DE CHECKOUT E PAGAMENTO ---

async function finalizarCompra() {
    if (carrinho.length === 0) { alert('Seu carrinho está vazio!'); return; }
    
    const nome = document.getElementById('cliente-nome')?.value;
    const whatsapp = document.getElementById('cliente-whatsapp')?.value;
    const endereco = document.getElementById('cliente-endereco')?.value;
    const bairroSelect = document.getElementById('cliente-bairro');
    const formaPagamento = document.getElementById('forma-pagamento')?.value;
    
    if (!nome || !whatsapp || !endereco || !bairroSelect.value) {
        alert('Por favor, preencha todos os dados de entrega!');
        return;
    }

    const taxa = parseFloat(bairroSelect.options[bairroSelect.selectedIndex].getAttribute('data-taxa')) || 0;
    const totalCarrinho = carrinho.reduce((acc, item) => acc + item.preco, 0) + taxa;
    const codigoPedido = Math.floor(1000 + Math.random() * 9000);

    let informacaoPagamento = formaPagamento;
    if (formaPagamento === 'Dinheiro') {
        const trocoVal = document.getElementById('valor-troco').value;
        if (!trocoVal) { alert('Informe o valor para troco!'); return; }
        informacaoPagamento = `Dinheiro (Troco para R$ ${parseFloat(trocoVal).toFixed(2)})`;
    }

    dadosPedidoGlobal = { codigo: codigoPedido, nome, whatsapp, endereco, bairro: bairroSelect.value, taxa, formaPagamento: informacaoPagamento, itens: [...carrinho], total: totalCarrinho };

    document.getElementById('app-container').classList.add('hidden');
    document.getElementById('pagamento-container').classList.remove('hidden');

    if (formaPagamento !== 'Pix') {
        await registrarPedidoFinal();
        setTimeout(() => {
            document.getElementById('pagamento-container').classList.add('hidden');
            document.getElementById('sucesso-container').classList.remove('hidden');
            document.getElementById('codigo-pedido-exibido').innerText = `Código: #${codigoPedido}`;
        }, 1500);
    } else {
        const res = await fetch('/api/criar-pagamento', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dadosPedidoGlobal) });
        const resJson = await res.json();
        
        if(resJson.qr_code) {
            document.getElementById('qr-code-input').value = resJson.qr_code;
            document.getElementById('qr-code-img').src = `data:image/jpeg;base64,${resJson.qr_code_base64}`;
        }
        iniciarVerificacaoPagamentoMP(resJson.id_pagamento, codigoPedido);
    }
}

// --- FUNÇÃO DE VERIFICAÇÃO DE PIX E MERCADO PAGO ---

function iniciarVerificacaoPagamentoMP(idPagamento, codigoPedido) {
    if (intervaloVerificacao) clearInterval(intervaloVerificacao);

    intervaloVerificacao = setInterval(async () => {
        try {
            const res = await fetch(`/api/verificar-pagamento/${idPagamento}`);
            const data = await res.json();

            if (data.status === 'approved') {
                clearInterval(intervaloVerificacao);
                await registrarPedidoFinal();
                document.getElementById('pagamento-container').classList.add('hidden');
                document.getElementById('sucesso-container').classList.remove('hidden');
                document.getElementById('codigo-pedido-exibido').innerText = `Código: #${codigoPedido}`;
            }
        } catch (e) {
            console.error("Erro ao verificar pagamento:", e);
        }
    }, 4000);
}

// --- UTILITÁRIOS E STATUS ---

async function registrarPedidoFinal() {
    try {
        await fetch('/api/pedidos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dadosPedidoGlobal) });
    } catch (e) {}
}

async function verificarCardapioEsgotado() {
    try {
        const res = await fetch('/api/cardapio');
        const itens = await res.json();
        itens.forEach(item => {
            const el = document.getElementById(item.id);
            if (el && item.esgotado) {
                const btn = el.querySelector('button');
                if (btn) { btn.disabled = true; btn.innerText = 'ESGOTADO'; btn.style.background = '#555'; }
            }
        });
    } catch (e) {}
}

document.addEventListener("DOMContentLoaded", () => {
    carregarCardapioDinamico();
    setInterval(verificarCardapioEsgotado, 5000);
});