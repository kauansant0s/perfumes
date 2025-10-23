// script-form.js

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
