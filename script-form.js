// script-form.js

// Notas importadas de notas.js
const notas = window.dadosNotas.notas;

// IDs dos selects
const ids = ["topo", "coracao", "fundo"];

// Função que ativa o Tom Select
function ativarTomSelect(id) {
  const select = document.getElementById(id);

  // Garante que não seja recriado várias vezes
  if (select.dataset.tomselectAtivo === "true") return;

  // Adiciona as opções se ainda não tiver
  if (select.options.length <= 1) {
    notas.forEach((nota) => {
      const option = document.createElement("option");
      option.value = nota;
      option.textContent = nota;
      select.appendChild(option);
    });
  }

  // Inicializa o Tom Select
  const tom = new TomSelect(`#${id}`, {
    maxItems: null,
    create: false,
    sortField: { field: "text", direction: "asc" },
    placeholder: "Pesquise uma nota...",
    plugins: ["remove_button"],
  });

  select.dataset.tomselectAtivo = "true";

  // Foca automaticamente no campo de busca
  setTimeout(() => tom.focus(), 50);

  // Remove quando clicar fora
  document.addEventListener("click", (e) => {
    if (!tom.wrapper.contains(e.target)) {
      tom.destroy(); // Remove TomSelect
      select.dataset.tomselectAtivo = "false";
    }
  }, { once: true });
}

// Ativa TomSelect ao clicar no select
ids.forEach((id) => {
  const select = document.getElementById(id);
  select.addEventListener("mousedown", (e) => {
    e.preventDefault(); // Evita abrir o select padrão
    ativarTomSelect(id);
  });
});
