import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, StyleSheet, ScrollView, Image, ActivityIndicator, TouchableOpacity, Alert, TextInput, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from './supabase';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

export default function Historico({ navigation }: any) {
  const [nifaps, setNifaps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOps, setExpandedOps] = useState<{ [key: number]: boolean }>({});
  const [pesquisa, setPesquisa] = useState('');

  useFocusEffect(
    useCallback(() => {
      carregarDados();
    }, [])
  );

  const carregarDados = async () => {
    // 1. ADICIONADO: nome_tecnico_2 e num_tecnico_2 na busca!
    const { data, error } = await supabase
      .from('nifaps')
      .select(`
        id, nifap, 
        operacoes (
          id, n_operacao, data_visita, n_pedido, nome_promotor, concelho, freguesia, 
          investimento_total, apoio_atribuido, verificacao_1a, verificacao_1b, 
          regras_publicidade, confronto_documentos, controlo_visual, outras_verificacoes, 
          desconformidades_just, desconformidades_irreg, nome_tecnico, num_tecnico,
          nome_tecnico_2, num_tecnico_2,
          fotos (id, descricao, foto_url, ordem)
        )
      `)
      .order('created_at', { ascending: false });
    
    if (error) alert('Erro ao carregar histórico: ' + error.message);
    else if (data) setNifaps(data.filter((n: any) => n.operacoes && n.operacoes.length > 0));
    setLoading(false);
  };

  const toggleFotos = (opId: number) => setExpandedOps(prev => ({ ...prev, [opId]: !prev[opId] }));

  const confirmarEliminacao = (opId: number, fotos: any[]) => {
    if (Platform.OS === 'web') {
      if (window.confirm("Tem a certeza que deseja eliminar este relatório? Esta ação apagará as fotos.")) eliminarRegisto(opId, fotos);
    } else {
      Alert.alert("Eliminar Registo", "Tem a certeza que deseja eliminar este relatório?", [
        { text: "Cancelar", style: "cancel" }, { text: "Eliminar", style: "destructive", onPress: () => eliminarRegisto(opId, fotos) }
      ]);
    }
  };

  const eliminarRegisto = async (opId: number, fotos: any[]) => {
    try {
      setLoading(true);
      if (fotos && fotos.length > 0) {
        const filePaths = fotos.map(f => {
          const urlSemParams = f.foto_url.split('?')[0];
          return urlSemParams.substring(urlSemParams.lastIndexOf('/') + 1);
        });
        if (filePaths.length > 0) await supabase.storage.from('fotos_relatorio').remove(filePaths);
      }
      await supabase.from('fotos').delete().eq('operacao_id', opId);
      await supabase.from('operacoes').delete().eq('id', opId);
      await carregarDados();
    } catch (error: any) { alert('Erro: ' + error.message); setLoading(false); }
  };

  const gerarPDF = async (agricultor: any, operacao: any) => {
    try {
      const fotosOrdenadas = [...operacao.fotos].sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
      const dataFormatada = operacao.data_visita ? operacao.data_visita.split('-').reverse().join('/') : '';

      const criarFotoHtml = (foto: any, index: number, attrs: string = '') => `
        <div class="photo-item"${attrs}>
          <img src="${foto.foto_url}" />
          <div class="photo-caption"><strong>F${index + 1}- </strong>${foto.descricao}</div>
        </div>
      `;

      const estilos = `
        @page { size: A4; margin: 0 !important; }
        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; color: #000; font-size: 11px; margin: 0; padding: 0; background-color: #fff; }
        .cabecalho { width: 100%; box-sizing: border-box; padding: 15mm 15mm 10mm 15mm; display: flex; align-items: center; justify-content: center; background: #fff; }
        .cabecalho-fotos { width: 100%; box-sizing: border-box; padding: 8mm 15mm 3mm 15mm; text-align: left; background: #fff; }
        .rodape { width: 100%; box-sizing: border-box; padding: 5mm 15mm; display: flex; justify-content: space-between; align-items: flex-end; }
        .rodape-modelo { font-family: 'Times New Roman', Times, serif; font-weight: bold; font-size: 8px; color: #000; white-space: nowrap; }
        .rodape-info { text-align: right; font-size: 8px; color: #000; line-height: 1.3; }
        .content-cell { padding: 0 15mm 3mm 15mm; }
        .main-title { text-align: center; font-size: 14px; font-weight: bold; margin-bottom: 10px; }
        .gray-block { background-color: #d9d9d9 !important; padding: 10px; border: 1px solid #000; margin-bottom: 10px; }
        .flex-row { display: flex; align-items: center; margin-bottom: 6px; width: 100%; gap: 10px; }
        .label { font-weight: bold; white-space: nowrap; }
        .label-small { font-weight: normal; font-size: 10px; line-height: 1; margin-top: 2px; }
        .input-box { background-color: #fff !important; border: 1px solid #000; padding: 4px 8px; min-height: 14px; flex-grow: 1; display: flex; align-items: center; }
        .input-box-fixed { background-color: #fff !important; border: 1px solid #000; padding: 4px 8px; min-height: 14px; display: flex; align-items: center; }
        .section-title { font-weight: bold; margin-top: 10px; margin-bottom: 6px; }
        .sub-section { margin-left: 20px; margin-bottom: 10px; }
        .sub-title { font-weight: bold; margin-bottom: 4px; }
        .answer-box { border: 1px solid #000; background-color: #fff !important; padding: 6px; min-height: 15px; text-align: justify; line-height: 1.35; white-space: pre-wrap; }
        .anexos { margin-top: 12px; margin-bottom: 10px; font-weight: bold; font-size: 10px; line-height: 1.3; }
        .gray-block-photos { background-color: #d9d9d9 !important; display: flex; justify-content: space-between; padding: 10px; margin-bottom: 20px; border-top: 1px solid #000; border-bottom: 1px solid #000;}
        .photo-input-col { flex: 1; margin-right: 15px; }
        .photo-input-col:last-child { margin-right: 0; }
        .photo-input-label { font-size: 11px; margin-bottom: 2px; }
        .photo-input-box { background-color: #fff !important; border: 2px solid #000; padding: 6px; font-weight: bold; text-align: center; font-size: 12px; min-height: 15px; }
        .photo-grid { margin-top: 0; padding-bottom: 0; }
        .photo-grid::after { content: ""; display: table; clear: both; }
        .photo-item { width: 48%; margin-bottom: 25px; border: 2px solid #000; background-color: #fff !important; box-sizing: border-box; page-break-inside: avoid; float: left; overflow: hidden; }
        .photo-item:nth-child(odd) { clear: left; margin-right: 4%; }
        .photo-item img { width: 100%; height: 230px; object-fit: cover; display: block; border-bottom: 2px solid #000; box-sizing: border-box; }
        .photo-caption { padding: 10px; font-size: 11px; text-align: left; color: #000; }
      `;

      const criarCabecalhoHtml = (alturaPx?: number) => `
        <div class="cabecalho" data-cabecalho${alturaPx ? ` style="height: ${alturaPx}px;"` : ''}>
          <table style="width: auto; border-collapse: collapse; border: none; margin: 0; padding: 0;">
            <tr>
              <td style="width: 140px; vertical-align: middle; text-align: left; padding: 0;">
                <img src="https://nwgmloromztpzbeupzgz.supabase.co/storage/v1/object/public/assets/Imagem1.jpg" style="height: 50px; display: block;" />
              </td>
              <td style="border-left: 2px solid #cbd5e1; padding-left: 15px; vertical-align: middle; text-align: left; line-height: 1.3;">
                <div style="color: #6a9eb6; font-weight: bold; font-size: 11px; text-transform: uppercase;">UNIDADE DE INVESTIMENTO NA AGRICULTURA E PESCAS</div>
                <div style="color: #6a9eb6; font-weight: bold; font-size: 11px; text-transform: uppercase; margin-bottom: 3px;">DIVISÃO DE INVESTIMENTO DO DOURO E MINHO</div>
                <div style="color: #444; font-size: 9px;">Comissão de Coordenação e Desenvolvimento Regional do Norte, I.P.</div>
                <div style="color: #444; font-size: 9px;">Norte Portugal Regional Coordination and Development Commission</div>
                <div style="color: #444; font-size: 9px;">Tel. 00351 253 206 400</div>
                <div style="color: #444; font-size: 9px;">https://www.ccdr-n.pt ▪ geral@ccdr-n.pt</div>
              </td>
            </tr>
          </table>
        </div>
      `;

      const criarCabecalhoFotosHtml = (attrs: string = '') => `
        <div class="cabecalho-fotos"${attrs}>
          <img src="https://nwgmloromztpzbeupzgz.supabase.co/storage/v1/object/public/assets/8bc74c91510e4c8c_org.jpg" style="height: 100px; width: auto; display: block;" />
        </div>
      `;

      // Cabeçalho de dados + título do registo fotográfico (repetido em TODAS as páginas de fotos)
      const criarTopoFotosHtml = (attrs: string = '') => `
        <div${attrs}>
          <div class="main-title">RELATÓRIO DE VERIFICAÇÃO FÍSICA NO LOCAL</div>
          <div class="gray-block-photos">
            <div class="photo-input-col"><div class="photo-input-label">Nº OPERAÇÃO:</div><div class="photo-input-box">${operacao.n_operacao}</div></div>
            <div class="photo-input-col"><div class="photo-input-label">Data da Visita:</div><div class="photo-input-box">${dataFormatada}</div></div>
            <div class="photo-input-col"><div class="photo-input-label">NIFAP</div><div class="photo-input-box">${agricultor.nifap}</div></div>
          </div>
          <div style="text-align: center; font-weight: bold; font-size: 14px; margin-bottom: 15px;">REGISTO FOTOGRÁFICO-ANEXO III</div>
        </div>
      `;

      // Uma página completa do registo fotográfico (logo + dados + título + fotos dessa página)
      const criarPaginaFotosHtml = (indices: number[]) => `
        ${criarCabecalhoFotosHtml()}
        <div class="content-cell">
          ${criarTopoFotosHtml()}
          <div class="photo-grid">
            ${indices.length > 0
              ? indices.map(i => criarFotoHtml(fotosOrdenadas[i], i)).join('')
              : '<p style="text-align:center; width:100%; color:#64748b;">Nenhuma foto registada.</p>'}
          </div>
        </div>
      `;

      const montarPaginasFotos = (paginas: number[][]) =>
        paginas.map((indices, idx) => (idx > 0 ? '<div style="page-break-before: always;"></div>' : '') + criarPaginaFotosHtml(indices)).join('');

      const criarRodapeHtml = (alturaPx?: number) => `
        <div class="rodape" data-rodape${alturaPx ? ` style="height: ${alturaPx}px;"` : ''}>
          <div class="rodape-modelo">MODELO – 4 - DRAPN</div>
          <div class="rodape-info">
            COMISSÃO DE COORDENAÇÃO E DESENVOLVIMENTO REGIONAL DO NORTE, I.P.<br/>
            NORTE PORTUGAL REGIONAL COORDINATION AND DEVELOPMENT COMMISSION<br/>
            Tel. 00351 253 206 400<br/>
            https://www.ccdr-n.pt ▪ geral@ccdr-n.pt
          </div>
        </div>
      `;

      // 2. BLOCO DE ASSINATURAS: APENAS DUAS CAIXAS (1º e 2º TÉCNICO) LADO A LADO
      const assinaturasBox = `
        <div class="content-cell">
          <div class="section-title" style="margin-bottom: 15px;">7. Assinaturas</div>
          <div style="font-weight: bold; margin-bottom: 5px;">Os Técnicos Responsáveis pela Visita:</div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 25px;">
            <div style="width: 45%;">
              <div style="border: 1px solid #000; height: 50px;"></div>
              <div style="display: flex; justify-content: space-between; font-size: 11px; margin-top: 4px;">
                <span>${operacao.nome_tecnico || 'Teresa Rodrigues'}</span><span>${operacao.num_tecnico || '1593'}</span>
              </div>
            </div>

            <div style="width: 45%;">
              <div style="border: 1px solid #000; height: 50px;"></div>
              <div style="display: flex; justify-content: space-between; font-size: 11px; margin-top: 4px;">
                <span>${operacao.nome_tecnico_2 || ''}</span><span>${operacao.num_tecnico_2 || ''}</span>
              </div>
            </div>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: flex-end;">
            <div style="width: 45%;">
              <div style="font-weight: bold; margin-bottom: 5px;">O Superior Hierárquico:</div>
              <div style="border: 1px solid #000; height: 50px;"></div>
            </div>
            <div style="width: 45%; display: flex; align-items: flex-end;">
              <div style="border: 1px solid #000; height: 50px; width: 100%; display: flex; padding: 5px; box-sizing: border-box;">
                <span style="font-size: 11px; font-weight: bold;">Data:</span>
              </div>
            </div>
          </div>
        </div>
      `;

      const blocosRelatorio = [
        `<div class="content-cell">
          <div class="main-title">RELATÓRIO DE VERIFICAÇÃO FÍSICA NO LOCAL</div>
          <div class="gray-block">
            <div class="flex-row">
              <span class="label">N.º Pedido:</span><div class="input-box-fixed" style="width: 120px;">${operacao.n_pedido || ''}</div>
              <span class="label" style="margin-left: 10px;">Nº da Operação:</span><div class="input-box">${operacao.n_operacao || ''}</div>
              <span class="label" style="margin-left: 10px;">Data da Visita:</span><div class="input-box-fixed" style="width: 100px;">${dataFormatada}</div>
            </div>
            <div class="flex-row">
              <span class="label">Nome:</span><div class="input-box">${operacao.nome_promotor || ''}</div>
              <span class="label" style="margin-left: 10px;">NIFAP:</span><div class="input-box-fixed" style="width: 120px;">${agricultor.nifap}</div>
            </div>
            <div class="label" style="margin-top: 10px; margin-bottom: 5px;">Localização da Operação:</div>
            <div class="flex-row">
              <span class="label">Concelho:</span><div class="input-box">${operacao.concelho || ''}</div>
              <span class="label" style="margin-left: 10px;">Freguesia:</span><div class="input-box">${operacao.freguesia || ''}</div>
            </div>
            <div class="label" style="margin-top: 10px; margin-bottom: 5px;">Montantes Contratualizados:</div>
            <div class="flex-row">
              <div style="display: flex; flex-direction: column; width: 120px;"><span class="label">Investimento Total:</span><span class="label-small">(Elegível Aprovado)</span></div>
              <div class="input-box">${operacao.investimento_total || ''}</div>
              <div style="display: flex; flex-direction: column; width: 100px; margin-left: 15px;"><span class="label">Apoio Atribuído:</span><span class="label-small">(Despesa Pública)</span></div>
              <div class="input-box">${operacao.apoio_atribuido || ''}</div>
            </div>
          </div>
        </div>`,
        `<div class="content-cell"><div class="section-title">1 - Verificação física dos investimentos</div><div class="sub-section"><div class="sub-title">a) &nbsp;Identificação dos itens de investimento verificados</div><div class="answer-box">${operacao.verificacao_1a || ''}</div></div><div class="sub-section"><div class="sub-title">b) &nbsp;Relativamente ao investimento na sua globalidade</div><div class="answer-box">${operacao.verificacao_1b || ''}</div></div></div>`,
        `<div class="content-cell"><div class="section-title">2 - Verificação do cumprimento das regras de publicidade</div><div class="sub-section" style="margin-left: 0;"><div class="answer-box">${operacao.regras_publicidade || ''}</div></div></div>`,
        `<div class="content-cell"><div class="section-title">3 - Confronto das cópias dos documentos de despesa com os documentos originais</div><div class="sub-section" style="margin-left: 0;"><div class="answer-box">${operacao.confronto_documentos || ''}</div></div></div>`,
        `<div class="content-cell"><div class="section-title">4 - Controlo visual da exploração/unidade agro-industrial</div><div class="sub-section" style="margin-left: 0;"><div class="answer-box">${operacao.controlo_visual || ''}</div></div></div>`,
        `<div class="content-cell"><div class="section-title">5 - Outras verificações efetuadas no local</div><div class="sub-section" style="margin-left: 0;"><div class="answer-box">${operacao.outras_verificacoes || ''}</div></div></div>`,
        `<div class="content-cell"><div class="section-title">6 – Desconformidades</div><div class="sub-title" style="margin-bottom: 5px;">Justificação Irregularidade</div><div class="sub-section" style="margin-left: 0;"><div class="answer-box" style="min-height: 50px;">${operacao.desconformidades_irreg || ''}</div></div></div>`,
        
        assinaturasBox,

        `<div class="content-cell"><div class="anexos">ANEXOS:<br><br>- ANEXO I &nbsp;&nbsp;&nbsp;- Adenda<br>- ANEXO II A - Verificação dos Investimentos Realizados<br>- ANEXO II B - Verificação do Parcelário e Ocupação Cultural<br>- ANEXO II C - Condicionantes<br>- ANEXO III &nbsp;&nbsp;- Registo Fotográfico<br>- ANEXO IV &nbsp;&nbsp;- Esquema geral dos investimentos realizados</div></div>`,
      ];

      const montarDocumento = (corpoHtml: string) => `<!DOCTYPE html><html><head><meta charset="utf-8" /><style>${estilos}</style></head><body>${corpoHtml}</body></html>`;

      const aguardarCarregamento = (frame: HTMLIFrameElement): Promise<void> => {
        return new Promise((resolve) => {
          const aguardarImagens = () => {
            const doc = frame.contentDocument;
            if (!doc) { resolve(); return; }
            const imgs = Array.from(doc.images);
            const pendentes = imgs.filter((img) => !img.complete);
            if (pendentes.length === 0) { setTimeout(resolve, 50); return; }
            let restantes = pendentes.length;
            const feito = () => { restantes -= 1; if (restantes <= 0) setTimeout(resolve, 50); };
            pendentes.forEach((img) => { img.onload = feito; img.onerror = feito; });
          };
          if (frame.contentDocument?.readyState === 'complete') aguardarImagens();
          else frame.onload = aguardarImagens;
        });
      };

      if (Platform.OS === 'web') {
        const medidor = document.createElement('iframe');
        medidor.style.visibility = 'hidden'; medidor.style.position = 'absolute'; medidor.style.left = '-9999px'; medidor.style.width = '210mm';
        document.body.appendChild(medidor);

        const corpoMedicao =
          criarCabecalhoHtml() + criarRodapeHtml()
          + blocosRelatorio.map((bloco, i) => bloco.replace('<div class="content-cell">', `<div class="content-cell" data-blk="${i}">`)).join('')
          + criarCabecalhoFotosHtml(' data-cabecalho-fotos')
          + `<div class="content-cell">${criarTopoFotosHtml(' data-topo-fotos')}<div class="photo-grid">${fotosOrdenadas.map((f: any, i: number) => criarFotoHtml(f, i, ` data-foto="${i}"`)).join('')}</div></div>`;
        medidor.contentDocument?.open(); medidor.contentDocument?.write(montarDocumento(corpoMedicao)); medidor.contentDocument?.close();
        await aguardarCarregamento(medidor);

        const doc = medidor.contentDocument!;
        const alturaCabecalhoPx = Math.ceil(doc.querySelector('[data-cabecalho]')!.getBoundingClientRect().height) + 2;
        const alturaRodapePx = Math.ceil(doc.querySelector('[data-rodape]')!.getBoundingClientRect().height) + 2;
        const alturas = Array.from(doc.querySelectorAll('[data-blk]')).map(el => (el as HTMLElement).getBoundingClientRect().height);
        const alturaCabFotosPx = Math.ceil(doc.querySelector('[data-cabecalho-fotos]')!.getBoundingClientRect().height) + 2;
        const alturaTopoFotosPx = Math.ceil(doc.querySelector('[data-topo-fotos]')!.getBoundingClientRect().height) + 2;
        const alturasFotos = Array.from(doc.querySelectorAll('[data-foto]')).map(el => (el as HTMLElement).getBoundingClientRect().height);
        document.body.removeChild(medidor);

        const MM_PARA_PX = 96 / 25.4;
        const ORCAMENTO_PX = (297 * MM_PARA_PX) - alturaCabecalhoPx - alturaRodapePx - (15 * MM_PARA_PX);

        const paginas: number[][] = [[]];
        let alturaAcumulada = 0;
        alturas.forEach((altura, i) => {
          const alturaComFolga = altura + (3 * MM_PARA_PX);
          if (alturaAcumulada + alturaComFolga > ORCAMENTO_PX && paginas[paginas.length - 1].length > 0) { paginas.push([]); alturaAcumulada = 0; }
          paginas[paginas.length - 1].push(i);
          alturaAcumulada += alturaComFolga;
        });

        // Paginação das fotos: as fotos ficam 2 por linha, por isso o orçamento é gasto linha a linha.
        // Sempre que uma linha não cabe, abre-se nova página (que repete logo + dados + título).
        // Usa uma margem de segurança generosa porque a grelha de fotos não tem rodapé próprio.
        const ORCAMENTO_FOTOS_PX = (297 * MM_PARA_PX) - alturaCabFotosPx - alturaTopoFotosPx - (25 * MM_PARA_PX);
        const MARGEM_FOTO_PX = 25; // .photo-item margin-bottom
        const MAX_FOTOS_POR_PAGINA = 4; // limite de segurança: nunca tentar mais do que 2 linhas por página

        const paginasFotos: number[][] = [[]];
        let alturaFotosAcumulada = 0;
        for (let i = 0; i < alturasFotos.length; i += 2) {
          const alturaLinha = Math.max(alturasFotos[i], alturasFotos[i + 1] ?? 0) + MARGEM_FOTO_PX;
          const ultima = paginasFotos[paginasFotos.length - 1];
          const excedeOrcamento = alturaFotosAcumulada + alturaLinha > ORCAMENTO_FOTOS_PX;
          const excedeLimite = ultima.length >= MAX_FOTOS_POR_PAGINA;
          if ((excedeOrcamento || excedeLimite) && ultima.length > 0) {
            paginasFotos.push([]); alturaFotosAcumulada = 0;
          }
          const atual = paginasFotos[paginasFotos.length - 1];
          atual.push(i);
          if (i + 1 < alturasFotos.length) atual.push(i + 1);
          alturaFotosAcumulada += alturaLinha;
        }

        let corpoFinal = '';
        paginas.forEach((indices, idx) => {
          if (idx > 0) corpoFinal += '<div style="page-break-before: always;"></div>';
          corpoFinal += criarCabecalhoHtml(alturaCabecalhoPx) + indices.map(i => blocosRelatorio[i]).join('') + criarRodapeHtml(alturaRodapePx);
        });
        corpoFinal += '<div style="page-break-before: always;"></div>' + montarPaginasFotos(paginasFotos);

        const iframe = document.createElement('iframe');
        iframe.style.visibility = 'hidden'; iframe.style.position = 'absolute'; iframe.style.left = '-9999px'; iframe.style.width = '210mm';
        document.body.appendChild(iframe);
        iframe.contentDocument?.open(); iframe.contentDocument?.write(montarDocumento(corpoFinal)); iframe.contentDocument?.close();
        await aguardarCarregamento(iframe);
        iframe.contentWindow?.focus(); iframe.contentWindow?.print();
        setTimeout(() => { document.body.removeChild(iframe); }, 2000);
      } else {
        // No nativo não há medição possível: usa-se um número fixo de fotos por página (2 linhas de 2).
        const FOTOS_POR_PAGINA = 4;
        const paginasFotosNativo: number[][] = [];
        for (let i = 0; i < fotosOrdenadas.length; i += FOTOS_POR_PAGINA) {
          paginasFotosNativo.push(fotosOrdenadas.slice(i, i + FOTOS_POR_PAGINA).map((_: any, j: number) => i + j));
        }
        if (paginasFotosNativo.length === 0) paginasFotosNativo.push([]);

        const corpoNativo = criarCabecalhoHtml() + blocosRelatorio.join('') + criarRodapeHtml() + '<div style="page-break-before: always;"></div>' + montarPaginasFotos(paginasFotosNativo);
        const { uri } = await Print.printToFileAsync({ html: montarDocumento(corpoNativo) });
        await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
      }
    } catch (error: any) { alert('Erro ao gerar PDF: ' + error.message); }
  };

  const nifapsFiltrados = nifaps.filter(agricultor => agricultor.nifap.toString().includes(pesquisa));

  if (loading) return <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#004b87" /><Text style={styles.loadingText}>A carregar dados...</Text></View>;

  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      <View style={styles.searchContainer}>
        {Platform.OS !== 'web' && <MaterialIcons name="search" size={22} color="#64748b" style={styles.searchIcon} />}
        <TextInput style={[styles.searchInput, Platform.OS === 'web' && { outlineStyle: 'none' } as any]} placeholder="Pesquisar por NIFAP..." placeholderTextColor="#94a3b8" value={pesquisa} onChangeText={setPesquisa} keyboardType="numeric" />
        {pesquisa.length > 0 && (
          <TouchableOpacity onPress={() => setPesquisa('')} style={styles.clearIcon}>
            {Platform.OS !== 'web' ? <MaterialIcons name="close" size={20} color="#94a3b8" /> : <Text style={{fontSize: 16, color: '#94a3b8', fontWeight: 'bold'}}>X</Text>}
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContainer}>
        {nifapsFiltrados.length === 0 ? (
          <View style={styles.emptyContainer}><Text style={styles.emptyText}>{pesquisa.length > 0 ? "Nenhum resultado encontrado." : "Ainda não tens relatórios guardados."}</Text></View>
        ) : (
          nifapsFiltrados.map(agricultor => {
            const operacoesOrdenadas = [...agricultor.operacoes].sort((a, b) => new Date(b.data_visita).getTime() - new Date(a.data_visita).getTime());
            return (
              <View key={agricultor.id} style={styles.nifapSection}>
                <View style={styles.nifapHeader}><Text style={styles.nifapTitle}>NIFAP: {agricultor.nifap}</Text></View>
                {operacoesOrdenadas.map((op: any) => {
                  const isExpanded = expandedOps[op.id];
                  const dataFormatada = op.data_visita ? op.data_visita.split('-').reverse().join('/') : '';
                  return (
                    <View key={op.id} style={styles.opCard}>
                      <View style={styles.opInfoContainer}>
                        <View style={styles.opDataBox}><Text style={styles.opLabel}>Nº Operação</Text><Text style={styles.opValue}>{op.n_operacao}</Text></View>
                        <View style={[styles.opDataBox, { alignItems: 'flex-end' }]}><Text style={styles.opLabel}>Data da Visita</Text><Text style={styles.opValue}>{dataFormatada}</Text></View>
                      </View>
                      
                      <View style={styles.actionsRow}>
                        <TouchableOpacity style={styles.btnEdit} onPress={() => navigation.navigate('Editar', { operacao: op, agricultor: agricultor })}>
                          {Platform.OS !== 'web' && <MaterialIcons name="edit" size={18} color="#004b87" />}<Text style={styles.btnEditText}>Editar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.btnPdf} onPress={() => gerarPDF(agricultor, op)}>
                          {Platform.OS !== 'web' && <MaterialIcons name="picture-as-pdf" size={18} color="#ffffff" />}<Text style={styles.btnPdfText}>Exportar PDF</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={Platform.OS === 'web' ? [styles.btnDelete, {width: 60}] : styles.btnDelete} onPress={() => confirmarEliminacao(op.id, op.fotos)}>
                          {Platform.OS !== 'web' ? <MaterialIcons name="delete" size={20} color="#ef4444" /> : <Text style={{color: '#ef4444', fontWeight: 'bold', fontSize: 12}}>Apagar</Text>}
                        </TouchableOpacity>
                      </View>

                      {op.fotos && op.fotos.length > 0 && (
                        <TouchableOpacity style={styles.expandBtn} onPress={() => toggleFotos(op.id)}>
                          <Text style={styles.expandBtnText}>{isExpanded ? 'Ocultar Fotografias' : `Ver ${op.fotos.length} Fotografias`}</Text>
                        </TouchableOpacity>
                      )}

                      {isExpanded && (
                        <View style={styles.photoGrid}>
                          {[...op.fotos].sort((a, b) => (a.ordem || 0) - (b.ordem || 0)).map((foto: any, index: number) => (
                            <View key={foto.id} style={styles.photoCard}>
                              <Image source={{ uri: foto.foto_url }} style={styles.imagem} />
                              <Text style={styles.fotoIndex}>F{index + 1}</Text>
                              <Text style={styles.descricao} numberOfLines={2}>{foto.descricao}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', margin: 20, marginBottom: 5, paddingHorizontal: 15, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 15, color: '#0f172a' },
  clearIcon: { padding: 5 },
  scrollContainer: { flexGrow: 1, padding: 20, paddingTop: 15 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
  loadingText: { marginTop: 10, color: '#64748b', fontSize: 14, fontWeight: '600' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 },
  emptyText: { color: '#64748b', fontSize: 16, marginTop: 15, fontWeight: '500' },
  nifapSection: { marginBottom: 30 },
  nifapHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, paddingLeft: 5 },
  nifapTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  opCard: { backgroundColor: '#ffffff', borderRadius: 12, padding: 20, marginBottom: 15, borderWidth: 1, borderColor: '#e2e8f0' },
  opInfoContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  opDataBox: { flex: 1 },
  opLabel: { fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: '700', marginBottom: 4, letterSpacing: 0.5 },
  opValue: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  actionsRow: { flexDirection: 'row', gap: 10, marginBottom: 15 },
  btnEdit: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0f9ff', paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: '#bae6fd' },
  btnEditText: { color: '#004b87', fontWeight: '700', fontSize: 13, marginLeft: 6 },
  btnPdf: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#004b87', paddingVertical: 12, borderRadius: 8 },
  btnPdfText: { color: '#ffffff', fontWeight: '700', fontSize: 13, marginLeft: 6 },
  btnDelete: { width: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fef2f2', borderRadius: 8, borderWidth: 1, borderColor: '#fecaca' },
  expandBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, backgroundColor: '#f8fafc', borderRadius: 6, borderWidth: 1, borderColor: '#e2e8f0' },
  expandBtnText: { color: '#475569', fontWeight: '600', fontSize: 13 },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 15 },
  photoCard: { width: '48%', marginBottom: 15, backgroundColor: '#f8fafc', borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#e2e8f0' },
  imagem: { width: '100%', height: 120, resizeMode: 'cover' },
  fotoIndex: { position: 'absolute', top: 5, left: 5, backgroundColor: '#004b87', color: 'white', fontSize: 10, fontWeight: 'bold', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4, overflow: 'hidden' },
  descricao: { fontSize: 11, color: '#334155', padding: 8, fontStyle: 'italic' }
});