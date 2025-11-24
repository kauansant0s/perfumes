// perfumes/script-perfume.js - ATUALIZADO COM SLIDERS E NOVA DESCRIÇÃO
import { auth, db, buscarPerfumePorId, buscarPerfumes } from '../adicionar-perfume/firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, updateDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { toggleLoading } from '../adicionar-perfume/utils.js';
import { verificarAdmin, isAdmin } from '../adicionar-perfume/admin-config.js';

console.log('=== Script perfume carregado ===');

let perfumeData = null;
let usuarioAtual = null;
let perfumesData = [];

// Cores dos acordes
const coresAcordes = {
    'Abaunilhado': '#D4A574', 'Aldeídico': '#E8E8E8', 'Alcoólico': '#C9B8A8',
    'Almiscarado': '#F5E6D3', 'Ambarado': '#FFB347', 'Amadeirado': '#8B4513',
    'Animálico': '#654321', 'Aquático': '#4DD0E1', 'Aromático': '#7CB342',
    'Atalcado': '#E8D5C4', 'Balsâmico': '#8B7355', 'Chipre': '#556B2F', 'Cítrico': '#FFA500',
    'Couro': '#654321', 'Cremoso': '#FFF8DC', 'Doce': '#FFB6C1',
    'Esfumaçado': '#696969', 'Especiado': '#CD853F', 'Floral': '#FF69B4',
    'Floral Amarelo': '#FFD700', 'Floral Branco': '#F5F5F5', 'Fougère': '#2E8B57',
    'Fresco': '#87CEEB', 'Frutado': '#FF6347', 'Gourmand': '#D2691E',
    'Herbal': '#6B8E23', 'Lactônico': '#FFF5EE', 'Metálico': '#B0B0B0', 
    'Resinoso': '#A0522D', 'Terroso': '#8B7355', 'Tropical': '#FF8C00', 'Verde': '#228B22'
};

const urlParams = new URLSearchParams(window.location.search);
const perfumeId = urlParams.get('id');

if (!perfumeId) {
    alert('ID do perfume não encontrado!');
    window.location.href = '../perfil/perfil.html';
}

// Menu
const menuHamburger = document.getElementById('menu-toggle');
const menuLateral = document.getElementById('menu-lateral');
const menuOverlay = document.getElementById('menu-overlay');

if (menuHamburger) {
  menuHamburger.addEventListener('click', () => {
    menuHamburger.classList.toggle('aberto');
    menuLateral.classList.toggle('aberto');
    menuOverlay.classList.toggle('ativo');
  });
}

if (menuOverlay) {
  menuOverlay.addEventListener('click', () => {
    menuHamburger.classList.remove('aberto');
    menuLateral.classList.remove('aberto');
    menuOverlay.classList.remove('ativo');
  });
}

onAuthStateChanged(auth, async (user) => {
    if (user) {
        usuarioAtual = user;
        
        // ✅ Verifica se é admin
        await verificarAdmin(user);
        
        await carregarPerfume();
        configurarMenu(user);
        
        // ✅ Mostra botão editar APENAS para admin
        const btnEditar = document.getElementById('btn-editar');
        if (btnEditar) {
            if (isAdmin()) {
                btnEditar.style.display = 'flex';
                console.log('✅ Botão editar habilitado (admin)');
            } else {
                btnEditar.style.display = 'none';
                console.log('🔒 Botão editar oculto (não admin)');
            }
        }
        
        // Carrega perfumes para pesquisa
        await carregarPerfumesParaPesquisa();
    } else {
        window.location.href = '../login/login.html';
    }
});

function configurarMenu(user) {
    const menuFoto = document.getElementById('menu-foto');
    const menuNome = document.getElementById('menu-nome');
    
    if (menuFoto && menuNome) {
      if (user.photoURL) {
          menuFoto.src = user.photoURL;
      } else {
          menuFoto.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><circle fill="%23d9d9d9" cx="40" cy="40" r="40"/></svg>';
      }
      
      menuNome.textContent = user.displayName || 'Usuário';
    }
    
    const btnLogout = document.getElementById('menu-logout');
    if (btnLogout) {
      btnLogout.addEventListener('click', async (e) => {
          e.preventDefault();
          if (confirm('Deseja realmente sair?')) {
              await signOut(auth);
              window.location.href = '../login/login.html';
          }
      });
    }
}

// Carrega todos os perfumes para pesquisa
async function carregarPerfumesParaPesquisa() {
    try {
        perfumesData = await buscarPerfumes(usuarioAtual.uid, true);
        console.log(`✅ ${perfumesData.length} perfumes carregados para pesquisa`);
    } catch (error) {
        console.error('Erro ao carregar perfumes:', error);
    }
}

async function carregarPerfume() {
    try {
        console.log('Carregando perfume:', perfumeId);
        
        const perfumeRef = doc(db, "perfumes", perfumeId);
        const perfumeSnap = await getDoc(perfumeRef);
        
        if (!perfumeSnap.exists()) {
            alert('Perfume não encontrado!');
            window.location.href = '../perfil/perfil.html';
            return;
        }
        
        perfumeData = perfumeSnap.data();
        console.log('Perfume carregado:', perfumeData);
        
        await renderizarPerfume();
        
    } catch (error) {
        console.error('Erro ao carregar perfume:', error);
        alert('Erro ao carregar perfume!');
    }
}

async function renderizarPerfume() {
    // Foto
    const fotoElement = document.getElementById('foto-perfume');
    if (perfumeData.fotoURL) {
        fotoElement.src = perfumeData.fotoURL;
        fotoElement.alt = perfumeData.nome;
    }
    
    
    // Nome e Marca com símbolo de gênero
    const nomePerfumeElement = document.getElementById('nome-perfume');
    nomePerfumeElement.textContent = perfumeData.nome;
    
    // ✅ Adiciona símbolo de gênero COLORIDO se existir
    if (perfumeData.caracteristicas && perfumeData.caracteristicas.genero) {
      const genero = perfumeData.caracteristicas.genero;
      let simbolo = '';
      let classeGenero = '';
      
      if (genero === 'masculino' || genero === 'um-pouco-masculino') {
        simbolo = '♂';
        classeGenero = 'masculino';
      } else if (genero === 'feminino' || genero === 'um-pouco-feminino') {
        simbolo = '♀';
        classeGenero = 'feminino';
      } else if (genero === 'compartilhavel') {
        simbolo = '⚥';
        classeGenero = 'unissex';
      }
      
      if (simbolo) {
        const spanSimbolo = document.createElement('span');
        spanSimbolo.className = `simbolo-genero ${classeGenero}`;
        spanSimbolo.textContent = simbolo;
        nomePerfumeElement.appendChild(spanSimbolo);
      }
    }
    
    const linkMarca = document.getElementById('link-marca');
    linkMarca.textContent = perfumeData.marca;
    linkMarca.href = `../marca/marca.html?nome=${encodeURIComponent(perfumeData.marca)}`;
    linkMarca.style.textDecoration = 'none';
    linkMarca.addEventListener('mouseenter', () => {
        linkMarca.style.textDecoration = 'underline';
    });
    linkMarca.addEventListener('mouseleave', () => {
        linkMarca.style.textDecoration = 'none';
    });
    
    // ✅ Nova descrição
    await gerarDescricao();
    
    renderizarAcordes();
    renderizarNotas();
    
    // ✅ Mostra avaliações se tiver (independente do status)
    if (perfumeData.avaliacoes) {
        renderizarAvaliacoes();
    }
    
    // Status
    if (perfumeData.status) {
        const statusInput = document.querySelector(`input[value="${perfumeData.status}"]`);
        if (statusInput) {
            statusInput.checked = true;
        }
    }
    
    // ✅ NOVO: Link de compra (botão carrinho)
    if (perfumeData.linkCompra && perfumeData.linkCompra.trim() !== '') {
        const btnCarrinho = document.getElementById('btn-carrinho');
        if (btnCarrinho) {
            btnCarrinho.href = perfumeData.linkCompra;
            btnCarrinho.style.display = 'flex';
            console.log('🛒 Botão carrinho habilitado:', perfumeData.linkCompra);
        }
    }
    
    renderizarReview();
}

// ✅ NOVA FUNÇÃO: Gerar descrição completa
async function gerarDescricao() {
    let descricao = `A fragrância ${perfumeData.nome} de ${perfumeData.marca} é um cheiro `;
    
    const partes = [];
    
    // Gênero
    if (perfumeData.caracteristicas?.genero) {
        const generoTexto = obterTextoGenero(perfumeData.caracteristicas.genero);
        partes.push(generoTexto);
    }
    
    // Hora
    if (perfumeData.caracteristicas?.hora !== undefined) {
        const horaTexto = obterTextoHora(perfumeData.caracteristicas.hora);
        partes.push(horaTexto);
    }
    
    // Junta gênero e hora com vírgula
    if (partes.length > 0) {
        descricao += partes.join(', ') + ', ';
    }
    
    // Acordes
    descricao += 'majoritariamente ';
    if (perfumeData.acordes && perfumeData.acordes.length > 0) {
        const primeirosAcordes = perfumeData.acordes.slice(0, 2);
        if (primeirosAcordes.length === 1) {
            descricao += primeirosAcordes[0].toLowerCase();
        } else {
            descricao += `${primeirosAcordes[0].toLowerCase()} e ${primeirosAcordes[1].toLowerCase()}`;
        }
    }
    descricao += '. ';
    
    // Ambiente e Temperatura
    const partesUso = [];
    
    if (perfumeData.caracteristicas?.ambiente !== undefined) {
        const ambienteTexto = obterTextoAmbiente(perfumeData.caracteristicas.ambiente);
        partesUso.push(`ambientes ${ambienteTexto}`);
    }
    
    if (perfumeData.caracteristicas?.clima !== undefined) {
        const climaTexto = obterTextoClima(perfumeData.caracteristicas.clima);
        partesUso.push(`temperaturas ${climaTexto}`);
    }
    
    if (partesUso.length > 0) {
        descricao += 'Geralmente sendo usado em ' + partesUso.join(' e em ') + '. ';
    }
    
    // Longevidade e Projeção
    if (perfumeData.avaliacoes) {
        const fixacao = perfumeData.avaliacoes.fixacao || 0;
        const projecao = perfumeData.avaliacoes.projecao || 0;
        
        if (fixacao > 0 || projecao > 0) {
            const longevidade = classificarNota(fixacao);
            const projecaoClass = classificarNota(projecao);
            
            if (fixacao > 0 && projecao > 0) {
                if (longevidade === projecaoClass) {
                    // Ajusta plural para mediana e alta
                    const textoPlural = (longevidade === 'mediana' || longevidade === 'alta') 
                        ? longevidade + 's' 
                        : longevidade;
                    descricao += `Com longevidade e projeção ${textoPlural}. `;
                } else {
                    descricao += `Com longevidade ${longevidade} e projeção ${projecaoClass}. `;
                }
            } else if (fixacao > 0) {
                descricao += `Com longevidade ${longevidade}. `;
            } else if (projecao > 0) {
                descricao += `Com projeção ${projecaoClass}. `;
            }
        }
    }
    
    // Perfumista
    if (perfumeData.perfumista && perfumeData.perfumista.trim() !== '') {
        descricao += `Assinado por ${perfumeData.perfumista}. `;
    }
    
    // Contratipo
    if (perfumeData.contratipo && perfumeData.contratipo.eh && perfumeData.contratipo.perfumeOriginal) {
        const perfumeOriginalId = perfumeData.contratipo.perfumeOriginal;
        
        try {
            const perfumeOriginal = await buscarPerfumePorId(perfumeOriginalId);
            
            if (perfumeOriginal) {
                const descricaoElement = document.getElementById('descricao-perfume');
                
                const linkPerfume = `<a href="../perfumes/perfume.html?id=${perfumeOriginalId}" style="color: #C06060; text-decoration: none; font-weight: 600; cursor: pointer;" onmouseenter="this.style.textDecoration='underline'" onmouseleave="this.style.textDecoration='none'">${perfumeOriginal.nome}</a>`;
                
                const linkMarca = `<a href="../marca/marca.html?nome=${encodeURIComponent(perfumeOriginal.marca)}" style="color: #C06060; text-decoration: none; font-weight: 600; cursor: pointer;" onmouseenter="this.style.textDecoration='underline'" onmouseleave="this.style.textDecoration='none'">${perfumeOriginal.marca}</a>`;
                
                descricaoElement.innerHTML = descricao + `É um cheiro inspirado em fragrâncias como ${linkPerfume} de ${linkMarca}.`;
                return;
            }
        } catch (error) {
            console.error('Erro ao buscar perfume original:', error);
        }
    }
    
    document.getElementById('descricao-perfume').textContent = descricao;
}

// ✅ Funções de conversão de valores para texto
function obterTextoGenero(genero) {
    const textos = {
        'masculino': 'masculino',
        'um-pouco-masculino': 'um pouco mais masculino',
        'compartilhavel': 'compartilhável',
        'um-pouco-feminino': 'um pouco mais feminino',
        'feminino': 'feminino'
    };
    return textos[genero] || '';
}

function obterTextoHora(hora) {
    const textos = {
        '0': 'noturno',
        '25': 'um pouco mais noturno',
        '50': 'para qualquer hora do dia',
        '75': 'um pouco mais diurno',
        '100': 'diurno'
    };
    return textos[hora] || '';
}

function obterTextoAmbiente(ambiente) {
    const textos = {
        '0': 'informais',
        '25': 'um pouco mais informais',
        '50': 'formais e informais',
        '75': 'um pouco mais formais',
        '100': 'formais'
    };
    return textos[ambiente] || '';
}

function obterTextoClima(clima) {
    const textos = {
        '0': 'frias',
        '25': 'levemente mais frias',
        '50': 'quentes e frias',
        '75': 'levemente mais quentes',
        '100': 'quentes'
    };
    return textos[clima] || '';
}

function classificarNota(nota) {
    if (nota === 0) return 'não avaliada';
    if (nota >= 5) return 'altíssima';
    if (nota >= 4) return 'alta';
    if (nota >= 3.5) return 'acima da média';
    if (nota >= 2.5) return 'mediana';
    if (nota >= 2) return 'baixa';
    return 'baixíssima';
}

function renderizarAcordes() {
    const acordesLista = document.getElementById('acordes-lista');
    acordesLista.innerHTML = '';
    
    if (perfumeData.acordes && perfumeData.acordes.length > 0) {
        perfumeData.acordes.forEach(acorde => {
            const tag = document.createElement('span');
            tag.className = 'acorde-tag';
            tag.textContent = acorde;
            tag.style.backgroundColor = coresAcordes[acorde] || '#999';
            
            const cor = coresAcordes[acorde] || '#999';
            if (corClara(cor)) {
                tag.style.color = '#333';
            }
            
            acordesLista.appendChild(tag);
        });
    } else {
        acordesLista.innerHTML = '<span class="sem-info">Acordes não informados</span>';
    }
}

function corClara(cor) {
    const rgb = parseInt(cor.slice(1), 16);
    const r = (rgb >> 16) & 0xff;
    const g = (rgb >>  8) & 0xff;
    const b = (rgb >>  0) & 0xff;
    
    const luminosidade = 0.299 * r + 0.587 * g + 0.114 * b;
    return luminosidade > 186;
}

function renderizarNotas() {
    const topoElement = document.getElementById('notas-topo');
    renderizarListaNotas(topoElement, perfumeData.notas?.topo);
    
    const coracaoElement = document.getElementById('notas-coracao');
    renderizarListaNotas(coracaoElement, perfumeData.notas?.coracao);
    
    const fundoElement = document.getElementById('notas-fundo');
    renderizarListaNotas(fundoElement, perfumeData.notas?.fundo);
}

function renderizarListaNotas(elemento, notas) {
    elemento.innerHTML = '';
    
    if (notas && notas.length > 0) {
        notas.forEach(nota => {
            const tag = document.createElement('span');
            tag.className = 'nota-tag';
            tag.textContent = nota;
            elemento.appendChild(tag);
        });
    } else {
        elemento.innerHTML = '<span class="sem-info">Não informadas</span>';
    }
}

// ✅ Renderiza avaliações com sliders customizados
function renderizarAvaliacoes() {
    const container = document.getElementById('avaliacoes-container');
    container.style.display = 'block';
    
    const media = perfumeData.avaliacoes.media || 0;
    document.querySelector('.nota-media').textContent = media.toFixed(2).replace('.', ',');
    
    const estrelasDisplay = document.querySelector('.estrelas-display');
    estrelasDisplay.innerHTML = '';
    
    const estrelasCompletas = Math.floor(media);
    const temMeia = (media % 1) >= 0.5;
    
    for (let i = 0; i < estrelasCompletas; i++) {
        const estrela = document.createElement('span');
        estrela.className = 'estrela';
        estrela.textContent = '★';
        estrela.style.color = '#FFD700';
        estrelasDisplay.appendChild(estrela);
    }
    
    if (temMeia) {
        const estrela = document.createElement('span');
        estrela.className = 'estrela';
        estrela.textContent = '★';
        estrela.style.color = '#FFD700';
        estrela.style.opacity = '0.5';
        estrelasDisplay.appendChild(estrela);
    }
    
    const estrelasVazias = 5 - Math.ceil(media);
    for (let i = 0; i < estrelasVazias; i++) {
        const estrela = document.createElement('span');
        estrela.className = 'estrela';
        estrela.textContent = '★';
        estrela.style.color = '#ccc';
        estrelasDisplay.appendChild(estrela);
    }
    
    renderizarAvaliacaoDetalhada('cheiro', perfumeData.avaliacoes.cheiro);
    renderizarAvaliacaoDetalhada('projecao', perfumeData.avaliacoes.projecao);
    renderizarAvaliacaoDetalhada('fixacao', perfumeData.avaliacoes.fixacao);
    renderizarAvaliacaoDetalhada('versatilidade', perfumeData.avaliacoes.versatilidade);
    
    const toggleBtn = document.getElementById('toggle-avaliacoes');
    const avaliacoesDetalhadas = document.getElementById('avaliacoes-detalhadas');
    
    toggleBtn.addEventListener('click', () => {
        avaliacoesDetalhadas.classList.toggle('expandido');
    });
    
    // ✅ Renderiza sliders customizados
    if (perfumeData.caracteristicas) {
        if (perfumeData.caracteristicas.genero) {
            mostrarSliderCustomizado('genero', perfumeData.caracteristicas.genero);
        }
        
        if (perfumeData.caracteristicas.clima !== undefined) {
            mostrarSliderCustomizado('clima', perfumeData.caracteristicas.clima);
        }
        
        if (perfumeData.caracteristicas.ambiente !== undefined) {
            mostrarSliderCustomizado('ambiente', perfumeData.caracteristicas.ambiente);
        }
        
        if (perfumeData.caracteristicas.hora !== undefined) {
            mostrarSliderCustomizado('hora', perfumeData.caracteristicas.hora);
        }
    }
}

// ✅ Mostra slider customizado com valor selecionado
function mostrarSliderCustomizado(tipo, valor) {
    const container = document.getElementById(`container-${tipo}`);
    if (container) {
        container.style.display = 'block';
        
        const ponto = container.querySelector(`.${tipo}-ponto[data-value="${valor}"]`);
        if (ponto) {
            ponto.classList.add('ativo');
        }
    }
}

function renderizarAvaliacaoDetalhada(tipo, nota) {
    const notaElement = document.getElementById(`nota-${tipo}`);
    const estrelasElement = document.getElementById(`estrelas-${tipo}`);
    
    notaElement.textContent = nota.toFixed(1);
    
    estrelasElement.innerHTML = '';
    const estrelasCompletas = Math.floor(nota);
    const temMeia = (nota % 1) >= 0.5;
    
    for (let i = 0; i < estrelasCompletas; i++) {
        const estrela = document.createElement('span');
        estrela.className = 'mini-estrela';
        estrela.textContent = '★';
        estrelasElement.appendChild(estrela);
    }
    
    if (temMeia) {
        const estrela = document.createElement('span');
        estrela.className = 'mini-estrela';
        estrela.textContent = '★';
        estrela.style.opacity = '0.5';
        estrelasElement.appendChild(estrela);
    }
    
    const estrelasVazias = 5 - Math.ceil(nota);
    for (let i = 0; i < estrelasVazias; i++) {
        const estrela = document.createElement('span');
        estrela.className = 'mini-estrela';
        estrela.textContent = '★';
        estrela.style.color = '#ccc';
        estrelasElement.appendChild(estrela);
    }
}

function renderizarReview() {
    const container = document.getElementById('reviews-container');
    
    if (perfumeData.review && perfumeData.review.texto && perfumeData.review.texto.trim() !== '') {
        // Limpa o container primeiro
        container.innerHTML = '';
        
        // Cria os elementos
        const reviewCard = document.createElement('div');
        reviewCard.className = 'review-card';
        
        const reviewHeader = document.createElement('div');
        reviewHeader.className = 'review-header';
        
        const avatar = document.createElement('img');
        avatar.className = 'review-avatar';
        avatar.alt = 'Foto do usuário';
        avatar.src = usuarioAtual.photoURL || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><circle fill="%23d9d9d9" cx="20" cy="20" r="20"/></svg>';
        
        const autor = document.createElement('span');
        autor.className = 'review-autor';
        autor.textContent = usuarioAtual.displayName || 'Usuário';
        
        const texto = document.createElement('p');
        texto.className = 'review-texto';
        texto.textContent = perfumeData.review.texto;
        
        // Monta a estrutura
        reviewHeader.appendChild(avatar);
        reviewHeader.appendChild(autor);
        reviewCard.appendChild(reviewHeader);
        reviewCard.appendChild(texto);
        container.appendChild(reviewCard);
        
    } else {
        container.innerHTML = '<p class="sem-reviews">Nenhuma review ainda</p>';
    }
}

// ✅ Sistema de troca de status pelos botões
document.querySelectorAll('input[name="status"]').forEach(radio => {
    radio.addEventListener('change', async (e) => {
        if (!perfumeData || !usuarioAtual) return;
        
        const novoStatus = e.target.value;
        const statusAnterior = perfumeData.status || '';
        
        // Se não mudou, ignora
        if (novoStatus === statusAnterior) return;
        
        // Texto amigável
        const textoNovo = novoStatus === 'tenho' ? 'Tenho' :
                         novoStatus === 'ja-tive' ? 'Já tive' :
                         novoStatus === 'quero-ter' ? 'Quero ter' : 'Sem status';
        
        // Confirma mudança
        if (!confirm(`Deseja alterar o status para "${textoNovo}"?`)) {
            // Reverte seleção
            if (statusAnterior) {
                const radioAnterior = document.querySelector(`input[value="${statusAnterior}"]`);
                if (radioAnterior) radioAnterior.checked = true;
            } else {
                document.querySelectorAll('input[name="status"]').forEach(r => r.checked = false);
            }
            return;
        }
        
        // Salva mudança
        try {
            toggleLoading(true);
            
            const perfumeRef = doc(db, "perfumes", perfumeId);
            await updateDoc(perfumeRef, {
                status: novoStatus
            });
            
            perfumeData.status = novoStatus;
            
            console.log('✅ Status atualizado para:', textoNovo);
            alert('✅ Status atualizado com sucesso!');
            
        } catch (error) {
            console.error('❌ Erro ao atualizar status:', error);
            alert('❌ Erro ao atualizar status: ' + error.message);
            
            // Reverte em caso de erro
            if (statusAnterior) {
                const radioAnterior = document.querySelector(`input[value="${statusAnterior}"]`);
                if (radioAnterior) radioAnterior.checked = true;
            }
        } finally {
            toggleLoading(false);
        }
    });
});

document.getElementById('btn-editar')?.addEventListener('click', () => {
    if (perfumeId) {
        window.location.href = `../adicionar-perfume/form-add-perf.html?id=${perfumeId}&editar=true`;
    }
});

// ✅ Sistema de Pesquisa Animada
(function() {
    const btnToggle = document.getElementById('btn-pesquisa-toggle');
    const barraPesquisa = document.getElementById('barra-pesquisa');
    const inputPesquisa = document.getElementById('input-pesquisa-global');
    const resultadosDiv = document.getElementById('resultados-pesquisa');
    const overlay = document.getElementById('pesquisa-overlay');
    
    let pesquisaAberta = false;
    let timeoutPesquisa;
    
    // Toggle pesquisa
    if (btnToggle) {
        btnToggle.addEventListener('click', () => {
            pesquisaAberta = !pesquisaAberta;
            
            if (pesquisaAberta) {
                barraPesquisa.classList.add('expandida');
                overlay.classList.add('ativo');
                setTimeout(() => inputPesquisa.focus(), 400);
            } else {
                fecharPesquisa();
            }
        });
    }
    
    // Fecha pesquisa
    function fecharPesquisa() {
        pesquisaAberta = false;
        barraPesquisa.classList.remove('expandida');
        resultadosDiv.classList.remove('mostrar');
        overlay.classList.remove('ativo');
        inputPesquisa.value = '';
    }
    
    // Overlay fecha pesquisa
    if (overlay) {
        overlay.addEventListener('click', fecharPesquisa);
    }
    
    // ESC fecha pesquisa
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && pesquisaAberta) {
            fecharPesquisa();
        }
    });
    
    // Pesquisa com debounce
    if (inputPesquisa) {
        inputPesquisa.addEventListener('input', (e) => {
            clearTimeout(timeoutPesquisa);
            
            const termo = e.target.value.toLowerCase().trim();
            
            if (!termo) {
                resultadosDiv.classList.remove('mostrar');
                return;
            }
            
            timeoutPesquisa = setTimeout(() => {
                realizarPesquisa(termo);
            }, 300);
        });
    }
    
    // Realiza pesquisa
    async function realizarPesquisa(termo) {
        try {
            // Busca perfumes
            const perfumesFiltrados = perfumesData.filter(p => 
                p.nome.toLowerCase().includes(termo) ||
                p.marca.toLowerCase().includes(termo)
            );
            
            // Busca marcas únicas com logo
            const marcasUnicas = new Map();
            
            // ✅ Primeiro, identifica marcas únicas
            perfumesData.forEach(p => {
                if (p.marca.toLowerCase().includes(termo)) {
                    if (!marcasUnicas.has(p.marca)) {
                        marcasUnicas.set(p.marca, {
                            nome: p.marca,
                            qtd: perfumesData.filter(pf => pf.marca === p.marca).length,
                            logo: null // Será carregado depois
                        });
                    }
                }
            });
            
            const marcasFiltradas = Array.from(marcasUnicas.values());
            
            // ✅ Busca logos das marcas no Firebase
            if (marcasFiltradas.length > 0) {
                try {
                    const { collection, query, where, getDocs } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
                    const { db } = await import('../adicionar-perfume/firebase-config.js');
                    
                    for (const marca of marcasFiltradas) {
                        const q = query(collection(db, "marcas"), where("nome", "==", marca.nome));
                        const querySnapshot = await getDocs(q);
                        
                        if (!querySnapshot.empty) {
                            const marcaData = querySnapshot.docs[0].data();
                            if (marcaData.logo) {
                                marca.logo = marcaData.logo;
                            }
                        }
                    }
                } catch (error) {
                    console.log('⚠️ Erro ao buscar logos:', error);
                }
            }
            
            // Renderiza resultados
            renderizarResultados(perfumesFiltrados, marcasFiltradas, termo);
            
        } catch (error) {
            console.error('Erro ao pesquisar:', error);
        }
    }
    
    // Renderiza resultados
    function renderizarResultados(perfumes, marcas, termo) {
        let html = '';
        
        if (perfumes.length === 0 && marcas.length === 0) {
            html = `<div class="sem-resultados">Nenhum resultado para "<strong>${termo}</strong>"</div>`;
        } else {
            // Perfumes
            if (perfumes.length > 0) {
                html += `
                    <div class="secao-resultado">
                        <h3>Perfumes (${perfumes.length})</h3>
                `;
                
                perfumes.slice(0, 5).forEach(p => {
                    html += `
                        <a href="../perfumes/perfume.html?id=${p.id}" class="item-resultado">
                            <div class="resultado-foto">
                                ${p.fotoURL ? 
                                    `<img src="${p.fotoURL}" alt="${p.nome}">` :
                                    `<div class="resultado-foto-placeholder">${p.nome}</div>`
                                }
                            </div>
                            <div class="resultado-info">
                                <p class="resultado-nome">${p.nome}</p>
                                <p class="resultado-subtitulo">${p.marca}</p>
                            </div>
                        </a>
                    `;
                });
                
                html += `</div>`;
            }
            
            // Marcas
            if (marcas.length > 0) {
                html += `
                    <div class="secao-resultado">
                        <h3>Marcas (${marcas.length})</h3>
                `;
                
                marcas.slice(0, 5).forEach(m => {
                    // ✅ Logo: usa logo do Firebase ou iniciais
                    const logoHtml = m.logo ? 
                        `<img src="${m.logo}" alt="${m.nome}" style="width: 100%; height: 100%; object-fit: contain;">` :
                        `<div class="resultado-foto-placeholder" style="font-size: 16px; font-weight: 700; color: #666;">
                            ${m.nome.substring(0, 2).toUpperCase()}
                        </div>`;
                    
                    html += `
                        <a href="../marca/marca.html?nome=${encodeURIComponent(m.nome)}" 
                           class="item-resultado"
                           onclick="fecharPesquisa()">
                            <div class="resultado-foto" style="background: #fff;">
                                ${logoHtml}
                            </div>
                            <div class="resultado-info">
                                <p class="resultado-nome">${m.nome}</p>
                                <p class="resultado-subtitulo">${m.qtd} ${m.qtd === 1 ? 'perfume' : 'perfumes'}</p>
                            </div>
                        </a>
                    `;
                });
                
                html += `</div>`;
            }
        }
        
        resultadosDiv.innerHTML = html;
        resultadosDiv.classList.add('mostrar');
    }
})();