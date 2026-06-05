// exportar-excel.js - Módulo reutilizável de exportação para Excel
// Uso: import { inicializarExportar } from './exportar-excel.js';
//      inicializarExportar(() => perfumesData);

const COLUNAS_EXPORTAR = [
  { id: 'nome',          label: 'Nome'             },
  { id: 'marca',         label: 'Marca'            },
  { id: 'linha',         label: 'Linha'            },
  { id: 'status',        label: 'Status'           },
  { id: 'media',         label: 'Nota média'       },
  { id: 'cheiro',        label: 'Cheiro'           },
  { id: 'projecao',      label: 'Projeção'         },
  { id: 'fixacao',       label: 'Fixação'          },
  { id: 'versatilidade', label: 'Versatilidade'    },
  { id: 'acordes',       label: 'Acordes'          },
  { id: 'notasTopo',     label: 'Notas de topo'    },
  { id: 'notasCoracao',  label: 'Notas de coração' },
  { id: 'notasFundo',    label: 'Notas de fundo'   },
  { id: 'perfumista',    label: 'Perfumista'       },
  { id: 'genero',        label: 'Gênero'           },
  { id: 'clima',         label: 'Clima'            },
  { id: 'ambiente',      label: 'Ambiente'         },
  { id: 'hora',          label: 'Hora do dia'      },
  { id: 'contratipo',    label: 'É contratipo?'    },
  { id: 'linkCompra',    label: 'Link de compra'   },
  { id: 'review',        label: 'Review'           },
];

const STATUS_LABELS   = { 'tenho': 'Tenho', 'ja-tive': 'Já tive', 'quero-ter': 'Quero ter', '': '-' };
const GENERO_LABELS   = { 'masculino': 'Masculino', 'um-pouco-masculino': 'Um pouco masculino', 'compartilhavel': 'Compartilhável', 'um-pouco-feminino': 'Um pouco feminino', 'feminino': 'Feminino' };
const HORA_LABELS     = { '0': 'Noturno', '25': 'Um pouco mais noturno', '50': 'Versátil', '75': 'Um pouco mais diurno', '100': 'Diurno' };
const CLIMA_LABELS    = { '0': 'Frio', '25': 'Um pouco mais frio', '50': 'Versátil', '75': 'Um pouco mais quente', '100': 'Calor' };
const AMBIENTE_LABELS = { '0': 'Informal', '25': 'Um pouco mais informal', '50': 'Versátil', '75': 'Um pouco mais formal', '100': 'Formal' };

const modalExportar = document.getElementById('modal-exportar');

function abrirModalExportar(e) {
  e.preventDefault();
  document.getElementById('menu-lateral')?.classList.remove('aberto');
  document.getElementById('menu-overlay')?.classList.remove('ativo');
  irParaEtapa1();
  modalExportar.style.display = 'flex';
}

function fecharModalExportar() {
  modalExportar.style.display = 'none';
}

function irParaEtapa1() {
  document.getElementById('exportar-etapa-1').style.display = 'block';
  document.getElementById('exportar-etapa-2').style.display = 'none';
  document.getElementById('btn-confirmar-exportar').style.display = 'none';
  document.querySelectorAll('input[name="filtro-exportar"]').forEach(r => r.checked = false);
}

function irParaEtapa2() {
  document.getElementById('exportar-etapa-1').style.display = 'none';
  document.getElementById('exportar-etapa-2').style.display = 'block';
  document.getElementById('btn-confirmar-exportar').style.display = 'flex';

  const filtroAtual = document.querySelector('input[name="filtro-exportar"]:checked')?.value || 'todos';

  const grid = document.getElementById('exportar-colunas-grid');
  grid.innerHTML = '';
  COLUNAS_EXPORTAR.forEach(col => {
    if (col.id === 'status' && filtroAtual !== 'todos') return;
    const item = document.createElement('label');
    item.className = 'exportar-coluna-item';
    item.innerHTML = `
      <input type="checkbox" value="${col.id}">
      <span class="exportar-coluna-label">${col.label}</span>
    `;
    const cb = item.querySelector('input');
    cb.addEventListener('change', () => item.classList.toggle('marcado', cb.checked));
    grid.appendChild(item);
  });
}

function gerarExtratores(todosOsDados) {
  return {
    nome:          p => p.nome || '',
    marca:         p => p.marca || '',
    linha:         p => p.linha || '',
    status:        p => STATUS_LABELS[p.status] || p.status || '',
    media:         p => p.avaliacoes?.media ?? '',
    cheiro:        p => p.avaliacoes?.cheiro ?? '',
    projecao:      p => p.avaliacoes?.projecao ?? '',
    fixacao:       p => p.avaliacoes?.fixacao ?? '',
    versatilidade: p => p.avaliacoes?.versatilidade ?? '',
    acordes:       p => (p.acordes || []).join(', '),
    notasTopo:     p => (p.notas?.topo || []).join(', '),
    notasCoracao:  p => (p.notas?.coracao || []).join(', '),
    notasFundo:    p => (p.notas?.fundo || []).join(', '),
    perfumista:    p => p.perfumista || '',
    genero:        p => GENERO_LABELS[p.caracteristicas?.genero] || p.caracteristicas?.genero || '',
    clima:         p => CLIMA_LABELS[String(p.caracteristicas?.clima)] || '',
    ambiente:      p => AMBIENTE_LABELS[String(p.caracteristicas?.ambiente)] || '',
    hora:          p => HORA_LABELS[String(p.caracteristicas?.hora)] || '',
    contratipo:    p => {
      if (!p.contratipo?.eh) return 'Não';
      const orig = todosOsDados.find(x => x.id === p.contratipo.perfumeOriginal);
      return orig ? `Sim (${orig.nome} de ${orig.marca})` : 'Sim';
    },
    linkCompra:    p => p.linkCompra || '',
    review:        p => p.review?.texto || '',
  };
}

/**
 * Inicializa o módulo de exportação.
 * @param {Function} getDados - função que retorna o array de perfumes atual
 */
export function inicializarExportar(getDados) {
  document.getElementById('menu-exportar-excel')?.addEventListener('click', abrirModalExportar);
  document.getElementById('btn-fechar-exportar')?.addEventListener('click', fecharModalExportar);
  document.getElementById('btn-cancelar-exportar')?.addEventListener('click', fecharModalExportar);
  document.getElementById('btn-exportar-voltar')?.addEventListener('click', irParaEtapa1);

  document.querySelectorAll('input[name="filtro-exportar"]').forEach(radio => {
    radio.addEventListener('change', () => irParaEtapa2());
  });

  document.getElementById('btn-marcar-todos')?.addEventListener('click', () => {
    document.querySelectorAll('#exportar-colunas-grid input[type="checkbox"]').forEach(cb => {
      cb.checked = true;
      cb.closest('.exportar-coluna-item').classList.add('marcado');
    });
  });

  document.getElementById('btn-desmarcar-todos')?.addEventListener('click', () => {
    document.querySelectorAll('#exportar-colunas-grid input[type="checkbox"]').forEach(cb => {
      cb.checked = false;
      cb.closest('.exportar-coluna-item').classList.remove('marcado');
    });
  });

  modalExportar?.addEventListener('click', (e) => {
    if (e.target === modalExportar) fecharModalExportar();
  });

  document.getElementById('btn-confirmar-exportar')?.addEventListener('click', () => {
    const filtro = document.querySelector('input[name="filtro-exportar"]:checked')?.value || 'todos';
    const colunasSelecionadas = Array.from(
      document.querySelectorAll('#exportar-colunas-grid input:checked')
    ).map(cb => cb.value);

    if (colunasSelecionadas.length === 0) {
      alert('Selecione pelo menos uma coluna para exportar.');
      return;
    }

    const todosOsDados = getDados();
    let perfumes = filtro === 'todos' ? todosOsDados : todosOsDados.filter(p => p.status === filtro);

    if (perfumes.length === 0) {
      alert('Nenhum perfume encontrado para o filtro selecionado.');
      return;
    }

    const extratores = gerarExtratores(todosOsDados);
    const colunasInfo = COLUNAS_EXPORTAR.filter(col => colunasSelecionadas.includes(col.id));
    const cabecalhos = colunasInfo.map(col => col.label);
    const linhas = perfumes.map(p => colunasInfo.map(col => extratores[col.id]?.(p) ?? ''));

    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
    script.onload = () => {
      const wb = XLSX.utils.book_new();
      const wsData = [cabecalhos, ...linhas];
      const ws = XLSX.utils.aoa_to_sheet(wsData);

      // Hyperlinks para linkCompra
      const linkIdx = colunasInfo.findIndex(col => col.id === 'linkCompra');
      if (linkIdx >= 0) {
        linhas.forEach((linha, rowIdx) => {
          const url = linha[linkIdx];
          if (url && url.startsWith('http')) {
            const cellRef = XLSX.utils.encode_cell({ r: rowIdx + 1, c: linkIdx });
            if (ws[cellRef]) ws[cellRef].l = { Target: url, Tooltip: url };
          }
        });
      }

      // Largura automática
      ws['!cols'] = cabecalhos.map((h, i) => {
        const maxLen = Math.max(h.length, ...linhas.map(r => String(r[i] || '').length));
        return { wch: Math.min(Math.max(maxLen + 2, 12), 50) };
      });

      const filtroLabel = { todos: 'Todos', tenho: 'Tenho', 'ja-tive': 'Ja tive', 'quero-ter': 'Quero ter' };
      XLSX.utils.book_append_sheet(wb, ws, filtroLabel[filtro] || 'Perfumes');
      XLSX.writeFile(wb, `perfumes_${filtro}_${new Date().toISOString().slice(0,10)}.xlsx`);
      fecharModalExportar();
    };
    script.onerror = () => alert('Erro ao carregar biblioteca de exportação. Verifique sua conexão.');
    document.head.appendChild(script);
  });
}