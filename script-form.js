// script-form.js
import { salvarPerfume, uploadFotoPerfume } from './firebase-config.js';

const notas = window.dadosNotas.notas;
const ids = ["topo", "coracao", "fundo"];
window.tomInstances = {}; // Torna global para acessar no submit
const tomInstances = window.tomInstances;

function criarOptions(select) {
  if (select.options.length <= 1) {
    notas.forEach((nota) => {
      const option = document.createElement("option");
      option.value = nota;
      option.textContent = nota;
      select.appendChild(option);
    });
  }
}

function ativarTomSelect(id) {
  const originalSelect = document.getElementById(id);

  // se já tem um TomSelect ativo, só foca
  if (tomInstances[id]) {
    tomInstances[id].focus();
    return;
  }

  // salva atributos originais
  const estiloOriginal = originalSelect.getAttribute("style") || "";
  const classesOriginais = originalSelect.className;

  criarOptions(originalSelect);

  // inicializa TomSelect
  const tom = new TomSelect(`#${id}`, {
    maxItems: null,
    create: false,
    sortField: { field: "text", direction: "asc" },
    placeholder: "Pesquise uma nota...",
    plugins: ["remove_button"],
    onItemAdd: function() {
      this.setTextboxValue(''); // Limpa o texto digitado ao adicionar
      this.refreshOptions();
    }
  });

  tomInstances[id] = tom;
  requestAnimationFrame(() => tom.focus());

  // fecha ao clicar fora
  const fechar = (e) => {
    if (!tom.wrapper.contains(e.target)) {
      // Salva os valores selecionados antes de destruir
      const valoresSelecionados = tom.getValue();
      
      tom.destroy();
      tomInstances[id] = null;

      // Recria o select e adiciona as opções selecionadas
      const antigoSelect = document.getElementById(id);
      const novoSelect = document.createElement("select");

      novoSelect.id = id;
      novoSelect.className = classesOriginais;
      if (estiloOriginal) novoSelect.setAttribute("style", estiloOriginal);

      // Adiciona o "Selecione"
      const optionDefault = document.createElement("option");
      optionDefault.value = "";
      optionDefault.textContent = "Selecione";
      novoSelect.appendChild(optionDefault);

      // Adiciona as opções que foram selecionadas
      if (Array.isArray(valoresSelecionados)) {
        valoresSelecionados.forEach(valor => {
          const option = document.createElement("option");
          option.value = valor;
          option.textContent = valor;
          option.selected = true;
          novoSelect.appendChild(option);
        });
      }

      antigoSelect.replaceWith(novoSelect);
      adicionarEvento(novoSelect, id);

      document.removeEventListener("mousedown", fechar);
    }
  };

  document.addEventListener("mousedown", fechar);
}

function adicionarEvento(select, id) {
  select.addEventListener("focus", () => ativarTomSelect(id));
  select.addEventListener("mousedown", (e) => {
    if (tomInstances[id]) e.preventDefault();
  });
}

// inicializa
ids.forEach((id) => {
  const select = document.getElementById(id);
  adicionarEvento(select, id);
});

// Mostrar campo de avaliação quando selecionar "Tenho" ou "Já tive"
document.querySelectorAll('input[name="status"]').forEach(radio => {
  radio.addEventListener('change', e => {
    const avaliacao = document.getElementById('avaliacao');
    
    if (e.target.value === 'tenho' || e.target.value === 'ja-tive') {
      // Mostra o container
      avaliacao.style.display = 'block';
      avaliacao.classList.remove('fechando');
      
      // Adiciona classe para estado inicial (tudo escondido)
      avaliacao.classList.add('animando');
      
      // Remove no próximo frame para iniciar a animação
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          avaliacao.classList.remove('animando');
          avaliacao.classList.add('show');
        });
      });
    } else {
      // Animação reversa ao fechar
      avaliacao.classList.remove('show');
      avaliacao.classList.add('fechando');
      
      // Esconde após a animação reversa
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
  
  // Cria defs para gradientes
  const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
  svg.appendChild(defs);

  // Cria as 5 estrelas
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
    
    // Arredonda para 0.5
    const valorArredondado = Math.round(valor * 2) / 2;
    
    // Atualiza o texto da nota ao lado (em tempo real)
    const spanNota = container.querySelector('.nota-valor');
    if (spanNota) {
      spanNota.textContent = valorArredondado.toFixed(1);
    }
    
    // Limpa gradientes antigos
    defs.innerHTML = "";
    
    estrelas.forEach((star, i) => {
      const preenchimento = Math.min(1, Math.max(0, valorArredondado - i));
      
      if (preenchimento === 0) {
        star.setAttribute("fill", "#ccc");
      } else if (preenchimento === 1) {
        star.setAttribute("fill", "#FFD700");
      } else {
        // Cria gradiente para estrela parcial
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
  
  // Adiciona span para mostrar a nota
  const spanNota = document.createElement('span');
  spanNota.className = 'nota-valor';
  spanNota.textContent = '0.0';
  spanNota.style.marginLeft = '6px';
  spanNota.style.fontWeight = '600';
  spanNota.style.color = '#000';
  spanNota.style.display = 'inline-block';
  spanNota.style.minWidth = '30px';
  container.appendChild(spanNota);
  
  // Inicializa com valor zero
  atualizar(0);
}

// Cria estrelas para todos os campos
document.querySelectorAll('.estrelas').forEach(criarEstrelas);

// Atualiza média automaticamente
function atualizarMedia() {
  const elementos = document.querySelectorAll('.estrelas');
  const valores = Array.from(elementos).map(el => parseFloat(el.dataset.valor || 0));
  
  // Só calcula se todas as 4 notas foram dadas (valor > 0)
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
    // Coleta dados do formulário
    const perfumeData = {
      nome: document.getElementById('nome').value,
      marca: document.getElementById('marca').value,
      notas: {
        topo: Array.from(document.getElementById('topo').selectedOptions).map(opt => opt.value).filter(v => v),
        coracao: Array.from(document.getElementById('coracao').selectedOptions).map(opt => opt.value).filter(v => v),
        fundo: Array.from(document.getElementById('fundo').selectedOptions).map(opt => opt.value).filter(v => v)
      },
      acordes: document.getElementById('acordes').value,
      perfumista: document.getElementById('perfumista').value,
      descricao: document.getElementById('descricao').value,
      review: {
        titulo: document.getElementById('titulo').value,
        texto: document.getElementById('review').value
      },
      status: document.querySelector('input[name="status"]:checked')?.value || '',
      dataCriacao: new Date().toISOString()
    };
    
    // Se marcou "tenho" ou "já tive", adiciona avaliações
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
    
    // Upload da foto se existir
    const fotoInput = document.getElementById('foto');
    const fotoURL = document.getElementById('foto-url').value.trim();
    
    if (fotoInput.files.length > 0) {
      // Faz upload do arquivo
      perfumeData.fotoURL = await uploadFotoPerfume(fotoInput.files[0]);
    } else if (fotoURL) {
      // Usa a URL fornecida
      perfumeData.fotoURL = fotoURL;
    }
    
    // Salva no Firebase
    const id = await salvarPerfume(perfumeData);
    
    alert('Perfume salvo com sucesso!');
    
    // Limpa o formulário
    document.getElementById('info-perfume').reset();
    document.getElementById('avaliacao').style.display = 'none';
    document.getElementById('preview-foto').style.display = 'none';
    document.getElementById('texto-foto').style.display = 'block';
    document.getElementById('foto-url').value = '';
    document.querySelectorAll('.estrelas').forEach(el => {
      el.dataset.valor = 0;
      el.querySelector('.nota-valor').textContent = '0.0';
    });
    
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

// Abrir modal ao clicar no quadrado
quadrado.addEventListener('click', () => {
  modal.style.display = 'flex';
});

// Fechar modal
document.getElementById('btn-cancelar-modal').addEventListener('click', () => {
  modal.style.display = 'none';
});

// Opção: Upload de arquivo
document.getElementById('btn-upload').addEventListener('click', () => {
  modal.style.display = 'none';
  fotoInput.click();
});

// Opção: Link da imagem
document.getElementById('btn-link').addEventListener('click', () => {
  modal.style.display = 'none';
  containerUrl.style.display = 'block';
  fotoUrlInput.focus();
});

// Preview ao selecionar arquivo
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

// Confirmar URL
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