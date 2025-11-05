// script-form.js
import { auth, salvarPerfume, uploadFotoPerfume, buscarMarcas, salvarMarca } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";

const firebaseConfig = {
  apiKey: "AIzaSyCWuG4gVnf6r2JVBJX4k6a5kwM_Jf3cw8c",
  authDomain: "meus-pefumes.firebaseapp.com",
  projectId: "meus-pefumes",
  storageBucket: "meus-pefumes.firebasestorage.app",
  messagingSenderId: "5138203233",
  appId: "1:5138203233:web:b684d4397c4ffefa572020"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let usuarioAtual = null;
let marcasDisponiveis = [];

// Verifica se está em modo de edição
const urlParams = new URLSearchParams(window.location.search);
const perfumeId = urlParams.get('id');
const modoEdicao = urlParams.get('editar') === 'true';

console.log('Modo edição:', modoEdicao);
console.log('Perfume ID:', perfumeId);

// Verifica autenticação
onAuthStateChanged(auth, async (user) => {
  if (user) {
    usuarioAtual = user;
    console.log('Usuário logado:', user.email);
    
    // Carrega marcas existentes
    marcasDisponiveis = await buscarMarcas();
    console.log('Marcas carregadas:', marcasDisponiveis);
    inicializarAutocompleteMarca();
    
    // Se está em modo de edição, carrega os dados do perfume
    if (modoEdicao && perfumeId) {
      await carregarPerfumeParaEdicao();
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

// Sistema de autocomplete para marcas
function inicializarAutocompleteMarca() {
  const inputMarca = document.getElementById('marca');
  const datalistMarca = document.createElement('datalist');
  datalistMarca.id = 'marcas-list';
  
  // Adiciona todas as marcas no datalist
  marcasDisponiveis.forEach(marca => {
    const option = document.createElement('option');
    option.value = marca;
    datalistMarca.appendChild(option);
  });
  
  document.body.appendChild(datalistMarca);
  inputMarca.setAttribute('list', 'marcas-list');
  
  console.log('Autocomplete de marcas inicializado com', marcasDisponiveis.length, 'marcas');
}

// Função para atualizar a lista de marcas
function atualizarListaMarcas() {
  const datalistMarca = document.getElementById('marcas-list');
  if (datalistMarca) {
    // Limpa opções antigas
    datalistMarca.innerHTML = '';
    
    // Adiciona marcas atualizadas
    marcasDisponiveis.forEach(marca => {
      const option = document.createElement('option');
      option.value = marca;
      datalistMarca.appendChild(option);
    });
    
    console.log('Lista de marcas atualizada:', marcasDisponiveis.length, 'marcas');
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
  
  const tomInstance = new TomSelect(`#${id}`, {
    maxItems: null,
    create: false,
    sortField: { field: "text", direction: "asc" },
    placeholder: "Pesquise e selecione notas...",
    plugins: ["remove_button"],
    dropdownParent: 'body',
    onItemAdd: function() {
      this.setTextboxValue('');
      this.refreshOptions();
    },
    onInitialize: function() {
      console.log('TomSelect inicializado para:', id);
    }
  });
  
  console.log('TomSelect criado para', id);
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
});

// Sistema de estrelas SVG
function criarEstrelas(container) {
  const total = 5;
  let valorTemporario = 0;
  let valorSelecionado = 0;
  
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
  spanNota.textContent = '0.0';
  spanNota.style.marginLeft = '6px';
  spanNota.style.fontWeight = '600';
  spanNota.style.color = '#000';
  spanNota.style.display = 'inline-block';
  spanNota.style.minWidth = '30px';
  container.appendChild(spanNota);
  
  atualizar(0);
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

// Função para carregar perfume para edição
async function carregarPerfumeParaEdicao() {
  try {
    console.log('Carregando perfume para edição:', perfumeId);
    
    // Atualiza título da página
    document.title = 'Editar Perfume';
    const submitButton = document.getElementById('adicionar');
    submitButton.textContent = 'Salvar Alterações';
    submitButton.style.width = '130px'; // Aumenta largura
    
    const perfumeRef = doc(db, "perfumes", perfumeId);
    const perfumeSnap = await getDoc(perfumeRef);
    
    if (!perfumeSnap.exists()) {
      alert('Perfume não encontrado!');
      window.location.href = '../perfil/perfil.html';
      return;
    }
    
    const perfume = perfumeSnap.data();
    console.log('Perfume carregado:', perfume);
    
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
        statusRadio.dispatchEvent(new Event('change'));
      }
    }
    
    // Foto
    if (perfume.fotoURL) {
      const preview = document.getElementById('preview-foto');
      const textoFoto = document.getElementById('texto-foto');
      preview.src = perfume.fotoURL;
      preview.style.display = 'block';
      textoFoto.style.display = 'none';
      
      // Armazena URL antiga
      document.getElementById('foto-url').value = perfume.fotoURL;
    }
    
    // Notas - precisa aguardar TomSelect inicializar
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
      
      // Acordes
      if (perfume.acordes) {
        const acordesInstance = document.getElementById('acordes').tomselect;
        if (acordesInstance) {
          acordesInstance.setValue(perfume.acordes);
        }
      }
      
      // Força fechar todos os dropdowns após carregar
      setTimeout(() => {
        document.querySelectorAll('.ts-dropdown').forEach(dropdown => {
          dropdown.style.display = 'none';
        });
      }, 100);
    }, 500);
    
    // Avaliações - ANTES de criar as estrelas inicialmente
    if (perfume.avaliacoes) {
      // Define os valores no dataset IMEDIATAMENTE
      document.querySelector('[data-id="cheiro"]').dataset.valor = perfume.avaliacoes.cheiro || 0;
      document.querySelector('[data-id="projecao"]').dataset.valor = perfume.avaliacoes.projecao || 0;
      document.querySelector('[data-id="fixacao"]').dataset.valor = perfume.avaliacoes.fixacao || 0;
      document.querySelector('[data-id="versatilidade"]').dataset.valor = perfume.avaliacoes.versatilidade || 0;
      
      // Aguarda um pouco e recria as estrelas
      setTimeout(() => {
        document.querySelectorAll('.estrelas').forEach(container => {
          // Remove SVG antigo
          const svgAntigo = container.querySelector('svg');
          const spanAntigo = container.querySelector('.nota-valor');
          if (svgAntigo) svgAntigo.remove();
          if (spanAntigo) spanAntigo.remove();
          
          // Recria as estrelas (vai ler o dataset.valor atualizado)
          criarEstrelas(container);
        });
        
        atualizarMedia();
      }, 100); // Timeout menor
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
    console.error('Erro ao carregar perfume:', error);
    alert('Erro ao carregar perfume para edição!');
  }
}

// Handler do formulário (ATUALIZADO COM USERID E MODO EDIÇÃO)
document.getElementById('info-perfume').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  // Verifica se o usuário está logado
  if (!usuarioAtual) {
    alert('Você precisa estar logado!');
    window.location.href = '../login/login.html';
    return;
  }
  
  const submitButton = document.getElementById('adicionar');
  const textoOriginal = submitButton.textContent;
  submitButton.disabled = true;
  submitButton.textContent = modoEdicao ? 'Salvando...' : 'Salvando...';
  
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
      status: document.querySelector('input[name="status"]:checked')?.value || ''
    };
    
    // Salva a marca se for nova
    if (perfumeData.marca && perfumeData.marca.trim() !== '') {
      const marcaTrimmed = perfumeData.marca.trim();
      
      if (!marcasDisponiveis.includes(marcaTrimmed)) {
        console.log('Nova marca detectada:', marcaTrimmed);
        await salvarMarca(marcaTrimmed);
        
        // Adiciona à lista local
        marcasDisponiveis.push(marcaTrimmed);
        marcasDisponiveis.sort();
        
        // Atualiza o datalist
        atualizarListaMarcas();
        
        console.log('✅ Nova marca adicionada:', marcaTrimmed);
      } else {
        console.log('Marca já existe:', marcaTrimmed);
      }
    }
    
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
    
    const fotoInput = document.getElementById('foto');
    const fotoURL = document.getElementById('foto-url').value.trim();
    
    // Upload de nova foto ou mantém a antiga
    if (fotoInput.files.length > 0) {
      perfumeData.fotoURL = await uploadFotoPerfume(fotoInput.files[0], usuarioAtual.uid);
    } else if (fotoURL) {
      perfumeData.fotoURL = fotoURL;
    }
    
    if (modoEdicao && perfumeId) {
      // MODO EDIÇÃO - Atualiza perfume existente
      console.log('Atualizando perfume:', perfumeId);
      
      const perfumeRef = doc(db, "perfumes", perfumeId);
      await updateDoc(perfumeRef, perfumeData);
      
      alert('Perfume atualizado com sucesso!');
      window.location.href = `../perfumes/perfume.html?id=${perfumeId}`;
      
    } else {
      // MODO CRIAR - Salva novo perfume
      const id = await salvarPerfume(perfumeData, usuarioAtual.uid);
      
      alert('Perfume salvo com sucesso!');
      window.location.href = '../perfil/perfil.html';
    }
    
  } catch (error) {
    console.error('Erro ao salvar:', error);
    alert('Erro ao salvar perfume. Verifique o console.');
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = textoOriginal;
  }
});

// Botão cancelar
document.getElementById('cancelar').addEventListener('click', () => {
  if (confirm('Deseja cancelar? Todos os dados serão perdidos.')) {
    if (modoEdicao && perfumeId) {
      // Se estava editando, volta para página do perfume
      window.location.href = `../perfumes/perfume.html?id=${perfumeId}`;
    } else {
      // Se estava criando, volta para perfil
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