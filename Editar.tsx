import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, StyleSheet, Platform, ScrollView } from 'react-native';
import { supabase } from './supabase';
import DraggableFlatList, { ScaleDecorator, RenderItemParams } from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { LogBox } from 'react-native';

LogBox.ignoreLogs(['InteractionManager has been deprecated']);  

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

  const fotosIniciais = [...operacao.fotos].sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
  const [fotos, setFotos] = useState(fotosIniciais);
  const [fotosRemovidas, setFotosRemovidas] = useState<number[]>([]);

  const removerFoto = (id: number) => {
    setFotosRemovidas([...fotosRemovidas, id]);
    setFotos(fotos.filter(f => f.id !== id));
  };
  const atualizarDescricao = (texto: string, id: number) => setFotos(fotos.map(f => f.id === id ? { ...f, descricao: texto } : f));
  
  const moverFotoWeb = (index: number, direcao: 'cima' | 'baixo') => {
    if (direcao === 'cima' && index === 0) return;
    if (direcao === 'baixo' && index === fotos.length - 1) return;
    const novasFotos = [...fotos];
    const novaPosicao = direcao === 'cima' ? index - 1 : index + 1;
    [novasFotos[index], novasFotos[novaPosicao]] = [novasFotos[novaPosicao], novasFotos[index]];
    setFotos(novasFotos);
  };

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
        num_tecnico_2: temSegundoTecnico ? numTecnico2 : null
      }).eq('id', operacao.id);

      for (let i = 0; i < fotos.length; i++) {
        await supabase.from('fotos').update({ descricao: fotos[i].descricao, ordem: i }).eq('id', fotos[i].id);
      }
      if (fotosRemovidas.length > 0) {
        for (const id of fotosRemovidas) await supabase.from('fotos').delete().eq('id', id);
      }

      alert('Relatório atualizado com sucesso!');
      navigation.goBack();
    } catch (error: any) { alert('Erro: ' + error.message); }
  };

  const webStyle = Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {};

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

      <Text style={styles.sectionTitleOutside}>Organizar Fotos</Text>
    </View>
  );

  const renderFooter = () => (
    <TouchableOpacity style={styles.btnGuardar} onPress={guardarAlteracoes}>
      <Text style={styles.btnGuardarText}>Guardar Alterações</Text>
    </TouchableOpacity>
  );

  if (Platform.OS === 'web') {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: '#f3f4f6' }} contentContainerStyle={styles.container}>
        {renderHeader()}
        {fotos.map((item, index) => (
          <View key={item.id} style={styles.fotoContainer}>
            <View style={styles.controlsRow}>
              <View style={{ flexDirection: 'row', flex: 1, gap: 10, marginRight: 10 }}>
                <TouchableOpacity style={[styles.dragHandle, { flex: 1, opacity: index === 0 ? 0.5 : 1 }]} onPress={() => moverFotoWeb(index, 'cima')} disabled={index === 0}><Text style={styles.dragText}>↑ Subir</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.dragHandle, { flex: 1, opacity: index === fotos.length - 1 ? 0.5 : 1 }]} onPress={() => moverFotoWeb(index, 'baixo')} disabled={index === fotos.length - 1}><Text style={styles.dragText}>↓ Descer</Text></TouchableOpacity>
              </View>
              <TouchableOpacity style={styles.btnRemover} onPress={() => removerFoto(item.id)}><Text style={styles.btnRemoverText}>Remover</Text></TouchableOpacity>
            </View>
            <Image source={{ uri: item.foto_url }} style={styles.imagem} />
            <TextInput style={[styles.input, styles.textArea, webStyle]} value={item.descricao} onChangeText={(text) => atualizarDescricao(text, item.id)} placeholder="Descrição" multiline />
          </View>
        ))}
        {renderFooter()}
      </ScrollView>
    );
  }

  const renderItemMobile = ({ item, drag, isActive }: RenderItemParams<any>) => (
    <ScaleDecorator>
      <View style={[styles.fotoContainer, { opacity: isActive ? 0.9 : 1, elevation: isActive ? 10 : 0 }]}>
        <View style={styles.controlsRow}>
          <TouchableOpacity style={styles.dragHandle} onLongPress={drag} delayLongPress={150}><Text style={styles.dragText}>☰ Manter premido</Text></TouchableOpacity>
          <TouchableOpacity style={styles.btnRemover} onPress={() => removerFoto(item.id)}><Text style={styles.btnRemoverText}>Remover</Text></TouchableOpacity>
        </View>
        <Image source={{ uri: item.foto_url }} style={styles.imagem} />
        <TextInput style={[styles.input, styles.textArea]} value={item.descricao} onChangeText={(text) => atualizarDescricao(text, item.id)} multiline />
      </View>
    </ScaleDecorator>
  );

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#f3f4f6' }}>
      <DraggableFlatList style={{ flex: 1 }} data={fotos} onDragEnd={({ data }) => setFotos(data)} keyExtractor={(item) => item.id.toString()} renderItem={renderItemMobile} ListHeaderComponent={renderHeader} ListFooterComponent={renderFooter} contentContainerStyle={styles.container} />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  card: { backgroundColor: 'white', padding: 15, borderRadius: 10, marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginTop: 10, marginBottom: 15, color: '#1f2937' },
  sectionTitleOutside: { fontSize: 16, fontWeight: 'bold', marginBottom: 15, color: '#1f2937', paddingLeft: 5 },
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