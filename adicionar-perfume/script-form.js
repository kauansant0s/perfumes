// script-form.js - COMPLETO COM VERIFICAÇÃO DE MARCA NOVA
import { auth, salvarPerfume, uploadFotoPerfume, buscarMarcas, salvarMarca, buscarPerfumes, invalidarCachePerfumes, buscarPerfumePorId, buscarLinhas, salvarLinha } from './firebase-config.js';import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { toggleLoading, tratarErroFirebase } from './utils.js';
import { verificarAdmin, isAdmin } from './admin-config.js';

const db = getFirestore();

let usuarioAtual = null;
let marcasDisponiveis = [];
let perfumeOriginalInstance = null;
let linhasDisponiveis = {};
let contratipoEmCadastro = false;
let perfumeContratipoId = null;

const urlParams = new URLSearchParams(window.location.search);
const perfumeId = urlParams.get('id');
const modoEdicao = urlParams.get('editar') === 'true';

const voltandoDeOriginal = sessionStorage.getItem('cadastrandoPerfumeOriginal');
const perfumeOriginalRecemCadastrado = sessionStorage.getItem('ultimoPerfumeCadastrado');
const dadosContratipoSalvos = sessionStorage.getItem('dadosContratipoTemp');

console.log('Modo edição:', modoEdicao);
console.log('Perfume ID:', perfumeId);
console.log('Voltando de cadastro original:', voltandoDeOriginal);

// Verifica autenticação
onAuthStateChanged(auth, async (user) => {
  if (user) {
    usuarioAtual = user;
    console.log('✅ Usuário logado:', user.email);
    
    // ✅ NOVO: Verifica se é admin
    await verificarAdmin(user);
    
    toggleLoading(true);
    
    try {
      marcasDisponiveis = await buscarMarcas();
      console.log(`✅ ${marcasDisponiveis.length} marcas carregadas`);
      inicializarAutocompleteMarca();

      // Carrega linhas
      linhasDisponiveis = await buscarLinhas();
      console.log('✅ Linhas carregadas:', Object.keys(linhasDisponiveis).length, 'marcas');
      
      await inicializarSelectPerfumeOriginal();
      
      if (voltandoDeOriginal === 'true' && perfumeOriginalRecemCadastrado && dadosContratipoSalvos) {
        console.log('🔄 Restaurando dados do contratipo...');
        await restaurarDadosContratipo(perfumeOriginalRecemCadastrado, dadosContratipoSalvos);
        
        sessionStorage.removeItem('cadastrandoPerfumeOriginal');
        sessionStorage.removeItem('ultimoPerfumeCadastrado');
        sessionStorage.removeItem('dadosContratipoTemp');
        
        console.log('✅ SessionStorage limpo após restauração');
      }
      else if (modoEdicao && perfumeId) {
        console.log('📝 Modo edição - carregando perfume:', perfumeId);
        await carregarPerfumeParaEdicao();
      } else {
        console.log('📝 Modo cadastro novo');
      }
      
    } catch (error) {
      console.error('❌ Erro ao inicializar:', error);
      alert('Erro ao carregar dados: ' + error.message);
    } finally {
      toggleLoading(false);
    }
  } else {
    alert('Você precisa estar logado para cadastrar perfumes!');
    window.location.href = '../login/login.html';
  }
});

const notas = window.dadosNotas.notas;
const ids = ["topo", "coracao", "fundo"];

const acordes = [
  'Abaunilhado', 'Aldeídico', 'Alcoólico', 'Almiscarado', 'Ambarado',
  'Amadeirado', 'Animálico', 'Aquático', 'Aromático', 'Atalcado',
  'Balsâmico', 'Chipre', 'Cítrico', 'Couro', 'Cremoso', 'Doce', 'Esfumaçado',
  'Especiado', 'Floral', 'Floral Amarelo', 'Floral Branco', 'Fougère',
  'Fresco', 'Frutado', 'Gourmand', 'Herbal', 'Lactônico',
  'Metálico', 'Resinoso', 'Terroso', 'Tropical', 'Verde'
];

const acordesSelect = document.getElementById('acordes');
acordes.sort();
acordes.forEach(acorde => {
  const option = document.createElement('option');
  option.value = acorde;
  option.textContent = acorde;
  acordesSelect.appendChild(option);
});

// ✅ CORES DOS ACORDES (necessário para a barra)
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

const acordesInstance = new TomSelect('#acordes', {
  maxItems: 8,
  create: false,
  sortField: { field: "text", direction: "asc" },
  placeholder: "Pesquise e selecione acordes (mín. 2, máx. 8)...",
  plugins: ["remove_button"],
  dropdownParent: 'body',
  onItemAdd: function() {
    this.setTextboxValue('');
    this.refreshOptions();
    atualizarBarraAcordes();
  },
  onItemRemove: function() {
    atualizarBarraAcordes();
  }
});

acordesInstance.wrapper.style.width = '93%';
acordesInstance.wrapper.style.marginBottom = '10px';

let acordesIntensidade = {}; // { 'Acorde': porcentagem }
let dragState = null;

/**
 * Atualiza a barra visual de intensidade dos acordes
 * ✅ SEMPRE VISÍVEL - mostra estado vazio ou com acordes
 */
function atualizarBarraAcordes() {
  const acordesSelecionados = acordesInstance.getValue();
  const container = document.getElementById('acordes-intensidade-container');
  const barra = document.getElementById('acordes-barra');
  
  // ✅ Container SEMPRE visível
  container.style.display = 'block';
  
  // Se não tem acordes, mostra mensagem
  if (acordesSelecionados.length === 0) {
    barra.innerHTML = '<div class="mensagem-vazia">Adicione acordes para configurar as intensidades</div>';
    return;
  }
  
  // Se tem apenas 1 acorde, mostra mensagem
  if (acordesSelecionados.length === 1) {
    barra.innerHTML = '<div class="mensagem-aviso">Adicione pelo menos mais 1 acorde</div>';
    return;
  }
  
  // ✅ Se tem 2+ acordes, mostra barra normal
  
  // Inicializa intensidades iguais se for novo
  acordesSelecionados.forEach(acorde => {
    if (!acordesIntensidade[acorde]) {
      acordesIntensidade[acorde] = 100 / acordesSelecionados.length;
    }
  });
  
  // Remove acordes que não estão mais selecionados
  Object.keys(acordesIntensidade).forEach(acorde => {
    if (!acordesSelecionados.includes(acorde)) {
      delete acordesIntensidade[acorde];
    }
  });
  
  // Normaliza porcentagens para somar 100%
  normalizarIntensidades(acordesSelecionados);
  
  // Renderiza barra
  renderizarBarraAcordes(acordesSelecionados);
}

// Normaliza as intensidades para somarem 100%
function normalizarIntensidades(acordes) {
  // ✅ Arredonda todos os valores primeiro
  acordes.forEach(acorde => {
    acordesIntensidade[acorde] = Math.round(acordesIntensidade[acorde] || 0);
  });
  
  let total = acordes.reduce((sum, acorde) => sum + acordesIntensidade[acorde], 0);
  
  if (total === 0) {
    // ✅ Divide igualmente em INTEIROS
    const porcaoPadrao = Math.floor(100 / acordes.length);
    const resto = 100 - (porcaoPadrao * acordes.length);
    
    acordes.forEach((acorde, index) => {
      // ✅ Distribui o resto no ÚLTIMO acorde
      if (index === acordes.length - 1) {
        acordesIntensidade[acorde] = porcaoPadrao + resto;
      } else {
        acordesIntensidade[acorde] = porcaoPadrao;
      }
    });
  } else if (total !== 100) {
    // ✅ Ajusta para somar exatamente 100
    const diferenca = 100 - total;
    
    // Adiciona/remove a diferença no maior acorde
    let maiorAcorde = acordes[0];
    acordes.forEach(acorde => {
      if (acordesIntensidade[acorde] > acordesIntensidade[maiorAcorde]) {
        maiorAcorde = acorde;
      }
    });
    
    acordesIntensidade[maiorAcorde] += diferenca;
    
    // Garante que nenhum fique abaixo de 5% ou acima de 95%
    acordes.forEach(acorde => {
      acordesIntensidade[acorde] = Math.max(5, Math.min(95, acordesIntensidade[acorde]));
    });
  }
}

// Renderiza a barra visual
function renderizarBarraAcordes(acordes) {
  const barra = document.getElementById('acordes-barra');
  barra.innerHTML = '';
  
  let posicaoAcumulada = 0;
  
  acordes.forEach((acorde, index) => {
    // ✅ Arredonda para inteiro
    const porcentagem = Math.round(acordesIntensidade[acorde]);
    const cor = coresAcordes[acorde] || '#999';
    
    // Cria seção do acorde
    const secao = document.createElement('div');
    secao.className = 'acorde-secao';
    secao.style.width = porcentagem + '%';
    secao.style.backgroundColor = cor;
    secao.dataset.acorde = acorde;
    
    // ✅ NOVO: Container para nome + porcentagem
    const conteudo = document.createElement('div');
    conteudo.className = 'acorde-conteudo';
    
    const nomeSpan = document.createElement('span');
    nomeSpan.className = 'acorde-nome';
    nomeSpan.textContent = acorde;
    
    const porcentagemSpan = document.createElement('span');
    porcentagemSpan.className = 'acorde-porcentagem';
    porcentagemSpan.textContent = porcentagem + '%';
    
    conteudo.appendChild(nomeSpan);
    conteudo.appendChild(porcentagemSpan);
    secao.appendChild(conteudo);
    
    // Calcula cor do texto (claro/escuro)
    if (corClara(cor)) {
      secao.style.color = '#333';
      conteudo.style.textShadow = '0 1px 2px rgba(255, 255, 255, 0.5)';
    } else {
      secao.style.color = '#fff';
      conteudo.style.textShadow = '0 1px 2px rgba(0, 0, 0, 0.3)';
    }
    
    barra.appendChild(secao);
    
    posicaoAcumulada += porcentagem;
    
    // Adiciona divisor (exceto no último)
    if (index < acordes.length - 1) {
      const divisor = document.createElement('div');
      divisor.className = 'acorde-divisor';
      divisor.style.left = posicaoAcumulada + '%';
      divisor.dataset.index = index;
      
      // Event listeners de arrastar
      divisor.addEventListener('mousedown', iniciarArrastar);
      
      barra.appendChild(divisor);
    }
  });
}

/**
 * Inicia o arrasto do divisor
 */
function iniciarArrastar(e) {
  e.preventDefault();
  
  const divisor = e.target;
  const index = parseInt(divisor.dataset.index);
  
  dragState = {
    divisor,
    index,
    inicioPosicao: e.clientX
  };
  
  divisor.classList.add('dragging');
  
  document.addEventListener('mousemove', arrastar);
  document.addEventListener('mouseup', pararArrastar);
}

/**
 * Arrasta o divisor
 */
function arrastar(e) {
  if (!dragState) return;
  
  const barra = document.getElementById('acordes-barra');
  const rect = barra.getBoundingClientRect();
  const larguraBarra = rect.width;
  
  // Calcula nova posição em porcentagem
  const x = e.clientX - rect.left;
  const novaPorcentagem = (x / larguraBarra) * 100;
  
  // Limita entre 5% e 95%
  const porcentagemLimitada = Math.max(5, Math.min(95, novaPorcentagem));
  
  const acordes = acordesInstance.getValue();
  const index = dragState.index;
  
  const acordeEsquerda = acordes[index];
  const acordeDireita = acordes[index + 1];
  
  // Calcula soma atual das duas seções
  const somaAtual = acordesIntensidade[acordeEsquerda] + acordesIntensidade[acordeDireita];
  
  // Calcula nova posição do divisor
  let posicaoAnterior = 0;
  for (let i = 0; i < index; i++) {
    posicaoAnterior += acordesIntensidade[acordes[i]];
  }
  
  // Nova largura da seção esquerda
  let novaLarguraEsquerda = porcentagemLimitada - posicaoAnterior;
  novaLarguraEsquerda = Math.max(5, Math.min(somaAtual - 5, novaLarguraEsquerda));
  
  // ✅ Atualiza intensidades com INTEIROS
  acordesIntensidade[acordeEsquerda] = Math.round(novaLarguraEsquerda);
  acordesIntensidade[acordeDireita] = Math.round(somaAtual - novaLarguraEsquerda);
  
  // ✅ Garante que soma exatamente a somaAtual
  const somaReal = acordesIntensidade[acordeEsquerda] + acordesIntensidade[acordeDireita];
  if (somaReal !== Math.round(somaAtual)) {
    const diferenca = Math.round(somaAtual) - somaReal;
    acordesIntensidade[acordeDireita] += diferenca;
  }
  
  // ✅ Garante limites 5-95%
  acordesIntensidade[acordeEsquerda] = Math.max(5, Math.min(95, acordesIntensidade[acordeEsquerda]));
  acordesIntensidade[acordeDireita] = Math.max(5, Math.min(95, acordesIntensidade[acordeDireita]));
  
  // Re-renderiza
  renderizarBarraAcordes(acordes);
  
  // Reaplica estado de dragging
  const novosDivisores = document.querySelectorAll('.acorde-divisor');
  if (novosDivisores[index]) {
    novosDivisores[index].classList.add('dragging');
  }
}

/**
 * Para o arrasto
 */
function pararArrastar() {
  if (dragState) {
    dragState.divisor?.classList?.remove('dragging');
    dragState = null;
  }
  
  document.removeEventListener('mousemove', arrastar);
  document.removeEventListener('mouseup', pararArrastar);
}

/**
 * Verifica se cor é clara (para texto)
 */
function corClara(cor) {
  const rgb = parseInt(cor.slice(1), 16);
  const r = (rgb >> 16) & 0xff;
  const g = (rgb >>  8) & 0xff;
  const b = (rgb >>  0) & 0xff;
  
  const luminosidade = 0.299 * r + 0.587 * g + 0.114 * b;
  return luminosidade > 186;
}

// ✅ Inicializa barra vazia ao carregar página
setTimeout(() => {
  atualizarBarraAcordes();
}, 500);

function inicializarAutocompleteMarca() {
  const inputMarca = document.getElementById('marca');
  let datalistMarca = document.getElementById('marcas-list');
  
  if (datalistMarca) {
    datalistMarca.remove();
  }
  
  datalistMarca = document.createElement('datalist');
  datalistMarca.id = 'marcas-list';
  
  marcasDisponiveis.forEach(marca => {
    const option = document.createElement('option');
    option.value = marca;
    datalistMarca.appendChild(option);
  });
  
  document.body.appendChild(datalistMarca);
  inputMarca.setAttribute('list', 'marcas-list');
  
  console.log(`✅ Autocomplete inicializado com ${marcasDisponiveis.length} marcas`);
}

// Event listener para quando a marca mudar
setTimeout(() => {
  const inputMarca = document.getElementById('marca');
  if (inputMarca) {
    inputMarca.addEventListener('change', atualizarLinhasPorMarca);
    inputMarca.addEventListener('blur', atualizarLinhasPorMarca);
  }

  // ✅ NOVO: Event listener para auto-selecionar linha baseada no nome
  const inputNome = document.getElementById('nome');
  if (inputNome) {
    inputNome.addEventListener('input', autoSelecionarLinha);
    inputNome.addEventListener('blur', autoSelecionarLinha);
  }
}, 100);

/**
 * ✅ NOVA: Auto-seleciona linha se o nome do perfume começar com o nome da linha
 */
function autoSelecionarLinha() {
  const nome = document.getElementById('nome').value.trim().toLowerCase();
  const marca = document.getElementById('marca').value.trim();
  const selectLinha = document.getElementById('linha');
  
  // Se não tem nome ou marca, não faz nada
  if (!nome || !marca) return;
  
  // Se já tem uma linha selecionada manualmente, não altera
  if (selectLinha.value && selectLinha.value !== '' && selectLinha.dataset.autoSelected !== 'true') {
    return;
  }
  
  // Busca linhas da marca atual
  const linhasDaMarca = linhasDisponiveis[marca] || [];
  
  // Procura por linha que começa com o mesmo nome
  for (const linha of linhasDaMarca) {
    const linhaLower = linha.toLowerCase();
    
    // Verifica se o nome do perfume começa com o nome da linha
    if (nome.startsWith(linhaLower)) {
      selectLinha.value = linha;
      selectLinha.dataset.autoSelected = 'true'; // Marca como auto-selecionado
      console.log(`✅ Linha "${linha}" auto-selecionada para "${nome}"`);
      
      // Mostra feedback visual
      selectLinha.style.background = '#e8f5e9';
      setTimeout(() => {
        selectLinha.style.background = '';
      }, 1000);
      
      return;
    }
  }
  
  // Se não encontrou correspondência e estava auto-selecionado, desmarca
  if (selectLinha.dataset.autoSelected === 'true') {
    selectLinha.value = '';
    selectLinha.dataset.autoSelected = 'false';
  }
}

function atualizarLinhasPorMarca() {
  const marca = document.getElementById('marca').value.trim();
  const selectLinha = document.getElementById('linha');
  
  // Limpa opções antigas
  selectLinha.innerHTML = '<option value="">Nenhuma</option><option value="__CRIAR_NOVA__">+ Criar nova linha</option>';
  
  // ✅ Reseta flag de auto-seleção
  selectLinha.dataset.autoSelected = 'false';
  selectLinha.value = '';
  
  // Adiciona linhas da marca
  if (marca && linhasDisponiveis[marca]) {
    linhasDisponiveis[marca].forEach(linha => {
      const option = document.createElement('option');
      option.value = linha;
      option.textContent = linha;
      selectLinha.appendChild(option);
    });
    console.log(`✅ ${linhasDisponiveis[marca].length} linhas carregadas para ${marca}`);
  }
}

// Event listener para criar nova linha
document.getElementById('linha').addEventListener('change', async (e) => {
  // ✅ Marca que foi alterado manualmente (não é auto-seleção)
  if (e.target.value !== '__CRIAR_NOVA__') {
    e.target.dataset.autoSelected = 'false';
  }

  if (e.target.value === '__CRIAR_NOVA__') {
    const marca = document.getElementById('marca').value.trim();
    
    if (!marca) {
      alert('Selecione uma marca primeiro!');
      e.target.value = '';
      return;
    }
    
    const novaLinha = prompt('Digite o nome da nova linha:');
    
    if (novaLinha && novaLinha.trim() !== '') {
      const linhaTrimmed = novaLinha.trim();
      
      try {
        // Salva linha no Firebase
        await salvarLinha(marca, linhaTrimmed);
        
        // Atualiza cache local
        if (!linhasDisponiveis[marca]) {
          linhasDisponiveis[marca] = [];
        }
        linhasDisponiveis[marca].push(linhaTrimmed);
        
        // Atualiza select
        atualizarLinhasPorMarca();
        
        // Seleciona a nova linha
        document.getElementById('linha').value = linhaTrimmed;
        
        alert('✅ Linha criada com sucesso!');
        
      } catch (error) {
        console.error('Erro ao criar linha:', error);
        alert('Erro ao criar linha: ' + error.message);
        e.target.value = '';
      }
    } else {
      e.target.value = '';
    }
  }
});

async function puxarNotasEAcordesDoOriginal(perfumeOriginalId) {
  try {
    console.log('🔄 Verificando se deve puxar dados do original...', perfumeOriginalId);
    
    const topoInstance = document.getElementById('topo').tomselect;
    const coracaoInstance = document.getElementById('coracao').tomselect;
    const fundoInstance = document.getElementById('fundo').tomselect;
    const acordesInstance = document.getElementById('acordes').tomselect;
    
    const temNotasTopo = topoInstance.getValue().length > 0;
    const temNotasCoracao = coracaoInstance.getValue().length > 0;
    const temNotasFundo = fundoInstance.getValue().length > 0;
    const temAcordes = acordesInstance.getValue().length > 0;
    
    console.log('📊 Status dos campos:', {
      temNotasTopo,
      temNotasCoracao,
      temNotasFundo,
      temAcordes
    });
    
    if (temNotasTopo || temNotasCoracao || temNotasFundo || temAcordes) {
      console.log('ℹ️ Notas/acordes já preenchidos, não puxando do original');
      return;
    }
    
    console.log('📡 Buscando dados do perfume original...');
    
    const perfumeOriginal = await buscarPerfumePorId(perfumeOriginalId);
    
    if (!perfumeOriginal) {
      console.log('❌ Perfume original não encontrado');
      return;
    }
    
    console.log('✅ Perfume original encontrado:', perfumeOriginal.nome);
    console.log('📋 Dados do perfume:', perfumeOriginal);
    
    let algumaCopiaFeita = false;
    
    // ✅ Copia NOTAS
    if (perfumeOriginal.notas) {
      if (perfumeOriginal.notas.topo && perfumeOriginal.notas.topo.length > 0) {
        topoInstance.setValue(perfumeOriginal.notas.topo);
        console.log('✅ Notas de topo copiadas:', perfumeOriginal.notas.topo);
        algumaCopiaFeita = true;
      }
      
      if (perfumeOriginal.notas.coracao && perfumeOriginal.notas.coracao.length > 0) {
        coracaoInstance.setValue(perfumeOriginal.notas.coracao);
        console.log('✅ Notas de coração copiadas:', perfumeOriginal.notas.coracao);
        algumaCopiaFeita = true;
      }
      
      if (perfumeOriginal.notas.fundo && perfumeOriginal.notas.fundo.length > 0) {
        fundoInstance.setValue(perfumeOriginal.notas.fundo);
        console.log('✅ Notas de fundo copiadas:', perfumeOriginal.notas.fundo);
        algumaCopiaFeita = true;
      }
    }
    
    // ✅ Copia ACORDES
    if (perfumeOriginal.acordes && perfumeOriginal.acordes.length > 0) {
      acordesInstance.setValue(perfumeOriginal.acordes);
      console.log('✅ Acordes copiados:', perfumeOriginal.acordes);
      algumaCopiaFeita = true;
    }
    
    // ✅ NOVO: Copia SLIDERS (Gênero, Clima, Ambiente, Hora)
    if (perfumeOriginal.caracteristicas) {
      const caracteristicas = perfumeOriginal.caracteristicas;
      
      // Gênero
      if (caracteristicas.genero) {
        const generoInput = document.getElementById('genero-value');
        generoInput.value = caracteristicas.genero;
        generoInput.dataset.avaliado = 'true';
        
        document.querySelectorAll('.genero-ponto').forEach(p => p.classList.remove('ativo'));
        const pontoCerto = document.querySelector(`.genero-ponto[data-value="${caracteristicas.genero}"]`);
        if (pontoCerto) {
          pontoCerto.classList.add('ativo');
          console.log('✅ Gênero copiado:', caracteristicas.genero);
          algumaCopiaFeita = true;
        }
      }
      
      // Clima
      if (caracteristicas.clima !== undefined) {
        const climaInput = document.getElementById('clima-value');
        climaInput.value = caracteristicas.clima;
        climaInput.dataset.avaliado = 'true';
        
        document.querySelectorAll('.clima-ponto').forEach(p => p.classList.remove('ativo'));
        const pontoCerto = document.querySelector(`.clima-ponto[data-value="${caracteristicas.clima}"]`);
        if (pontoCerto) {
          pontoCerto.classList.add('ativo');
          console.log('✅ Clima copiado:', caracteristicas.clima);
          algumaCopiaFeita = true;
        }
      }
      
      // Ambiente
      if (caracteristicas.ambiente !== undefined) {
        const ambienteInput = document.getElementById('ambiente-value');
        ambienteInput.value = caracteristicas.ambiente;
        ambienteInput.dataset.avaliado = 'true';
        
        document.querySelectorAll('.ambiente-ponto').forEach(p => p.classList.remove('ativo'));
        const pontoCerto = document.querySelector(`.ambiente-ponto[data-value="${caracteristicas.ambiente}"]`);
        if (pontoCerto) {
          pontoCerto.classList.add('ativo');
          console.log('✅ Ambiente copiado:', caracteristicas.ambiente);
          algumaCopiaFeita = true;
        }
      }
      
      // Hora
      if (caracteristicas.hora !== undefined) {
        const horaInput = document.getElementById('hora-value');
        horaInput.value = caracteristicas.hora;
        horaInput.dataset.avaliado = 'true';
        
        document.querySelectorAll('.hora-ponto').forEach(p => p.classList.remove('ativo'));
        const pontoCerto = document.querySelector(`.hora-ponto[data-value="${caracteristicas.hora}"]`);
        if (pontoCerto) {
          pontoCerto.classList.add('ativo');
          console.log('✅ Hora copiado:', caracteristicas.hora);
          algumaCopiaFeita = true;
        }
      }
    }
    
    if (algumaCopiaFeita) {
      alert(`✅ Dados copiados de "${perfumeOriginal.nome}"!\n\nNotas, acordes e características foram preenchidos.\nVocê pode editá-los se desejar.`);
    } else {
      console.log('ℹ️ Perfume original não possui dados para copiar');
    }
    
  } catch (error) {
    console.error('❌ Erro ao puxar dados do original:', error);
    alert('Erro ao buscar dados do perfume original: ' + error.message);
  }
}

async function inicializarSelectPerfumeOriginal() {
  try {
    const perfumes = await buscarPerfumes(usuarioAtual.uid, true);
    
    const selectPerfume = document.getElementById('perfume-original');
    selectPerfume.innerHTML = '<option value="">Selecione o perfume original...</option>';
    
    const optionNovo = document.createElement('option');
    optionNovo.value = '__CADASTRAR_NOVO__';
    optionNovo.textContent = '+ Cadastrar novo perfume';
    selectPerfume.appendChild(optionNovo);
    
    perfumes.forEach(perfume => {
      const option = document.createElement('option');
      option.value = perfume.id;
      option.textContent = `${perfume.nome} - ${perfume.marca}`;
      option.dataset.perfumeId = perfume.id;
      selectPerfume.appendChild(option);
    });
    
    if (perfumeOriginalInstance) {
      perfumeOriginalInstance.destroy();
    }
    
    perfumeOriginalInstance = new TomSelect('#perfume-original', {
      create: false,
      sortField: { field: "text", direction: "asc" },
      placeholder: "Selecione o perfume original...",
      plugins: [],
      dropdownParent: 'body',
      maxOptions: null,
      onChange: async function(value) {
        console.log('🔄 Perfume original selecionado:', value);
        if (value === '__CADASTRAR_NOVO__') {
          salvarDadosAtuaisEIrParaOriginal();
        } else if (value && value !== '') {
          setTimeout(async () => {
            await puxarNotasEAcordesDoOriginal(value);
          }, 300);
        }
      },
      render: {
        option: function(data, escape) {
          if (data.value === '__CADASTRAR_NOVO__') {
            return '<div class="option-cadastrar-novo">' + escape(data.text) + '</div>';
          }
          return '<div>' + escape(data.text) + '</div>';
        }
      }
    });
    
    perfumeOriginalInstance.wrapper.style.width = '93%';
    
    console.log(`✅ Select perfume original inicializado com ${perfumes.length} perfumes`);
    
  } catch (error) {
    console.error('❌ Erro ao inicializar select de perfume original:', error);
  }
}

function salvarDadosAtuaisEIrParaOriginal() {
  console.log('💾 Salvando dados atuais antes de cadastrar perfume original...');
  
  const dadosAtuais = {
    nome: document.getElementById('nome').value,
    marca: document.getElementById('marca').value,
    perfumista: document.getElementById('perfumista').value,
    textoReview: document.getElementById('review').value,
    status: document.querySelector('input[name="status"]:checked')?.value || '',
    fotoURL: document.getElementById('foto-url').value,
    contratipoEh: document.getElementById('contratipo-sim').checked,
    notasTopo: Array.from(document.getElementById('topo').selectedOptions).map(opt => opt.value),
    notasCoracao: Array.from(document.getElementById('coracao').selectedOptions).map(opt => opt.value),
    notasFundo: Array.from(document.getElementById('fundo').selectedOptions).map(opt => opt.value),
    acordes: Array.from(document.getElementById('acordes').selectedOptions).map(opt => opt.value),
    avaliacaoCheiro: document.querySelector('[data-id="cheiro"]')?.dataset.valor || '0',
    avaliacaoProjecao: document.querySelector('[data-id="projecao"]')?.dataset.valor || '0',
    avaliacaoFixacao: document.querySelector('[data-id="fixacao"]')?.dataset.valor || '0',
    avaliacaoVersatilidade: document.querySelector('[data-id="versatilidade"]')?.dataset.valor || '0',
    clima: document.getElementById('clima-value')?.value || '',
    ambiente: document.getElementById('ambiente-value')?.value || '',
    genero: document.getElementById('genero-value')?.value || '',
    hora: document.getElementById('hora-value')?.value || '',
    modoEdicao: modoEdicao,
    perfumeId: perfumeId
  };
  
  sessionStorage.setItem('dadosContratipoTemp', JSON.stringify(dadosAtuais));
  sessionStorage.setItem('cadastrandoPerfumeOriginal', 'true');
  
  window.location.href = 'form-add-perf.html';
}

async function restaurarDadosContratipo(perfumeOriginalId, dadosJSON) {
  try {
    const dados = JSON.parse(dadosJSON);
    
    console.log('🔄 Restaurando dados:', dados);
    
    document.getElementById('nome').value = dados.nome || '';
    document.getElementById('marca').value = dados.marca || '';
    document.getElementById('perfumista').value = dados.perfumista || '';
    document.getElementById('review').value = dados.textoReview || '';
    document.getElementById('foto-url').value = dados.fotoURL || '';
    
    if (dados.fotoURL) {
      const preview = document.getElementById('preview-foto');
      const textoFoto = document.getElementById('texto-foto');
      preview.src = dados.fotoURL;
      preview.style.display = 'block';
      textoFoto.style.display = 'none';
    }
    
    if (dados.status) {
      const statusRadio = document.querySelector(`input[value="${dados.status}"]`);
      if (statusRadio) {
        statusRadio.checked = true;
        statusRadio.dataset.checked = 'true';
      }
    }
    
    document.getElementById('contratipo-sim').checked = true;
    document.getElementById('campo-perfume-original').classList.add('mostrar');
    
    setTimeout(() => {
      if (perfumeOriginalInstance) {
        perfumeOriginalInstance.setValue(perfumeOriginalId);
        console.log('✅ Perfume original selecionado:', perfumeOriginalId);
      }
    }, 800);
    
    setTimeout(() => {
      const topoInstance = document.getElementById('topo').tomselect;
      const coracaoInstance = document.getElementById('coracao').tomselect;
      const fundoInstance = document.getElementById('fundo').tomselect;
      const acordesInstance = document.getElementById('acordes').tomselect;
      
      if (topoInstance && dados.notasTopo) topoInstance.setValue(dados.notasTopo);
      if (coracaoInstance && dados.notasCoracao) coracaoInstance.setValue(dados.notasCoracao);
      if (fundoInstance && dados.notasFundo) fundoInstance.setValue(dados.notasFundo);
      if (acordesInstance && dados.acordes) acordesInstance.setValue(dados.acordes);
      
      console.log('✅ Notas e acordes restaurados');
    }, 1000);
    
    setTimeout(() => {
      document.querySelector('[data-id="cheiro"]').dataset.valor = dados.avaliacaoCheiro;
      document.querySelector('[data-id="projecao"]').dataset.valor = dados.avaliacaoProjecao;
      document.querySelector('[data-id="fixacao"]').dataset.valor = dados.avaliacaoFixacao;
      document.querySelector('[data-id="versatilidade"]').dataset.valor = dados.avaliacaoVersatilidade;
      
      document.querySelectorAll('.estrelas').forEach(container => {
        const svgAntigo = container.querySelector('svg');
        const spanAntigo = container.querySelector('.nota-valor');
        if (svgAntigo) svgAntigo.remove();
        if (spanAntigo) spanAntigo.remove();
        
        criarEstrelas(container);
      });
      
      atualizarMedia();
    }, 1200);
    
    if (dados.clima) {
      const climaInput = document.getElementById('clima-value');
      climaInput.value = dados.clima;
      climaInput.dataset.avaliado = 'true';
      const pontoCerto = document.querySelector(`.clima-ponto[data-value="${dados.clima}"]`);
      if (pontoCerto) pontoCerto.classList.add('ativo');
    }
    
    if (dados.ambiente) {
      const ambienteInput = document.getElementById('ambiente-value');
      ambienteInput.value = dados.ambiente;
      ambienteInput.dataset.avaliado = 'true';
      const pontoCerto = document.querySelector(`.ambiente-ponto[data-value="${dados.ambiente}"]`);
      if (pontoCerto) pontoCerto.classList.add('ativo');
    }
    
    if (dados.hora) {
      const horaInput = document.getElementById('hora-value');
      horaInput.value = dados.hora;
      horaInput.dataset.avaliado = 'true';
      const pontoCerto = document.querySelector(`.hora-ponto[data-value="${dados.hora}"]`);
      if (pontoCerto) pontoCerto.classList.add('ativo');
    }
    
    if (dados.genero) {
      const generoInput = document.getElementById('genero-value');
      generoInput.value = dados.genero;
      generoInput.dataset.avaliado = 'true';
      const pontoCerto = document.querySelector(`.genero-ponto[data-value="${dados.genero}"]`);
      if (pontoCerto) pontoCerto.classList.add('ativo');
    }
    
    if (dados.modoEdicao && dados.perfumeId) {
      document.title = 'Editar Perfume';
      const submitButton = document.getElementById('adicionar');
      submitButton.textContent = 'Salvar Alterações';
      submitButton.style.width = '131px';
    }
    
    console.log('✅ Todos os dados restaurados!');
    alert('✅ Perfume original cadastrado! Continue editando o contratipo.');
    
  } catch (error) {
    console.error('❌ Erro ao restaurar dados:', error);
    alert('Erro ao restaurar dados. Por favor, preencha novamente.');
  }
}

function atualizarListaMarcas() {
  const datalistMarca = document.getElementById('marcas-list');
  if (datalistMarca) {
    datalistMarca.innerHTML = '';
    
    marcasDisponiveis.forEach(marca => {
      const option = document.createElement('option');
      option.value = marca;
      datalistMarca.appendChild(option);
    });
    
    console.log(`✅ Lista de marcas atualizada: ${marcasDisponiveis.length} marcas`);
  }
}

ids.forEach((id) => {
  const select = document.getElementById(id);
  select.innerHTML = '';
  
  notas.forEach((nota) => {
    const option = document.createElement("option");
    option.value = nota;
    option.textContent = nota;
    select.appendChild(option);
  });
  
  new TomSelect(`#${id}`, {
    maxItems: null,
    create: false,
    sortField: { field: "text", direction: "asc" },
    placeholder: "Pesquise e selecione notas...",
    plugins: ["remove_button"],
    dropdownParent: 'body',
    onItemAdd: function() {
      this.setTextboxValue('');
      this.refreshOptions();
    }
  });
  
  console.log(`✅ TomSelect criado para ${id}`);
});

document.querySelectorAll('input[name="status"]').forEach(radio => {
  radio.dataset.checked = 'false';
});

document.querySelectorAll('input[name="status"]').forEach(radio => {
  let clickTimeout;
  radio.addEventListener('click', e => {
    e.preventDefault();
    
    clearTimeout(clickTimeout);
    
    clickTimeout = setTimeout(() => {
      if (radio.dataset.checked === 'true') {
        radio.checked = false;
        radio.dataset.checked = 'false';
        
        document.querySelectorAll('input[name="status"]').forEach(r => {
          r.dataset.checked = 'false';
        });
      } else {
        document.querySelectorAll('input[name="status"]').forEach(r => {
          r.checked = false;
          r.dataset.checked = 'false';
        });
        
        radio.checked = true;
        radio.dataset.checked = 'true';
      }
    }, 10);
  });
});

document.querySelectorAll('input[name="contratipo"]').forEach(radio => {
  radio.addEventListener('change', e => {
    const campoPerfumeOriginal = document.getElementById('campo-perfume-original');
    
    if (e.target.value === 'sim') {
      campoPerfumeOriginal.classList.add('mostrar');
    } else {
      campoPerfumeOriginal.classList.remove('mostrar');
      if (perfumeOriginalInstance) {
        perfumeOriginalInstance.clear();
      }
    }
  });
});

function criarSliderCustomizado(tipoSlider, inputId) {
  document.querySelectorAll(`.${tipoSlider}-ponto`).forEach(ponto => {
    ponto.addEventListener('click', function() {
      const value = this.dataset.value;
      const input = document.getElementById(inputId);
      
      document.querySelectorAll(`.${tipoSlider}-ponto`).forEach(p => p.classList.remove('ativo'));
      
      if (input.value === value) {
        input.value = '';
        input.dataset.avaliado = 'false';
        console.log(`🔵 ${tipoSlider} desmarcado`);
      } else {
        this.classList.add('ativo');
        input.value = value;
        input.dataset.avaliado = 'true';
        console.log(`🔵 ${tipoSlider} selecionado:`, value);
      }
    });
  });
}

criarSliderCustomizado('genero', 'genero-value');
criarSliderCustomizado('clima', 'clima-value');
criarSliderCustomizado('ambiente', 'ambiente-value');
criarSliderCustomizado('hora', 'hora-value');

function criarEstrelas(container) {
  const total = 5;
  let valorTemporario = 0;
  let valorSelecionado = 0;
  
  const valorInicial = parseFloat(container.dataset.valor) || 0;
  valorSelecionado = valorInicial;
  
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 120 24");
  svg.style.display = "block";
  
  const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
  svg.appendChild(defs);

  for (let i = 0; i < total; i++) {
    const star = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    star.setAttribute("points", "12,2 15,9 23,9 17,14 19,22 12,18 5,22 7,14 1,9 9,9");
    star.setAttribute("transform", `translate(${i * 24}, 0)`);
    star.setAttribute("fill", "#ccc");
    star.classList.add(`star-${i}`);
    svg.appendChild(star);
  }

  function atualizar(valor) {
    const estrelas = svg.querySelectorAll("polygon");
    const valorArredondado = Math.round(valor * 2) / 2;
    
    const spanNota = container.querySelector('.nota-valor');
    if (spanNota) {
      spanNota.textContent = valorArredondado.toFixed(1);
    }
    
    defs.innerHTML = "";
    
    estrelas.forEach((star, i) => {
      const preenchimento = Math.min(1, Math.max(0, valorArredondado - i));
      
      if (preenchimento === 0) {
        star.setAttribute("fill", "#ccc");
      } else if (preenchimento === 1) {
        star.setAttribute("fill", "#FFD700");
      } else {
        const gradId = `grad-${container.dataset.id}-${i}`;
        const grad = document.createElementNS("http://www.w3.org/2000/svg", "linearGradient");
        grad.setAttribute("id", gradId);
        grad.innerHTML = `
          <stop offset="${preenchimento * 100}%" stop-color="#FFD700"/>
          <stop offset="${preenchimento * 100}%" stop-color="#ccc"/>
        `;
        defs.appendChild(grad);
        star.setAttribute("fill", `url(#${gradId})`);
      }
    });
  }

  svg.addEventListener("mousemove", (e) => {
    const rect = svg.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const larguraEstrela = rect.width / total;
    const estrelaSelecionada = Math.floor(x / larguraEstrela);
    const posicaoDentroEstrela = (x % larguraEstrela) / larguraEstrela;
    valorTemporario = Math.min(5, Math.max(0, estrelaSelecionada + posicaoDentroEstrela));
    atualizar(valorTemporario);
  });

  svg.addEventListener("click", () => {
    valorSelecionado = Math.round(valorTemporario * 2) / 2;
    container.dataset.valor = valorSelecionado.toFixed(1);
    atualizarMedia();
  });

  svg.addEventListener("mouseleave", () => {
    atualizar(valorSelecionado);
  });

  container.appendChild(svg);
  
  const spanNota = document.createElement('span');
  spanNota.className = 'nota-valor';
  spanNota.textContent = valorSelecionado.toFixed(1);
  spanNota.style.marginLeft = '6px';
  spanNota.style.fontWeight = '600';
  spanNota.style.color = '#000';
  spanNota.style.display = 'inline-block';
  spanNota.style.minWidth = '30px';
  container.appendChild(spanNota);
  
  atualizar(valorSelecionado);
}

document.querySelectorAll('.estrelas').forEach(criarEstrelas);

function atualizarMedia() {
  const elementos = document.querySelectorAll('.estrelas');
  const valores = Array.from(elementos).map(el => parseFloat(el.dataset.valor || 0));
  const todasPreenchidas = valores.every(v => v > 0);
  
  if (todasPreenchidas) {
    const media = valores.reduce((a, b) => a + b, 0) / valores.length;
    document.getElementById('media').textContent = media.toFixed(1);
  } else {
    document.getElementById('media').textContent = '0';
  }
}

async function carregarPerfumeParaEdicao() {
  try {
    console.log('📡 Carregando perfume para edição:', perfumeId);
    
    document.title = 'Editar Perfume';
    const submitButton = document.getElementById('adicionar');
    submitButton.textContent = 'Salvar Alterações';
    submitButton.style.width = '131px';

    // ✅ NOVO: Mostra botão deletar (APENAS para admin)
    const btnDeletar = document.getElementById('deletar');
    if (btnDeletar && isAdmin()) {
      btnDeletar.style.display = 'flex';
      console.log('🗑️ Botão deletar habilitado (admin)');
    }
    
    const perfumeRef = doc(db, "perfumes", perfumeId);
    const perfumeSnap = await getDoc(perfumeRef);
    
    if (!perfumeSnap.exists()) {
      alert('Perfume não encontrado!');
      window.location.href = '../perfil/perfil.html';
      return;
    }
    
    const perfume = perfumeSnap.data();
    console.log('✅ Perfume carregado:', perfume.nome);
    
    document.getElementById('nome').value = perfume.nome || '';
    document.getElementById('marca').value = perfume.marca || '';
    document.getElementById('perfumista').value = perfume.perfumista || '';

    // Carrega linha
    if (perfume.marca) {
      setTimeout(() => {
        atualizarLinhasPorMarca();
        if (perfume.linha) {
          const selectLinha = document.getElementById('linha');
          selectLinha.value = perfume.linha;
          selectLinha.dataset.autoSelected = 'false'; // Marca como seleção manual
        }
      }, 500);
    }
    
    // ✅ NOVO: Carrega link de compra
    if (perfume.linkCompra) {
      document.getElementById('link-compra').value = perfume.linkCompra;
    }
    
    if (perfume.review) {
      document.getElementById('review').value = perfume.review.texto || '';
    }
    
    if (perfume.status) {
      const statusRadio = document.querySelector(`input[value="${perfume.status}"]`);
      if (statusRadio) {
        statusRadio.checked = true;
        statusRadio.dataset.checked = 'true';
      }
    } else {
      document.querySelectorAll('input[name="status"]').forEach(r => {
        r.checked = false;
        r.dataset.checked = 'false';
      });
    }
    
    if (perfume.contratipo) {
      if (perfume.contratipo.eh) {
        document.getElementById('contratipo-sim').checked = true;
        document.getElementById('campo-perfume-original').classList.add('mostrar');
        
        setTimeout(() => {
          if (perfumeOriginalInstance && perfume.contratipo.perfumeOriginal) {
            perfumeOriginalInstance.setValue(perfume.contratipo.perfumeOriginal);
          }
        }, 500);
      } else {
        document.getElementById('contratipo-nao').checked = true;
        document.getElementById('campo-perfume-original').classList.remove('mostrar');
      }
    }
    
    if (perfume.fotoURL) {
      const preview = document.getElementById('preview-foto');
      const textoFoto = document.getElementById('texto-foto');
      preview.src = perfume.fotoURL;
      preview.style.display = 'block';
      textoFoto.style.display = 'none';
      document.getElementById('foto-url').value = perfume.fotoURL;
    }
    
    setTimeout(() => {
      if (perfume.notas) {
        const topoInstance = document.getElementById('topo').tomselect;
        const coracaoInstance = document.getElementById('coracao').tomselect;
        const fundoInstance = document.getElementById('fundo').tomselect;
        
        if (topoInstance && perfume.notas.topo) {
          topoInstance.setValue(perfume.notas.topo);
        }
        if (coracaoInstance && perfume.notas.coracao) {
          coracaoInstance.setValue(perfume.notas.coracao);
        }
        if (fundoInstance && perfume.notas.fundo) {
          fundoInstance.setValue(perfume.notas.fundo);
        }
      }
      
      if (perfume.acordes) {
        const acordesInstance = document.getElementById('acordes').tomselect;
        if (acordesInstance) {
          acordesInstance.setValue(perfume.acordes);
          
          // ✅ NOVO: Restaura intensidades salvas
          if (perfume.acordesIntensidade) {
            acordesIntensidade = { ...perfume.acordesIntensidade };
            console.log('✅ Intensidades restauradas:', acordesIntensidade);
          }
          
          // Atualiza barra após restaurar
          setTimeout(() => {
            atualizarBarraAcordes();
          }, 300);
        }
      }
      
      setTimeout(() => {
        document.querySelectorAll('.ts-dropdown').forEach(dropdown => {
          dropdown.style.display = 'none';
        });
      }, 100);
    }, 500);
    
    if (perfume.avaliacoes) {
      console.log('✅ Carregando avaliações:', perfume.avaliacoes);
      
      document.querySelector('[data-id="cheiro"]').dataset.valor = perfume.avaliacoes.cheiro || 0;
      document.querySelector('[data-id="projecao"]').dataset.valor = perfume.avaliacoes.projecao || 0;
      document.querySelector('[data-id="fixacao"]').dataset.valor = perfume.avaliacoes.fixacao || 0;
      document.querySelector('[data-id="versatilidade"]').dataset.valor = perfume.avaliacoes.versatilidade || 0;
      
      requestAnimationFrame(() => {
        document.querySelectorAll('.estrelas').forEach(container => {
          const svgAntigo = container.querySelector('svg');
          const spanAntigo = container.querySelector('.nota-valor');
          if (svgAntigo) svgAntigo.remove();
          if (spanAntigo) spanAntigo.remove();
          
          criarEstrelas(container);
        });
        
        atualizarMedia();
        console.log('✅ Avaliações carregadas nas estrelas!');
      });
    }
    
    if (perfume.caracteristicas) {
      if (perfume.caracteristicas.clima !== undefined) {
        const climaInput = document.getElementById('clima-value');
        climaInput.value = perfume.caracteristicas.clima;
        climaInput.dataset.avaliado = 'true';
        const pontoCerto = document.querySelector(`.clima-ponto[data-value="${perfume.caracteristicas.clima}"]`);
        if (pontoCerto) {
          pontoCerto.classList.add('ativo');
          console.log('✅ Clima carregado:', perfume.caracteristicas.clima);
        }
      }
      
      if (perfume.caracteristicas.ambiente !== undefined) {
        const ambienteInput = document.getElementById('ambiente-value');
        ambienteInput.value = perfume.caracteristicas.ambiente;
        ambienteInput.dataset.avaliado = 'true';
        const pontoCerto = document.querySelector(`.ambiente-ponto[data-value="${perfume.caracteristicas.ambiente}"]`);
        if (pontoCerto) {
          pontoCerto.classList.add('ativo');
          console.log('✅ Ambiente carregado:', perfume.caracteristicas.ambiente);
        }
      }
      
      if (perfume.caracteristicas.hora !== undefined) {
        const horaInput = document.getElementById('hora-value');
        horaInput.value = perfume.caracteristicas.hora;
        horaInput.dataset.avaliado = 'true';
        const pontoCerto = document.querySelector(`.hora-ponto[data-value="${perfume.caracteristicas.hora}"]`);
        if (pontoCerto) {
          pontoCerto.classList.add('ativo');
          console.log('✅ Hora carregado:', perfume.caracteristicas.hora);
        }
      }
      
      if (perfume.caracteristicas.genero) {
        const generoInput = document.getElementById('genero-value');
        generoInput.value = perfume.caracteristicas.genero;
        generoInput.dataset.avaliado = 'true';
        const pontoCerto = document.querySelector(`.genero-ponto[data-value="${perfume.caracteristicas.genero}"]`);
        if (pontoCerto) {
          pontoCerto.classList.add('ativo');
          console.log('✅ Gênero carregado:', perfume.caracteristicas.genero);
        }
      }
    }
    
    console.log('✅ Perfume carregado para edição!');
    
  } catch (error) {
    console.error('❌ Erro ao carregar perfume:', error);
    alert('Erro ao carregar perfume: ' + tratarErroFirebase(error));
  }
}

// Handler do formulário
document.getElementById('info-perfume').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  if (!usuarioAtual) {
    alert('Você precisa estar logado!');
    window.location.href = '../login/login.html';
    return;
  }
  
  const submitButton = document.getElementById('adicionar');
  const textoOriginal = submitButton.textContent;
  submitButton.disabled = true;
  submitButton.textContent = modoEdicao ? 'Salvando...' : 'Salvando...';
  
  toggleLoading(true);
  
  // ✅ Valida acordes SEM ALERT
  const acordesSelecionados = acordesInstance.getValue();

  // Validação silenciosa - apenas impede de salvar
  if (acordesSelecionados.length === 1) {
    console.warn('⚠️ Adicione pelo menos 2 acordes ou deixe vazio');
    submitButton.disabled = false;
    submitButton.textContent = textoOriginal;
    
    // Mostra mensagem na própria barra
    const barra = document.getElementById('acordes-barra');
    barra.innerHTML = '<div class="mensagem-erro">⚠️ Adicione pelo menos mais 1 acorde</div>';
    
    // Scroll suave até os acordes
    document.getElementById('acordes').scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  if (acordesSelecionados.length > 8) {
    console.warn('⚠️ Máximo de 8 acordes');
    submitButton.disabled = false;
    submitButton.textContent = textoOriginal;
    
    // Mostra mensagem na própria barra
    const barra = document.getElementById('acordes-barra');
    barra.innerHTML = '<div class="mensagem-erro">⚠️ Máximo de 8 acordes atingido</div>';
    
    document.getElementById('acordes').scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  try {
    const perfumeData = {
      nome: document.getElementById('nome').value,
      marca: document.getElementById('marca').value,
      linha: document.getElementById('linha').value || null,
      notas: {
        topo: Array.from(document.getElementById('topo').selectedOptions).map(opt => opt.value).filter(v => v),
        coracao: Array.from(document.getElementById('coracao').selectedOptions).map(opt => opt.value).filter(v => v),
        fundo: Array.from(document.getElementById('fundo').selectedOptions).map(opt => opt.value).filter(v => v)
      },
      acordes: acordesSelecionados,
      acordesIntensidade: acordesSelecionados.length >= 2 ? { ...acordesIntensidade } : {}, // ✅ Clone do objeto
      perfumista: document.getElementById('perfumista').value,
      review: {
        texto: document.getElementById('review').value
      },
      status: document.querySelector('input[name="status"]:checked')?.value || '',
      linkCompra: document.getElementById('link-compra').value.trim() // ✅ NOVO
    };
    
    const contratipoSelecionado = document.querySelector('input[name="contratipo"]:checked')?.value;
    if (contratipoSelecionado === 'sim') {
      const perfumeOriginalId = perfumeOriginalInstance ? perfumeOriginalInstance.getValue() : '';
      
      if (perfumeOriginalId && perfumeOriginalId !== '__CADASTRAR_NOVO__') {
        perfumeData.contratipo = {
          eh: true,
          perfumeOriginal: perfumeOriginalId
        };
      } else {
        perfumeData.contratipo = {
          eh: false,
          perfumeOriginal: ''
        };
      }
    } else {
      perfumeData.contratipo = {
        eh: false,
        perfumeOriginal: ''
      };
    }
    
    if (perfumeData.marca && perfumeData.marca.trim() !== '') {
      const marcaTrimmed = perfumeData.marca.trim();
      
      if (!marcasDisponiveis.includes(marcaTrimmed)) {
        console.log('📝 Nova marca detectada:', marcaTrimmed);
        await salvarMarca(marcaTrimmed);
        marcasDisponiveis.push(marcaTrimmed);
        marcasDisponiveis.sort();
        atualizarListaMarcas();
        console.log('✅ Nova marca adicionada:', marcaTrimmed);
      }
    }
    
    const avaliacoes = {
      cheiro: parseFloat(document.querySelector('[data-id="cheiro"]').dataset.valor || 0),
      projecao: parseFloat(document.querySelector('[data-id="projecao"]').dataset.valor || 0),
      fixacao: parseFloat(document.querySelector('[data-id="fixacao"]').dataset.valor || 0),
      versatilidade: parseFloat(document.querySelector('[data-id="versatilidade"]').dataset.valor || 0)
    };
    
    const temAvaliacaoEstrelas = Object.values(avaliacoes).some(v => v > 0);
    
    if (temAvaliacaoEstrelas) {
      const media = Object.values(avaliacoes).reduce((a, b) => a + b, 0) / 4;
      perfumeData.avaliacoes = {
        ...avaliacoes,
        media: parseFloat(media.toFixed(1))
      };
    }
    
    const caracteristicas = {};
    
    const generoValue = document.getElementById('genero-value');
    if (generoValue.dataset.avaliado === 'true' && generoValue.value) {
      caracteristicas.genero = generoValue.value;
      console.log('✅ Salvando gênero:', generoValue.value);
    }
    
    const climaValue = document.getElementById('clima-value');
    if (climaValue.dataset.avaliado === 'true' && climaValue.value) {
      caracteristicas.clima = climaValue.value;
      console.log('✅ Salvando clima:', climaValue.value);
    }
    
    const ambienteValue = document.getElementById('ambiente-value');
    if (ambienteValue.dataset.avaliado === 'true' && ambienteValue.value) {
      caracteristicas.ambiente = ambienteValue.value;
      console.log('✅ Salvando ambiente:', ambienteValue.value);
    }
    
    const horaValue = document.getElementById('hora-value');
    if (horaValue.dataset.avaliado === 'true' && horaValue.value) {
      caracteristicas.hora = horaValue.value;
      console.log('✅ Salvando hora:', horaValue.value);
    }
    
    if (Object.keys(caracteristicas).length > 0) {
      perfumeData.caracteristicas = caracteristicas;
    }
    
    const fotoInput = document.getElementById('foto');
    const fotoURL = document.getElementById('foto-url').value.trim();
    
    if (fotoInput.files.length > 0) {
      perfumeData.fotoURL = await uploadFotoPerfume(fotoInput.files[0], usuarioAtual.uid);
    } else if (fotoURL) {
      perfumeData.fotoURL = fotoURL;
    }
    
    if (modoEdicao && perfumeId) {
      console.log('📝 Atualizando perfume:', perfumeId);
      
      // ✅ NOVO: Verifica permissão ANTES de atualizar
      try {
        await verificarPermissaoEdicao(perfumeId);
      } catch (error) {
        alert('❌ ' + error.message);
        btnSubmit.disabled = false;
        btnSubmit.textContent = textoOriginal;
        return;
      }
      
      const perfumeRef = doc(db, "perfumes", perfumeId);
      await updateDoc(perfumeRef, perfumeData);
      
      invalidarCachePerfumes(usuarioAtual.uid);
      
      alert('✅ Perfume atualizado com sucesso!');
      
      sessionStorage.removeItem('cadastrandoPerfumeOriginal');
      sessionStorage.removeItem('ultimoPerfumeCadastrado');
      sessionStorage.removeItem('dadosContratipoTemp');
      
      window.location.href = `../perfumes/perfume.html?id=${perfumeId}`;
      
    } else {
      const id = await salvarPerfume(perfumeData, usuarioAtual.uid);
      
      const estaCadastrandoOriginal = sessionStorage.getItem('cadastrandoPerfumeOriginal') === 'true';
      
      if (estaCadastrandoOriginal) {
        sessionStorage.setItem('ultimoPerfumeCadastrado', id);
        console.log('✅ Perfume original cadastrado:', id);
      }
      
      invalidarCachePerfumes(usuarioAtual.uid);
      
      alert('✅ Perfume salvo com sucesso!');
      
      if (estaCadastrandoOriginal) {
        window.location.href = 'form-add-perf.html';
      } else {
        // ✅ NOVO: Vai direto para página do perfume
        window.location.href = `../perfumes/perfume.html?id=${id}`;
      }
    }
    
  } catch (error) {
    console.error('❌ Erro ao salvar:', error);
    alert('❌ ' + tratarErroFirebase(error));
  } finally {
    toggleLoading(false);
    submitButton.disabled = false;
    submitButton.textContent = textoOriginal;
  }
});

document.getElementById('cancelar').addEventListener('click', () => {
  if (confirm('Deseja cancelar? Todos os dados serão perdidos.')) {
    sessionStorage.removeItem('cadastrandoPerfumeOriginal');
    sessionStorage.removeItem('ultimoPerfumeCadastrado');
    sessionStorage.removeItem('dadosContratipoTemp');
    
    if (modoEdicao && perfumeId) {
      window.location.href = `../perfumes/perfume.html?id=${perfumeId}`;
    } else {
      window.location.href = '../perfil/perfil.html';
    }
  }
});

// Sistema de upload de foto
const modal = document.getElementById('modal-foto');
const quadrado = document.getElementById('quadrado');
const preview = document.getElementById('preview-foto');
const textoFoto = document.getElementById('texto-foto');
const containerUrl = document.getElementById('container-url');
const fotoInput = document.getElementById('foto');
const fotoUrlInput = document.getElementById('foto-url');

quadrado.addEventListener('click', () => {
  modal.style.display = 'flex';
});

document.getElementById('btn-cancelar-modal').addEventListener('click', () => {
  modal.style.display = 'none';
});

document.getElementById('btn-upload').addEventListener('click', () => {
  modal.style.display = 'none';
  fotoInput.click();
});

document.getElementById('btn-link').addEventListener('click', () => {
  modal.style.display = 'none';
  containerUrl.style.display = 'block';
  fotoUrlInput.focus();
});

fotoInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (event) => {
      preview.src = event.target.result;
      preview.style.display = 'block';
      textoFoto.style.display = 'none';
    };
    reader.readAsDataURL(file);
  }
});

document.getElementById('btn-confirmar-url').addEventListener('click', () => {
  const url = fotoUrlInput.value.trim();
  if (url) {
    preview.src = url;
    preview.style.display = 'block';
    textoFoto.style.display = 'none';
    containerUrl.style.display = 'none';
  } else {
    alert('Por favor, cole um link válido!');
  }
});

/**
 * ✅ NOVA: Verifica se usuário pode editar/deletar perfume
 */
async function verificarPermissaoEdicao(perfumeId) {
  try {
    const perfumeRef = doc(db, "perfumes", perfumeId);
    const perfumeSnap = await getDoc(perfumeRef);
    
    if (!perfumeSnap.exists()) {
      throw new Error('Perfume não encontrado');
    }
    
    const perfumeData = perfumeSnap.data();
    
    // Verifica se é o dono OU se é admin
    if (perfumeData.userId !== usuarioAtual.uid && !isAdmin()) {
      throw new Error('Você não tem permissão para editar este perfume');
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Erro ao verificar permissão:', error);
    throw error;
  }
}

/**
 * ✅ NOVO: Deleta perfume do banco de dados
 */
async function deletarPerfumeAtual() {
  if (!perfumeId || !modoEdicao) {
    alert('❌ Erro: Perfume não encontrado');
    return;
  }

  // ✅ NOVO: Verifica permissão ANTES de deletar
  try {
    await verificarPermissaoEdicao(perfumeId);
  } catch (error) {
    alert('❌ ' + error.message);
    return;
  }
  
  // Confirmação 1: Aviso inicial
  const confirma1 = confirm(
    '⚠️ ATENÇÃO!\n\n' +
    'Você está prestes a DELETAR este perfume permanentemente.\n\n' +
    'Esta ação NÃO PODE ser desfeita!\n\n' +
    'Deseja continuar?'
  );
  
  if (!confirma1) {
    console.log('ℹ️ Deleção cancelada pelo usuário');
    return;
  }
  
  // Confirmação 2: Confirmação final
  const confirma2 = confirm(
    '🗑️ ÚLTIMA CONFIRMAÇÃO\n\n' +
    'Tem certeza ABSOLUTA que deseja deletar este perfume?\n\n' +
    'Clique em OK para DELETAR PERMANENTEMENTE.'
  );
  
  if (!confirma2) {
    console.log('ℹ️ Deleção cancelada na segunda confirmação');
    return;
  }
  
  const btnDeletar = document.getElementById('deletar');
  const textoOriginal = btnDeletar.textContent;
  btnDeletar.disabled = true;
  btnDeletar.textContent = 'Deletando...';
  
  toggleLoading(true);
  
  try {
    console.log('🗑️ Deletando perfume:', perfumeId);
    
    // Importa função de deletar do firebase-config
    const { deletarPerfume } = await import('./firebase-config.js');
    
    await deletarPerfume(perfumeId, usuarioAtual.uid);
    
    console.log('✅ Perfume deletado com sucesso!');
    
    alert('✅ Perfume deletado com sucesso!');
    
    // Redireciona para página de perfil
    window.location.href = '../perfil/perfil.html';
    
  } catch (error) {
    console.error('❌ Erro ao deletar perfume:', error);
    alert('❌ Erro ao deletar perfume:\n\n' + tratarErroFirebase(error));
    
    btnDeletar.disabled = false;
    btnDeletar.textContent = textoOriginal;
    toggleLoading(false);
  }
}

// ✅ Event listener para o botão deletar
const btnDeletar = document.getElementById('deletar');
if (btnDeletar) {
  btnDeletar.addEventListener('click', deletarPerfumeAtual);
}