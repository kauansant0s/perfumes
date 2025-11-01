// script-form.js
import { salvarPerfume, uploadFotoPerfume } from './firebase-config.js';

const notas = window.dadosNotas.notas;
const ids = ["topo", "coracao", "fundo"];

// Lista de acordes
const acordes = [
  'Abaunilhado', 'Aldeídico', 'Alcoólico', 'Almiscarado', 'Ambarado',
  'Amadeirado', 'Animálico', 'Aquático', 'Aromático', 'Atalcado',
  'Chipre', 'Cítrico', 'Couro', 'Cremoso', 'Esfumaçado',
  'Especiado', 'Floral', 'Floral Amarelo', 'Floral Branco', 'Fougère',
  'Fresco', 'Frutado', 'Gourmand', 'Lactônico',
  'Metálico', 'Oriental', 'Terroso', 'Tropical', 'Verde'
];

// Popular select de acordes
const acordesSelect = document.getElementById('acordes');
acordes.sort(); // Ordena alfabeticamente
acordes.forEach(acorde => {
  const option = document.createElement('option');
  option.value = acorde;
  option.textContent = acorde;
  acordesSelect.appendChild(option);
});

// Inicializa TomSelect para acordes (igual às notas)
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

// Força a largura do wrapper do TomSelect de acordes
acordesInstance.wrapper.style.width = '93%';
acordesInstance.wrapper.style.marginBottom = '10px';

// Inicializa TomSelect SIMPLES - só uma vez, sem destruir
ids.forEach((id) => {
  const select = document.getElementById(id);
  
  // Limpa o select
  select.innerHTML = '';
  
  // Adiciona todas as notas
  notas.forEach((nota) => {
    const option = document.createElement("option");
    option.value = nota;
    option.textContent = nota;
    select.appendChild(option);
  });
  
  // Inicializa TomSelect e MANTÉM (não destrói nunca)
  const tomInstance = new TomSelect(`#${id}`, {
    maxItems: null,
    create: false,
    sortField: { field: "text", direction: "asc" },
    placeholder: "Pesquise e selecione notas...",
    plugins: ["remove_button"],
    dropdownParent: 'body',
    onItemAdd: function() {
      this.setTextboxValue(''); // Limpa o texto após adicionar
      this.refreshOptions();
    },
    onInitialize: function() {
      console.log('TomSelect inicializado para:', id);
      console.log('Número de opções:', this.options);
    },
    onDropdownOpen: function() {
      console.log('Dropdown aberto para:', id);
      console.log('Dropdown element:', this.dropdown);
    }
  });
  
  console.log('TomSelect criado para', id, '- Total de notas:', tomInstance.options);
});

// Mostrar campo de avaliação quando selecionar "Tenho" ou "Já tive"
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

// Sistema de estrelas SVG com suporte a frações
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

// Handler do formulário
document.getElementById('info-perfume').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const submitButton = document.getElementById('adicionar');
  submitButton.disabled = true;
  submitButton.textContent = 'Salvando...';
  
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
      status: document.querySelector('input[name="status"]:checked')?.value || '',
      dataCriacao: new Date().toISOString()
    };
    
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
    
    if (fotoInput.files.length > 0) {
      perfumeData.fotoURL = await uploadFotoPerfume(fotoInput.files[0]);
    } else if (fotoURL) {
      perfumeData.fotoURL = fotoURL;
    }
    
    const id = await salvarPerfume(perfumeData);
    
    alert('Perfume salvo com sucesso!');
    window.location.reload();
    
  } catch (error) {
    console.error('Erro ao salvar:', error);
    alert('Erro ao salvar perfume. Verifique o console.');
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = 'Adicionar';
  }
});

// Botão cancelar
document.getElementById('cancelar').addEventListener('click', () => {
  if (confirm('Deseja cancelar? Todos os dados serão perdidos.')) {
    window.location.reload();
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