// --- LÓGICA DE CARRINHO COM LOCALSTORAGE (SALVA ENTRE PÁGINAS) ---

let carrinho = JSON.parse(localStorage.getItem('carrinho_restaurante')) || [];
let dadosPedidoGlobal = {};
let intervaloVerificacao = null;

function salvarCarrinhoNoNavegador() {
    localStorage.setItem('carrinho_restaurante', JSON.stringify(carrinho));
}

function adicionarAoCarrinho(nome, preco, itemId) {
    carrinho.push({ nome, preco, itemId });
    salvarCarrinhoNoNavegador();
    atualizarCarrinho();
}

function atualizarCarrinho() {
    const lista = document.getElementById('lista-carrinho');
    const subtotalEl = document.getElementById('subtotal-carrinho');
    const taxaEl = document.getElementById('taxa-entrega');
    const totalEl = document.getElementById('total-carrinho');
    
    const contadorEl = document.getElementById('contador-carrinho');
    if (contadorEl) {
        contadorEl.innerText = carrinho.length;
    }
    
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
    salvarCarrinhoNoNavegador();
    atualizarCarrinho();
}

// --- LÓGICA DE CARREGAMENTO DINÂMICO E EXIBIÇÃO INTELIGENTE ---

async function carregarCardapioDinamico() {
    const path = window.location.pathname;
    let tipoPagina = 'almoco'; 
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

        let gruposSalvos = JSON.parse(localStorage.getItem('grupos_cardapio')) || {};
        let listaGrupos = gruposSalvos[tipoPagina] || [];
        
        if (listaGrupos.length > 0) {
            listaGrupos.sort((a, b) => a.ordem - b.ordem);
        } else {
            const categoriasUnicas = [...new Set(itensFiltrados.map(i => i.categoria || 'Geral'))];
            listaGrupos = categoriasUnicas.map((cat, idx) => ({ nome: cat, ordem: idx + 1 }));
        }

        let itensExibidosIds = new Set();

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

                // Pega a observação ou acompanhamento cadastrado no ADM e define a letra BRANCA
                const textoObs = item.acompanhamento || item.observacao || '';
                let htmlAcompanhamento = '';
                if (textoObs.trim() !== '') {
                    htmlAcompanhamento = `<div style="font-size: 13px; color: #ffffff; margin-top: 4px;">${textoObs}</div>`;
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

                const textoObs = item.acompanhamento || item.observacao || '';
                let htmlAcompanhamento = '';
                if (textoObs.trim() !== '') {
                    htmlAcompanhamento = `<div style="font-size: 13px; color: #ffffff; margin-top: 4px;">${textoObs}</div>`;
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
    const subtotal = carrinho.reduce((acc, item) => acc + item.preco, 0);
    const totalCarrinho = subtotal + taxa;
    const codigoPedido = Math.floor(1000 + Math.random() * 9000);

    let informacaoPagamento = formaPagamento;
    if (formaPagamento === 'Dinheiro') {
        const trocoVal = document.getElementById('valor-troco').value;
        if (!trocoVal) { alert('Informe o valor para troco!'); return; }
        informacaoPagamento = `Dinheiro (Troco para R$ ${parseFloat(trocoVal).toFixed(2)})`;
    }

    dadosPedidoGlobal = { 
        codigo: codigoPedido, 
        nome, 
        whatsapp, 
        endereco, 
        bairro: bairroSelect.value, 
        taxa, 
        formaPagamento: informacaoPagamento, 
        itens: [...carrinho], 
        total: totalCarrinho,
        status: "⏳ Aguardando preparo na cozinha"
    };

    const appContainer = document.getElementById('app-container');
    const pagamentoContainer = document.getElementById('pagamento-container');
    
    if (appContainer) appContainer.classList.add('hidden');
    if (pagamentoContainer) pagamentoContainer.classList.remove('hidden');

    const concluirEnvioWhatsAppESucesso = () => {
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

        const numeroWhatsAppRestaurante = "5513981515612"; 
        const urlWhatsApp = `https://api.whatsapp.com/send?phone=${numeroWhatsAppRestaurante}&text=${encodeURIComponent(textoWhatsApp)}`;
        
        window.open(urlWhatsApp, '_blank');

        carrinho = [];
        salvarCarrinhoNoNavegador();

        if (pagamentoContainer) pagamentoContainer.classList.add('hidden');
        const sucessoContainer = document.getElementById('sucesso-container');
        if (sucessoContainer) sucessoContainer.classList.remove('hidden');
        
        const codigoExibido = document.getElementById('codigo-pedido-exibido');
        if (codigoExibido) codigoExibido.innerText = `Código: #${codigoPedido}`;
    };

    if (formaPagamento !== 'Pix') {
        await registrarPedidoFinal();
        setTimeout(() => {
            concluirEnvioWhatsAppESucesso();
        }, 1500);
    } else {
        try {
            const res = await fetch('/api/criar-pagamento', { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify(dadosPedidoGlobal) 
            });
            const resJson = await res.json();
            
            if(resJson.qr_code) {
                const qrInput = document.getElementById('qr-code-input');
                const qrImg = document.getElementById('qr-code-img');
                if (qrInput) qrInput.value = resJson.qr_code;
                if (qrImg) qrImg.src = `data:image/jpeg;base64,${resJson.qr_code_base64}`;
            }
            iniciarVerificacaoPagamentoMP(resJson.id_pagamento, codigoPedido, concluirEnvioWhatsAppESucesso);
        } catch(e) {
            console.error("Erro ao gerar pagamento Pix:", e);
        }
    }
}

function iniciarVerificacaoPagamentoMP(idPagamento, codigoPedido, callbackSucesso) {
    if (intervaloVerificacao) clearInterval(intervaloVerificacao);

    intervaloVerificacao = setInterval(async () => {
        try {
            const res = await fetch(`/api/verificar-pagamento/${idPagamento}`);
            const data = await res.json();

            if (data.status === 'approved') {
                clearInterval(intervaloVerificacao);
                await registrarPedidoFinal();
                if (typeof callbackSucesso === 'function') {
                    callbackSucesso();
                }
            }
        } catch (e) {
            console.error("Erro ao verificar pagamento:", e);
        }
    }, 4000);
}

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
    atualizarCarrinho();
    setInterval(verificarCardapioEsgotado, 5000);
});