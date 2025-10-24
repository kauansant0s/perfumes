const notas = window.dadosNotas.notas;
const ids = ["topo", "coracao", "fundo"];
const tomInstances = {};

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
  });

  tomInstances[id] = tom;
  requestAnimationFrame(() => tom.focus());

  // fecha ao clicar fora
  const fechar = (e) => {
    if (!tom.wrapper.contains(e.target)) {
      tom.destroy();
      tomInstances[id] = null;

      // remove qualquer HTML residual e recria o select limpo
      const velhoWrapper = document.querySelector(`.ts-wrapper[id="${id}-ts-wrapper"]`);
      const antigoSelect = document.getElementById(id);
      const novoSelect = document.createElement("select");

      novoSelect.id = id;
      novoSelect.className = classesOriginais;
      if (estiloOriginal) novoSelect.setAttribute("style", estiloOriginal);

      // adiciona o "Selecione"
      const optionDefault = document.createElement("option");
      optionDefault.value = "";
      optionDefault.textContent = "Selecione";
      novoSelect.appendChild(optionDefault);

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
