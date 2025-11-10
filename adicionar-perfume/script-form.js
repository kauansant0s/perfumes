// script-form.js - COMPLETO COM CORREÇÕES
import { auth, salvarPerfume, uploadFotoPerfume, buscarMarcas, salvarMarca, buscarPerfumes, invalidarCachePerfumes, buscarPerfumePorId } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { toggleLoading, tratarErroFirebase } from './utils.js';

const db = getFirestore();

let usuarioAtual = null;
let marcasDisponiveis = [];
let perfumeOriginalInstance = null;

// ✅ NOVO: Sistema de continuidade para contratipos
let contratipoEmCadastro = false;
let perfumeContratipoId = null; // ID do perfume contratipo que está sendo editado/cadastrado

// Verifica se está em modo de edição
const urlParams = new URLSearchParams(window.location.search);
const perfumeId = urlParams.get('id');
const modoEdicao = urlParams.get('editar') === 'true';

// ✅ NOVO: Verifica se está voltando de cadastro de perfume original
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
    
    toggleLoading(true);
    
    try {
      // Carrega marcas existentes
      marcasDisponiveis = await buscarMarcas();
      console.log(`✅ ${marcasDisponiveis.length} marcas carregadas`);
      inicializarAutocompleteMarca();
      
      // Inicializa TomSelect de perfume original
      await inicializarSelectPerfumeOriginal();
      
      // ✅ PRIORIDADE 1: Se voltou de cadastrar perfume original
      if (voltandoDeOriginal === 'true' && perfumeOriginalRecemCadastrado && dadosContratipoSalvos) {
        console.log('🔄 Restaurando dados do contratipo...');
        await restaurarDadosContratipo(perfumeOriginalRecemCadastrado, dadosContratipoSalvos);
        
        // Limpa sessionStorage
        sessionStorage.removeItem('cadastrandoPerfumeOriginal');
        sessionStorage.removeItem('ultimoPerfumeCadastrado');
        sessionStorage.removeItem('dadosContratipoTemp');
      }
      // Se está em modo de edição normal, carrega os dados do perfume
      else if (modoEdicao && perfumeId) {
        await carregarPerfumeParaEdicao();
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

// Lista de acordes
const acordes = [
  'Abaunilhado', 'Aldeídico', 'Alcoólico', 'Almiscarado', 'Ambarado',
  'Amadeirado', 'Animálico', 'Aquático', 'Aromático', 'Atalcado',
  'Chipre', 'Cítrico', 'Couro', 'Cremoso', 'Doce', 'Esfumaçado',
  'Especiado', 'Floral', 'Floral Amarelo', 'Floral Branco', 'Fougère',
  'Fresco', 'Frutado', 'Gourmand', 'Lactônico',
  'Metálico', 'Oriental', 'Terroso', 'Tropical', 'Verde'
];

// Popular select de acordes
const acordesSelect = document.getElementById('acordes');
acordes.sort();
acordes.forEach(acorde => {
  const option = document.createElement('option');
  option.value = acorde;
  option.textContent = acorde;
  acordesSelect.appendChild(option);
});

// Inicializa TomSelect para acordes
const acordesInstance = new TomSelect('#acordes', {
  maxItems: null,
  create: false,
  sortField: { field: "text", direction: "asc" },
  placeholder: "Pesquise e selecione acordes...",
  plugins: ["remove_button"],
  dropdownParent: 'body',
  onItemAdd: function() {
    this.setTextboxValue('');
    this.refreshOptions();
  }
});

acordesInstance.wrapper.style.width = '93%';
acordesInstance.wrapper.style.marginBottom = '10px';

/**
 * Inicializa autocomplete de marcas
 */
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

/**
 * Inicializa TomSelect para perfume original
 */
async function inicializarSelectPerfumeOriginal() {
  try {
    const perfumes = await buscarPerfumes(usuarioAtual.uid, true);
    
    const selectPerfume = document.getElementById('perfume-original');
    selectPerfume.innerHTML = '<option value="">Selecione o perfume original...</option>';
    
    // Adiciona opção de cadastrar novo
    const optionNovo = document.createElement('option');
    optionNovo.value = '__CADASTRAR_NOVO__';
    optionNovo.textContent = '+ Cadastrar novo perfume';
    selectPerfume.appendChild(optionNovo);
    
    // Adiciona perfumes cadastrados
    perfumes.forEach(perfume => {
      const option = document.createElement('option');
      option.value = perfume.id; // ✅ Agora usa o ID
      option.textContent = `${perfume.nome} - ${perfume.marca}`;
      option.dataset.perfumeId = perfume.id;
      selectPerfume.appendChild(option);
    });
    
    // Destroi instância antiga se existir
    if (perfumeOriginalInstance) {
      perfumeOriginalInstance.destroy();
    }
    
    // Cria TomSelect
    perfumeOriginalInstance = new TomSelect('#perfume-original', {
      create: false,
      sortField: { field: "text", direction: "asc" },
      placeholder: "Selecione o perfume original...",
      plugins: [],
      dropdownParent: 'body',
      maxOptions: null,
      onChange: function(value) {
        if (value === '__CADASTRAR_NOVO__') {
          salvarDadosAtuaisEIrParaOriginal();
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

/**
 * ✅ NOVO: Salva dados atuais e vai para cadastro de perfume original
 */
function salvarDadosAtuaisEIrParaOriginal() {
  console.log('💾 Salvando dados atuais antes de cadastrar perfume original...');
  
  // Captura todos os dados do formulário atual
  const dadosAtuais = {
    nome: document.getElementById('nome').value,
    marca: document.getElementById('marca').value,
    perfumista: document.getElementById('perfumista').value,
    tituloReview: document.getElementById('titulo').value,
    textoReview: document.getElementById('review').value,
    status: document.querySelector('input[name="status"]:checked')?.value || '',
    fotoURL: document.getElementById('foto-url').value,
    contratipoEh: document.getElementById('contratipo-sim').checked,
    // Notas
    notasTopo: Array.from(document.getElementById('topo').selectedOptions).map(opt => opt.value),
    notasCoracao: Array.from(document.getElementById('coracao').selectedOptions).map(opt => opt.value),
    notasFundo: Array.from(document.getElementById('fundo').selectedOptions).map(opt => opt.value),
    // Acordes
    acordes: Array.from(document.getElementById('acordes').selectedOptions).map(opt => opt.value),
    // Avaliações
    avaliacaoCheiro: document.querySelector('[data-id="cheiro"]')?.dataset.valor || '0',
    avaliacaoProjecao: document.querySelector('[data-id="projecao"]')?.dataset.valor || '0',
    avaliacaoFixacao: document.querySelector('[data-id="fixacao"]')?.dataset.valor || '0',
    avaliacaoVersatilidade: document.querySelector('[data-id="versatilidade"]')?.dataset.valor || '0',
    // Características
    clima: document.querySelector('.slider-clima')?.value || '50',
    ambiente: document.querySelector('.slider-ambiente')?.value || '50',
    genero: document.querySelector('.slider-genero')?.value || '50',
    hora: document.querySelector('.slider-hora')?.value || '50',
    // Modo
    modoEdicao: modoEdicao,
    perfumeId: perfumeId
  };
  
  // Salva no sessionStorage
  sessionStorage.setItem('dadosContratipoTemp', JSON.stringify(dadosAtuais));
  sessionStorage.setItem('cadastrandoPerfumeOriginal', 'true');
  
  // Redireciona para cadastro
  window.location.href = 'form-add-perf.html';
}

/**
 * ✅ NOVO: Restaura dados do contratipo após cadastrar perfume original
 */
async function restaurarDadosContratipo(perfumeOriginalId, dadosJSON) {
  try {
    const dados = JSON.parse(dadosJSON);
    
    console.log('🔄 Restaurando dados:', dados);
    
    // Restaura campos básicos
    document.getElementById('nome').value = dados.nome || '';
    document.getElementById('marca').value = dados.marca || '';
    document.getElementById('perfumista').value = dados.perfumista || '';
    document.getElementById('titulo').value = dados.tituloReview || '';
    document.getElementById('review').value = dados.textoReview || '';
    document.getElementById('foto-url').value = dados.fotoURL || '';
    
    // Restaura foto se houver
    if (dados.fotoURL) {
      const preview = document.getElementById('preview-foto');
      const textoFoto = document.getElementById('texto-foto');
      preview.src = dados.fotoURL;
      preview.style.display = 'block';
      textoFoto.style.display = 'none';
    }
    
    // Restaura status
    if (dados.status) {
      const statusRadio = document.querySelector(`input[value="${dados.status}"]`);
      if (statusRadio) {
        statusRadio.checked = true;
        statusRadio.dispatchEvent(new Event('change'));
      }
    }
    
    // ✅ Marca como contratipo e seleciona o perfume original
    document.getElementById('contratipo-sim').checked = true;
    document.getElementById('campo-perfume-original').classList.add('mostrar');
    
    // Aguarda um pouco para garantir que o TomSelect foi inicializado
    setTimeout(() => {
      if (perfumeOriginalInstance) {
        perfumeOriginalInstance.setValue(perfumeOriginalId);
        console.log('✅ Perfume original selecionado:', perfumeOriginalId);
      }
    }, 800);
    
    // Restaura notas e acordes após um delay (TomSelect precisa inicializar)
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
    
    // Restaura avaliações
    if (dados.status === 'tenho' || dados.status === 'ja-tive') {
      setTimeout(() => {
        document.querySelector('[data-id="cheiro"]').dataset.valor = dados.avaliacaoCheiro;
        document.querySelector('[data-id="projecao"]').dataset.valor = dados.avaliacaoProjecao;
        document.querySelector('[data-id="fixacao"]').dataset.valor = dados.avaliacaoFixacao;
        document.querySelector('[data-id="versatilidade"]').dataset.valor = dados.avaliacaoVersatilidade;
        
        // Recria estrelas
        document.querySelectorAll('.estrelas').forEach(container => {
          const svgAntigo = container.querySelector('svg');
          const spanAntigo = container.querySelector('.nota-valor');
          if (svgAntigo) svgAntigo.remove();
          if (spanAntigo) spanAntigo.remove();
          
          criarEstrelas(container);
        });
        
        atualizarMedia();
      }, 1200);
      
      // Restaura características
      document.querySelector('.slider-clima').value = dados.clima;
      document.querySelector('.slider-ambiente').value = dados.ambiente;
      document.querySelector('.slider-genero').value = dados.genero;
      document.querySelector('.slider-hora').value = dados.hora;
    }
    
    // Se estava em modo edição, restaura isso
    if (dados.modoEdicao && dados.perfumeId) {
      document.title = 'Editar Perfume';
      const submitButton = document.getElementById('adicionar');
      submitButton.textContent = 'Salvar Alterações';
      submitButton.style.width = '130px';
    }
    
    console.log('✅ Todos os dados restaurados!');
    alert('✅ Perfume original cadastrado! Continue editando o contratipo.');
    
  } catch (error) {
    console.error('❌ Erro ao restaurar dados:', error);
    alert('Erro ao restaurar dados. Por favor, preencha novamente.');
  }
}

/**
 * Atualiza lista de marcas
 */
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

// Inicializa TomSelect para notas
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

// ✅ CORREÇÃO: Inicializa o dataset de todos os radios
document.querySelectorAll('input[name="status"]').forEach(radio => {
  radio.dataset.checked = 'false'; // Inicia todos como false
});

// Mostrar campo de avaliação
document.querySelectorAll('input[name="status"]').forEach(radio => {
  radio.addEventListener('change', e => {
    const avaliacao = document.getElementById('avaliacao');
    
    if (e.target.value === 'tenho' || e.target.value === 'ja-tive') {
      avaliacao.style.display = 'block';
      avaliacao.classList.remove('fechando');
      avaliacao.classList.add('animando');
      
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          avaliacao.classList.remove('animando');
          avaliacao.classList.add('show');
        });
      });
    } else {
      avaliacao.classList.remove('show');
      avaliacao.classList.add('fechando');
      
      setTimeout(() => {
        avaliacao.style.display = 'none';
        avaliacao.classList.remove('fechando');
      }, 600);
    }
  });
  
  // ✅ NOVO: Permite desmarcar clicando novamente
  radio.addEventListener('click', e => {
    // Se já estava marcado, desmarca
    if (e.target.dataset.checked === 'true') {
      e.target.checked = false;
      e.target.dataset.checked = 'false';
      
      // Esconde avaliação se estiver visível
      const avaliacao = document.getElementById('avaliacao');
      if (avaliacao.style.display !== 'none') {
        avaliacao.classList.remove('show');
        avaliacao.classList.add('fechando');
        
        setTimeout(() => {
          avaliacao.style.display = 'none';
          avaliacao.classList.remove('fechando');
        }, 600);
      }
      
      e.preventDefault();
    } else {
      // Marca todos como false
      document.querySelectorAll('input[name="status"]').forEach(r => {
        r.dataset.checked = 'false';
      });
      // Marca este como true
      e.target.dataset.checked = 'true';
    }
  });
});

// Mostrar/ocultar campo "De qual perfume"
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

// SISTEMA DE ESTRELAS - continua no próximo comentário...

//Cria sistema de estrelas
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

// Inicializa estrelas
document.querySelectorAll('.estrelas').forEach(criarEstrelas);

/**
 * Atualiza média das avaliações
 */
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

/**
 * Carrega perfume para edição
 */
async function carregarPerfumeParaEdicao() {
  try {
    console.log('📡 Carregando perfume para edição:', perfumeId);
    
    document.title = 'Editar Perfume';
    const submitButton = document.getElementById('adicionar');
    submitButton.textContent = 'Salvar Alterações';
    submitButton.style.width = '130px';
    
    const perfumeRef = doc(db, "perfumes", perfumeId);
    const perfumeSnap = await getDoc(perfumeRef);
    
    if (!perfumeSnap.exists()) {
      alert('Perfume não encontrado!');
      window.location.href = '../perfil/perfil.html';
      return;
    }
    
    const perfume = perfumeSnap.data();
    console.log('✅ Perfume carregado:', perfume.nome);
    
    // Preenche os campos
    document.getElementById('nome').value = perfume.nome || '';
    document.getElementById('marca').value = perfume.marca || '';
    document.getElementById('perfumista').value = perfume.perfumista || '';
    
    // Review
    if (perfume.review) {
      document.getElementById('titulo').value = perfume.review.titulo || '';
      document.getElementById('review').value = perfume.review.texto || '';
    }
    
    // Status
    if (perfume.status) {
      const statusRadio = document.querySelector(`input[value="${perfume.status}"]`);
      if (statusRadio) {
        statusRadio.checked = true;
        statusRadio.dataset.checked = 'true'; // ✅ NOVO: Marca o dataset
        statusRadio.dispatchEvent(new Event('change'));
      }
    } else {
      // ✅ NOVO: Se não tem status, garante que todos estão desmarcados
      document.querySelectorAll('input[name="status"]').forEach(r => {
        r.checked = false;
        r.dataset.checked = 'false';
      });
    }
    
    // Contratipo
    if (perfume.contratipo) {
      if (perfume.contratipo.eh) {
        document.getElementById('contratipo-sim').checked = true;
        document.getElementById('campo-perfume-original').classList.add('mostrar');
        
        setTimeout(() => {
          if (perfumeOriginalInstance && perfume.contratipo.perfumeOriginal) {
            // ✅ Usa o ID do perfume original
            perfumeOriginalInstance.setValue(perfume.contratipo.perfumeOriginal);
          }
        }, 500);
      } else {
        document.getElementById('contratipo-nao').checked = true;
        document.getElementById('campo-perfume-original').classList.remove('mostrar');
      }
    }
    
    // Foto
    if (perfume.fotoURL) {
      const preview = document.getElementById('preview-foto');
      const textoFoto = document.getElementById('texto-foto');
      preview.src = perfume.fotoURL;
      preview.style.display = 'block';
      textoFoto.style.display = 'none';
      document.getElementById('foto-url').value = perfume.fotoURL;
    }
    
    // Notas e Acordes
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
        }
      }
      
      setTimeout(() => {
        document.querySelectorAll('.ts-dropdown').forEach(dropdown => {
          dropdown.style.display = 'none';
        });
      }, 100);
    }, 500);
    
    // Avaliações
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
    
    // Características (sliders)
    if (perfume.caracteristicas) {
      document.querySelector('.slider-clima').value = perfume.caracteristicas.clima || 50;
      document.querySelector('.slider-ambiente').value = perfume.caracteristicas.ambiente || 50;
      document.querySelector('.slider-genero').value = perfume.caracteristicas.genero || 50;
      document.querySelector('.slider-hora').value = perfume.caracteristicas.hora || 50;
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
  
  try {
    const perfumeData = {
      nome: document.getElementById('nome').value,
      marca: document.getElementById('marca').value,
      notas: {
        topo: Array.from(document.getElementById('topo').selectedOptions).map(opt => opt.value).filter(v => v),
        coracao: Array.from(document.getElementById('coracao').selectedOptions).map(opt => opt.value).filter(v => v),
        fundo: Array.from(document.getElementById('fundo').selectedOptions).map(opt => opt.value).filter(v => v)
      },
      acordes: Array.from(document.getElementById('acordes').selectedOptions).map(opt => opt.value).filter(v => v),
      perfumista: document.getElementById('perfumista').value,
      review: {
        titulo: document.getElementById('titulo').value,
        texto: document.getElementById('review').value
      },
      status: document.querySelector('input[name="status"]:checked')?.value || '' // ✅ Permite vazio
    };
    
    // Contratipo
    const contratipoSelecionado = document.querySelector('input[name="contratipo"]:checked')?.value;
    if (contratipoSelecionado === 'sim') {
      const perfumeOriginalId = perfumeOriginalInstance ? perfumeOriginalInstance.getValue() : '';
      
      if (perfumeOriginalId && perfumeOriginalId !== '__CADASTRAR_NOVO__') {
        perfumeData.contratipo = {
          eh: true,
          perfumeOriginal: perfumeOriginalId // ✅ Salva o ID
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
    
    // Salva a marca se for nova
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
    
    // Avaliações e características
    if (perfumeData.status === 'tenho' || perfumeData.status === 'ja-tive') {
      perfumeData.avaliacoes = {
        cheiro: parseFloat(document.querySelector('[data-id="cheiro"]').dataset.valor || 0),
        projecao: parseFloat(document.querySelector('[data-id="projecao"]').dataset.valor || 0),
        fixacao: parseFloat(document.querySelector('[data-id="fixacao"]').dataset.valor || 0),
        versatilidade: parseFloat(document.querySelector('[data-id="versatilidade"]').dataset.valor || 0),
        media: parseFloat(document.getElementById('media').textContent || 0)
      };
      
      perfumeData.caracteristicas = {
        clima: document.querySelector('.slider-clima').value,
        ambiente: document.querySelector('.slider-ambiente').value,
        genero: document.querySelector('.slider-genero').value,
        hora: document.querySelector('.slider-hora').value
      };
    }
    
    // Upload de foto
    const fotoInput = document.getElementById('foto');
    const fotoURL = document.getElementById('foto-url').value.trim();
    
    if (fotoInput.files.length > 0) {
      perfumeData.fotoURL = await uploadFotoPerfume(fotoInput.files[0], usuarioAtual.uid);
    } else if (fotoURL) {
      perfumeData.fotoURL = fotoURL;
    }
    
    // Salva ou atualiza
    if (modoEdicao && perfumeId) {
      console.log('📝 Atualizando perfume:', perfumeId);
      
      const perfumeRef = doc(db, "perfumes", perfumeId);
      await updateDoc(perfumeRef, perfumeData);
      
      invalidarCachePerfumes(usuarioAtual.uid);
      
      alert('✅ Perfume atualizado com sucesso!');
      window.location.href = `../perfumes/perfume.html?id=${perfumeId}`;
      
    } else {
      const id = await salvarPerfume(perfumeData, usuarioAtual.uid);
      
      // ✅ NOVO: Se estava cadastrando perfume original, salva o ID
      if (sessionStorage.getItem('cadastrandoPerfumeOriginal') === 'true') {
        sessionStorage.setItem('ultimoPerfumeCadastrado', id);
      }
      
      invalidarCachePerfumes(usuarioAtual.uid);
      
      alert('✅ Perfume salvo com sucesso!');
      
      // ✅ Se estava cadastrando perfume original, volta para o contratipo
      if (sessionStorage.getItem('cadastrandoPerfumeOriginal') === 'true') {
        window.location.href = 'form-add-perf.html';
      } else {
        window.location.href = '../perfil/perfil.html';
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

// Botão cancelar
document.getElementById('cancelar').addEventListener('click', () => {
  if (confirm('Deseja cancelar? Todos os dados serão perdidos.')) {
    // ✅ Limpa dados temporários se houver
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