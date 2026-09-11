import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, StyleSheet, Platform, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from './supabase';
import { LogBox } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';

LogBox.ignoreLogs(['InteractionManager has been deprecated']);

// Estado e ações para uma caixa de anexo em PDF (usado para o Anexo I, II A, II B e II C).
function useAnexo(urlInicial: string, nomeInicial: string) {
  const [urlAtual] = useState(urlInicial || '');
  const [nomeOriginal] = useState(nomeInicial || '');
  const [nomeAtual, setNomeAtual] = useState(nomeInicial || '');
  const [novo, setNovo] = useState<{ uri: string; nome: string } | null>(null);
  const [removido, setRemovido] = useState(false);

  const escolher = async () => {
    const resultado = await DocumentPicker.getDocumentAsync({ type: 'application/pdf' });
    if (!resultado.canceled && resultado.assets && resultado.assets[0]) {
      setNovo({ uri: resultado.assets[0].uri, nome: resultado.assets[0].name });
      setRemovido(false);
      setNomeAtual(resultado.assets[0].name);
    }
  };

  const remover = () => { setNovo(null); setRemovido(true); setNomeAtual(''); };

  return { urlAtual, nomeOriginal, nomeAtual, novo, removido, escolher, remover };
}

interface FotoItem {
  id: number | null;
  descricao: string;
  foto_url: string;
  urlOriginal: string | null;
  novaUri: string | null;
}

// Estado e ações para uma lista de fotos editável (usado no Anexo III e no Anexo IV):
// reordenar, editar descrição, substituir a imagem, adicionar novas e remover.
function useFotosAnexo(fotosIniciais: any[]) {
  const [fotos, setFotos] = useState<FotoItem[]>(
    fotosIniciais.map(f => ({ id: f.id, descricao: f.descricao || '', foto_url: f.foto_url, urlOriginal: f.foto_url, novaUri: null }))
  );
  const [removidas, setRemovidas] = useState<{ id: number; urlOriginal: string }[]>([]);

  const adicionarCamera = async () => {
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (!result.canceled) setFotos(f => [...f, { id: null, descricao: '', foto_url: result.assets[0].uri, urlOriginal: null, novaUri: result.assets[0].uri }]);
  };

  const adicionarGaleria = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.7, allowsMultipleSelection: true });
    if (!result.canceled) {
      const novas = result.assets.map(a => ({ id: null, descricao: '', foto_url: a.uri, urlOriginal: null, novaUri: a.uri }));
      setFotos(f => [...f, ...novas]);
    }
  };

  const substituir = async (index: number) => {
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });
    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setFotos(f => f.map((foto, i) => i === index ? { ...foto, foto_url: uri, novaUri: uri } : foto));
    }
  };

  const atualizarDescricao = (texto: string, index: number) =>
    setFotos(f => f.map((foto, i) => i === index ? { ...foto, descricao: texto } : foto));

  const mover = (index: number, direcao: 'cima' | 'baixo') => {
    setFotos(f => {
      if (direcao === 'cima' && index === 0) return f;
      if (direcao === 'baixo' && index === f.length - 1) return f;
      const novas = [...f];
      const novaPosicao = direcao === 'cima' ? index - 1 : index + 1;
      [novas[index], novas[novaPosicao]] = [novas[novaPosicao], novas[index]];
      return novas;
    });
  };

  const remover = (index: number) => {
    setFotos(f => {
      const alvo = f[index];
      if (alvo.id !== null && alvo.urlOriginal) setRemovidas(r => [...r, { id: alvo.id!, urlOriginal: alvo.urlOriginal! }]);
      return f.filter((_, i) => i !== index);
    });
  };

  return { fotos, removidas, adicionarCamera, adicionarGaleria, substituir, atualizarDescricao, mover, remover };
}

export default function Editar({ route, navigation }: any) {
  const { operacao, agricultor } = route.params;

  // DADOS BASE
  const [nifap, setNifap] = useState(agricultor.nifap);
  const [nOperacao, setNOperacao] = useState(operacao.n_operacao);
  const [dataVisita, setDataVisita] = useState(operacao.data_visita);
  
  // DADOS NOVOS PARA EDIÇÃO
  const [nPedido, setNPedido] = useState(operacao.n_pedido || '');
  const [nomePromotor, setNomePromotor] = useState(operacao.nome_promotor || '');
  const [concelho, setConcelho] = useState(operacao.concelho || '');
  const [freguesia, setFreguesia] = useState(operacao.freguesia || '');
  const [investimentoTotal, setInvestimentoTotal] = useState(operacao.investimento_total || '');
  const [apoioAtribuido, setApoioAtribuido] = useState(operacao.apoio_atribuido || '');
  const [regrasPublicidade, setRegrasPublicidade] = useState(operacao.regras_publicidade || '');
  const [confrontoDocumentos, setConfrontoDocumentos] = useState(operacao.confronto_documentos || '');
  const [controloVisual, setControloVisual] = useState(operacao.controlo_visual || '');
  const [outrasVerificacoes, setOutrasVerificacoes] = useState(operacao.outras_verificacoes || '');
  const [verificacao1a, setVerificacao1a] = useState(operacao.verificacao_1a || '');
  const [verificacao1b, setVerificacao1b] = useState(operacao.verificacao_1b || '');
  const [descJustificacao, setDescJustificacao] = useState(operacao.desconformidades_just || '');
  const [descIrregularidade, setDescIrregularidade] = useState(operacao.desconformidades_irreg || '');
  const [nomeTecnico, setNomeTecnico] = useState(operacao.nome_tecnico || '');
  const [numTecnico, setNumTecnico] = useState(operacao.num_tecnico || '');
  const [temSegundoTecnico, setTemSegundoTecnico] = useState(!!operacao.nome_tecnico_2);
  const [nomeTecnico2, setNomeTecnico2] = useState(operacao.nome_tecnico_2 || '');
  const [numTecnico2, setNumTecnico2] = useState(operacao.num_tecnico_2 || '');

  // ANEXOS
  const anexo1 = useAnexo(operacao.anexo1_url, operacao.anexo1_nome);
  const anexo2a = useAnexo(operacao.anexo2a_url, operacao.anexo2a_nome);
  const anexo2b = useAnexo(operacao.anexo2b_url, operacao.anexo2b_nome);
  const anexo2c = useAnexo(operacao.anexo2c_url, operacao.anexo2c_nome);

  const anexo3Fotos = useFotosAnexo([...operacao.fotos].filter((f: any) => !f.is_anexo4).sort((a: any, b: any) => (a.ordem || 0) - (b.ordem || 0)));
  const anexo4Fotos = useFotosAnexo([...operacao.fotos].filter((f: any) => f.is_anexo4).sort((a: any, b: any) => (a.ordem || 0) - (b.ordem || 0)));

  const guardarAlteracoes = async () => {
    try {
      let finalNifapId = agricultor.id;
      if (nifap !== agricultor.nifap) {
         const { data: nExiste } = await supabase.from('nifaps').select('id').eq('nifap', nifap).maybeSingle();
         if (nExiste) finalNifapId = nExiste.id;
         else {
           const { data: nNovo } = await supabase.from('nifaps').insert([{nifap}]).select('id').single();
           finalNifapId = nNovo.id;
         }
      }

      const processarAnexo = async (estado: ReturnType<typeof useAnexo>, sufixo: string): Promise<{ url: string | null; nome: string | null }> => {
        let url = estado.urlAtual || null;
        let nome = estado.urlAtual ? estado.nomeOriginal : null;

        if (estado.removido || estado.novo) {
          if (estado.urlAtual) {
            const urlSemParams = estado.urlAtual.split('?')[0];
            const caminho = urlSemParams.substring(urlSemParams.lastIndexOf('/') + 1);
            await supabase.storage.from('fotos_relatorio').remove([caminho]);
          }
          if (estado.novo) {
            const nomeFicheiro = `${nifap}_${nOperacao}_${sufixo}_${Date.now()}.pdf`;
            if (Platform.OS === 'web') {
              const response = await fetch(estado.novo.uri);
              const blob = await response.blob();
              await supabase.storage.from('fotos_relatorio').upload(nomeFicheiro, blob, { contentType: 'application/pdf' });
            } else {
              const base64 = await FileSystem.readAsStringAsync(estado.novo.uri, { encoding: 'base64' });
              await supabase.storage.from('fotos_relatorio').upload(nomeFicheiro, decode(base64), { contentType: 'application/pdf' });
            }
            const { data } = supabase.storage.from('fotos_relatorio').getPublicUrl(nomeFicheiro);
            url = data.publicUrl;
            nome = estado.novo.nome;
          } else {
            url = null;
            nome = null;
          }
        }
        return { url, nome };
      };

      const [r1, r2a, r2b, r2c] = await Promise.all([
        processarAnexo(anexo1, 'anexo1'),
        processarAnexo(anexo2a, 'anexo2a'),
        processarAnexo(anexo2b, 'anexo2b'),
        processarAnexo(anexo2c, 'anexo2c'),
      ]);

      await supabase.from('operacoes').update({
        nifap_id: finalNifapId,
        n_operacao: nOperacao,
        data_visita: dataVisita,
        n_pedido: nPedido,
        nome_promotor: nomePromotor,
        concelho: concelho,
        freguesia: freguesia,
        investimento_total: investimentoTotal,
        apoio_atribuido: apoioAtribuido,
        verificacao_1a: verificacao1a,
        verificacao_1b: verificacao1b,
        regras_publicidade: regrasPublicidade,
        confronto_documentos: confrontoDocumentos,
        controlo_visual: controloVisual,
        outras_verificacoes: outrasVerificacoes,
        desconformidades_just: descJustificacao,
        desconformidades_irreg: descIrregularidade,
        nome_tecnico: nomeTecnico,
        num_tecnico: numTecnico,
        nome_tecnico_2: temSegundoTecnico ? nomeTecnico2 : null,
        num_tecnico_2: temSegundoTecnico ? numTecnico2 : null,
        anexo1_url: r1.url,
        anexo1_nome: r1.nome,
        anexo2a_url: r2a.url,
        anexo2a_nome: r2a.nome,
        anexo2b_url: r2b.url,
        anexo2b_nome: r2b.nome,
        anexo2c_url: r2c.url,
        anexo2c_nome: r2c.nome
      }).eq('id', operacao.id);

      const apagarDoStorage = async (urlOriginal: string) => {
        const semParams = urlOriginal.split('?')[0];
        const caminho = semParams.substring(semParams.lastIndexOf('/') + 1);
        await supabase.storage.from('fotos_relatorio').remove([caminho]);
      };

      const processarFotos = async (estado: ReturnType<typeof useFotosAnexo>, isAnexo4: boolean) => {
        for (const removida of estado.removidas) {
          await apagarDoStorage(removida.urlOriginal);
          await supabase.from('fotos').delete().eq('id', removida.id);
        }

        for (let i = 0; i < estado.fotos.length; i++) {
          const item = estado.fotos[i];
          if (item.novaUri) {
            if (item.id !== null && item.urlOriginal) await apagarDoStorage(item.urlOriginal);
            const nomeFicheiro = `${nifap}_${nOperacao}_${isAnexo4 ? 'a4_' : ''}edit_${Date.now()}_${i}.jpg`;
            if (Platform.OS === 'web') {
              const response = await fetch(item.novaUri);
              const blob = await response.blob();
              await supabase.storage.from('fotos_relatorio').upload(nomeFicheiro, blob, { contentType: 'image/jpeg' });
            } else {
              const base64 = await FileSystem.readAsStringAsync(item.novaUri, { encoding: 'base64' });
              await supabase.storage.from('fotos_relatorio').upload(nomeFicheiro, decode(base64), { contentType: 'image/jpeg' });
            }
            const { data } = supabase.storage.from('fotos_relatorio').getPublicUrl(nomeFicheiro);
            if (item.id !== null) {
              await supabase.from('fotos').update({ descricao: item.descricao, foto_url: data.publicUrl, ordem: i }).eq('id', item.id);
            } else {
              await supabase.from('fotos').insert([{ operacao_id: operacao.id, descricao: item.descricao, foto_url: data.publicUrl, ordem: i, is_anexo4: isAnexo4 }]);
            }
          } else if (item.id !== null) {
            await supabase.from('fotos').update({ descricao: item.descricao, ordem: i }).eq('id', item.id);
          }
        }
      };

      await processarFotos(anexo3Fotos, false);
      await processarFotos(anexo4Fotos, true);

      alert('Relatório atualizado com sucesso!');
      navigation.goBack();
    } catch (error: any) { alert('Erro: ' + error.message); }
  };

  const webStyle = Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {};

  const renderAnexoBox = (titulo: string, estado: ReturnType<typeof useAnexo>) => (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>{titulo}</Text>
      {estado.nomeAtual ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text style={{ flex: 1, fontSize: 14, color: '#334155', fontWeight: '600' }} numberOfLines={1}>{estado.nomeAtual}</Text>
          <TouchableOpacity style={styles.btnAddTecnico} onPress={estado.escolher}>
            <Text style={styles.btnAddTecnicoText}>Substituir</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnRemover} onPress={estado.remover}>
            <Text style={styles.btnRemoverText}>Remover</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={styles.btnAddTecnico} onPress={estado.escolher}>
          <Text style={styles.btnAddTecnicoText}>+ Adicionar {titulo} (PDF)</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderListaFotos = (estado: ReturnType<typeof useFotosAnexo>) => (
    <>
      <View style={styles.actionsRow}>
        <TouchableOpacity style={[styles.btnAddTecnico, { flex: 1 }]} onPress={estado.adicionarCamera}>
          {Platform.OS !== 'web' && <MaterialIcons name="photo-camera" size={20} color="#004b87" />}
          <Text style={styles.btnAddTecnicoText}>Tirar Foto</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btnAddTecnico, { flex: 1 }]} onPress={estado.adicionarGaleria}>
          {Platform.OS !== 'web' && <MaterialIcons name="photo-library" size={20} color="#004b87" />}
          <Text style={styles.btnAddTecnicoText}>Galeria</Text>
        </TouchableOpacity>
      </View>

      {estado.fotos.map((item, index) => (
        <View key={item.id ?? `novo-${index}`} style={styles.fotoContainer}>
          <View style={styles.controlsRow}>
            <View style={{ flexDirection: 'row', flex: 1, gap: 10, marginRight: 10 }}>
              <TouchableOpacity style={[styles.dragHandle, { flex: 1, opacity: index === 0 ? 0.5 : 1 }]} onPress={() => estado.mover(index, 'cima')} disabled={index === 0}><Text style={styles.dragText}>↑ Subir</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.dragHandle, { flex: 1, opacity: index === estado.fotos.length - 1 ? 0.5 : 1 }]} onPress={() => estado.mover(index, 'baixo')} disabled={index === estado.fotos.length - 1}><Text style={styles.dragText}>↓ Descer</Text></TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.btnRemover} onPress={() => estado.remover(index)}><Text style={styles.btnRemoverText}>Remover</Text></TouchableOpacity>
          </View>
          <Image source={{ uri: item.foto_url }} style={styles.imagem} />
          <TouchableOpacity style={styles.btnAddTecnico} onPress={() => estado.substituir(index)}>
            {Platform.OS !== 'web' && <MaterialIcons name="image" size={18} color="#004b87" />}
            <Text style={styles.btnAddTecnicoText}>Substituir Foto</Text>
          </TouchableOpacity>
          <TextInput style={[styles.input, styles.textArea, webStyle]} value={item.descricao} onChangeText={(text) => estado.atualizarDescricao(text, index)} placeholder="Descrição" multiline />
        </View>
      ))}
    </>
  );

  const renderHeader = () => (
    <View>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Identificação</Text>
        <Text style={styles.label}>NIFAP</Text><TextInput style={[styles.input, webStyle]} value={nifap} onChangeText={setNifap} />
        <Text style={styles.label}>Nº Operação</Text><TextInput style={[styles.input, webStyle]} value={nOperacao} onChangeText={setNOperacao} />
        <Text style={styles.label}>Nº Pedido</Text><TextInput style={[styles.input, webStyle]} value={nPedido} onChangeText={setNPedido} />
        <Text style={styles.label}>Nome do Promotor</Text><TextInput style={[styles.input, webStyle]} value={nomePromotor} onChangeText={setNomePromotor} />
        <Text style={styles.label}>Data da Visita</Text><TextInput style={[styles.input, webStyle]} value={dataVisita} onChangeText={setDataVisita} />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Localização e Valores</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}><Text style={styles.label}>Concelho</Text><TextInput style={[styles.input, webStyle]} value={concelho} onChangeText={setConcelho} /></View>
          <View style={{ flex: 1 }}><Text style={styles.label}>Freguesia</Text><TextInput style={[styles.input, webStyle]} value={freguesia} onChangeText={setFreguesia} /></View>
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}><Text style={styles.label}>Invest. Total</Text><TextInput style={[styles.input, webStyle]} value={investimentoTotal} onChangeText={setInvestimentoTotal} /></View>
          <View style={{ flex: 1 }}><Text style={styles.label}>Apoio Atribuído</Text><TextInput style={[styles.input, webStyle]} value={apoioAtribuido} onChangeText={setApoioAtribuido} /></View>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Análise e Verificações</Text>
        <Text style={styles.label}>1 a) Identificação dos itens</Text>
        <TextInput style={[styles.input, styles.textArea, webStyle]} value={verificacao1a} onChangeText={setVerificacao1a} multiline />

        <Text style={styles.label}>1 b) Investimento na globalidade</Text>
        <TextInput style={[styles.input, styles.textArea, webStyle]} value={verificacao1b} onChangeText={setVerificacao1b} multiline />

        <Text style={styles.label}>2 - Regras de Publicidade</Text>
        <TextInput style={[styles.input, webStyle]} value={regrasPublicidade} onChangeText={setRegrasPublicidade} />

        <Text style={styles.label}>3 - Confronto de Documentos</Text>
        <TextInput style={[styles.input, webStyle]} value={confrontoDocumentos} onChangeText={setConfrontoDocumentos} />

        <Text style={styles.label}>4 - Controlo Visual da Exploração</Text>
        <TextInput style={[styles.input, styles.textArea, webStyle]} multiline value={controloVisual} onChangeText={setControloVisual} />

        <Text style={styles.label}>5 - Outras Verificações</Text>
        <TextInput style={[styles.input, styles.textArea, webStyle]} multiline value={outrasVerificacoes} onChangeText={setOutrasVerificacoes} />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Desconformidades e Assinaturas</Text>
        <Text style={styles.label}>6 - Desconformidade (Justificação e Irregularidade)</Text>
        <TextInput style={[styles.input, styles.textArea, webStyle]} value={descIrregularidade} onChangeText={setDescIrregularidade} multiline />

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 2 }}><Text style={styles.label}>7 - Nome do Técnico</Text><TextInput style={[styles.input, webStyle]} value={nomeTecnico} onChangeText={setNomeTecnico} /></View>
          <View style={{ flex: 1 }}><Text style={styles.label}>Número</Text><TextInput style={[styles.input, webStyle]} value={numTecnico} onChangeText={setNumTecnico} /></View>
        </View>

        {temSegundoTecnico ? (
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
            <View style={{ flex: 2 }}><Text style={styles.label}>2º Técnico</Text><TextInput style={[styles.input, webStyle]} value={nomeTecnico2} onChangeText={setNomeTecnico2} /></View>
            <View style={{ flex: 1 }}><Text style={styles.label}>Número</Text><TextInput style={[styles.input, webStyle]} value={numTecnico2} onChangeText={setNumTecnico2} /></View>
            <TouchableOpacity
              style={[styles.btnRemover, { marginTop: 19 }]}
              onPress={() => { setTemSegundoTecnico(false); setNomeTecnico2(''); setNumTecnico2(''); }}
            >
              <Text style={styles.btnRemoverText}>Remover</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.btnAddTecnico} onPress={() => setTemSegundoTecnico(true)}>
            <Text style={styles.btnAddTecnicoText}>+ Adicionar 2º Técnico</Text>
          </TouchableOpacity>
        )}
      </View>

      {renderAnexoBox('Anexo I', anexo1)}
      {renderAnexoBox('Anexo II A', anexo2a)}
      {renderAnexoBox('Anexo II B', anexo2b)}
      {renderAnexoBox('Anexo II C', anexo2c)}

      <Text style={styles.sectionTitleOutside}>Anexo III - Registo Fotográfico</Text>
      {renderListaFotos(anexo3Fotos)}

      <Text style={styles.sectionTitleOutside}>Anexo IV - Esquema Geral dos Investimentos Realizados (opcional)</Text>
      {renderListaFotos(anexo4Fotos)}
    </View>
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#f3f4f6' }} contentContainerStyle={styles.container}>
      {renderHeader()}
      <TouchableOpacity style={styles.btnGuardar} onPress={guardarAlteracoes}>
        <Text style={styles.btnGuardarText}>Guardar Alterações</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  card: { backgroundColor: 'white', padding: 15, borderRadius: 10, marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginTop: 10, marginBottom: 15, color: '#1f2937' },
  sectionTitleOutside: { fontSize: 16, fontWeight: 'bold', marginBottom: 15, color: '#1f2937', paddingLeft: 5 },
  actionsRow: { flexDirection: 'row', gap: 10, marginBottom: 15 },
  btnAddTecnico: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0f9ff', paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: '#bae6fd', marginTop: 4 },
  btnAddTecnicoText: { color: '#004b87', fontWeight: '700', fontSize: 13 },
  label: { fontSize: 11, fontWeight: 'bold', color: '#4b5563', marginBottom: 5, textTransform: 'uppercase' },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 10, marginBottom: 15, backgroundColor: '#f9fafb', fontSize: 14 },
  textArea: { height: 80, textAlignVertical: 'top' },
  fotoContainer: { backgroundColor: 'white', padding: 15, borderRadius: 10, marginBottom: 15 },
  controlsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15, alignItems: 'center' },
  dragHandle: { backgroundColor: '#e5e7eb', padding: 12, borderRadius: 8, flex: 1, marginRight: 10, alignItems: 'center' },
  dragText: { fontWeight: 'bold', color: '#4b5563', fontSize: 14 },
  btnRemover: { backgroundColor: '#fef2f2', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#fecaca' },
  btnRemoverText: { color: '#ef4444', fontWeight: 'bold', fontSize: 14 },
  imagem: { width: '100%', height: 250, borderRadius: 8, marginBottom: 15 },
  btnGuardar: { backgroundColor: '#2563eb', padding: 15, borderRadius: 8, alignItems: 'center', marginVertical: 20, marginBottom: 40 },
  btnGuardarText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});