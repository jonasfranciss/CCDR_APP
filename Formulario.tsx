import { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Image, ActivityIndicator, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { supabase } from './supabase';

interface FotoData { uri: string; descricao: string; }

export default function Formulario() {
  const [nifap, setNifap] = useState('');
  const [nOperacao, setNOperacao] = useState('');
  const [dataVisita, setDataVisita] = useState(new Date().toISOString().split('T')[0]);
  
  const [nPedido, setNPedido] = useState('');
  const [nomePromotor, setNomePromotor] = useState('');
  const [concelho, setConcelho] = useState('');
  const [freguesia, setFreguesia] = useState('');
  const [investimentoTotal, setInvestimentoTotal] = useState('');
  const [apoioAtribuido, setApoioAtribuido] = useState('');
  
  // CAMPOS 1 A 5 PRÉ-PREENCHIDOS
  const [verificacao1a, setVerificacao1a] = useState('Foram executados e verificados os investimentos aprovados conforme consta do "Anexo II A e Anexo III Investimentos Realizados e Registo fotográfico"');
  const [verificacao1b, setVerificacao1b] = useState('Os investimentos encontram-se executados de acordo com o "Anexo II A – Investimentos Realizados".');
  const [regrasPublicidade, setRegrasPublicidade] = useState('Não aplicável');
  const [confrontoDocumentos, setConfrontoDocumentos] = useState('Não aplicável');
  const [controloVisual, setControloVisual] = useState('À data da visita, as culturas objeto do investimento — pereiras e vinha — apresentavam um desenvolvimento vegetativo normal e adequado à época do ano.\nAs operações culturais observadas encontravam-se igualmente em conformidade com o estado fenológico das culturas e com as práticas culturais expectáveis para a época.');
  const [outrasVerificacoes, setOutrasVerificacoes] = useState('O promotor, acompanhou a visita e respondeu a todas as questões relativas com o investimento realizado, assim como sobre o funcionamento do quotidiano e gestão da exploração.\nA exploração agrícola em causa, dedica-se à produção frutícola (maçã, peras e uva para vinho).\nNão foram observados vestígios de plásticos, sacos, recipientes de adubos, pesticidas ou outros resíduos, dispersos nas parcelas.\nForam recolhidos registos fotográficos de todos os investimentos verificados, para a avaliação da execução dos mesmos, os quais fazem parte do Anexo III – Registo Fotográfico.');
  
  // CAMPO 6 E 7 COMPLETAMENTE VAZIOS
  const [descIrregularidade, setDescIrregularidade] = useState('');
  const [nomeTecnico, setNomeTecnico] = useState('');
  const [numTecnico, setNumTecnico] = useState('');
  const [temSegundoTecnico, setTemSegundoTecnico] = useState(false);
  const [nomeTecnico2, setNomeTecnico2] = useState('');
  const [numTecnico2, setNumTecnico2] = useState('');

  const [fotos, setFotos] = useState<FotoData[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const adicionarCamera = async () => {
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (!result.canceled) setFotos([...fotos, { uri: result.assets[0].uri, descricao: '' }]);
  };

  const adicionarGaleria = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.7, allowsMultipleSelection: true });
    if (!result.canceled) {
      const novasFotos = result.assets.map(asset => ({ uri: asset.uri, descricao: '' }));
      setFotos([...fotos, ...novasFotos]);
    }
  };

  const moverFoto = (index: number, direcao: 'cima' | 'baixo') => {
    if (direcao === 'cima' && index === 0) return;
    if (direcao === 'baixo' && index === fotos.length - 1) return;
    const novasFotos = [...fotos];
    const novaPosicao = direcao === 'cima' ? index - 1 : index + 1;
    [novasFotos[index], novasFotos[novaPosicao]] = [novasFotos[novaPosicao], novasFotos[index]];
    setFotos(novasFotos);
  };
  const atualizarDescricao = (texto: string, index: number) => { const novasFotos = [...fotos]; novasFotos[index].descricao = texto; setFotos(novasFotos); };
  const removerFoto = (index: number) => setFotos(fotos.filter((_, i) => i !== index));

  const guardarRelatorio = async () => {
    if (!nifap || !nOperacao || fotos.length === 0) { alert('Preenche os dados obrigatórios e adiciona pelo menos uma fotografia.'); return; }
    setIsSubmitting(true);
    try {
      let nifapId;
      const { data: nExistente, error: errBusca } = await supabase.from('nifaps').select('id').eq('nifap', nifap).maybeSingle();
      if (errBusca) throw new Error('Erro na busca do NIFAP');
      if (nExistente) nifapId = nExistente.id;
      else {
        const { data: nNovo, error: errCriar } = await supabase.from('nifaps').insert([{ nifap }]).select('id').single();
        if (errCriar) throw new Error('Erro a criar NIFAP');
        nifapId = nNovo.id;
      }

      const { data: nOp, error: errOp } = await supabase.from('operacoes').insert([{ 
        nifap_id: nifapId, n_operacao: nOperacao, data_visita: dataVisita, n_pedido: nPedido, nome_promotor: nomePromotor,
        concelho: concelho, freguesia: freguesia, investimento_total: investimentoTotal, apoio_atribuido: apoioAtribuido,
        verificacao_1a: verificacao1a, verificacao_1b: verificacao1b,
        regras_publicidade: regrasPublicidade, confronto_documentos: confrontoDocumentos, controlo_visual: controloVisual,
        outras_verificacoes: outrasVerificacoes, desconformidades_irreg: descIrregularidade,
        nome_tecnico: nomeTecnico, num_tecnico: numTecnico,
        nome_tecnico_2: temSegundoTecnico ? nomeTecnico2 : null, num_tecnico_2: temSegundoTecnico ? numTecnico2 : null
      }]).select('id').single();
      if (errOp) throw new Error('Erro a criar Operação');

      for (let i = 0; i < fotos.length; i++) {
        const foto = fotos[i];
        const nomeFicheiro = `${nifap}_${nOperacao}_${Date.now()}_${i}.jpg`;
        if (Platform.OS === 'web') {
          const response = await fetch(foto.uri);
          const blob = await response.blob();
          await supabase.storage.from('fotos_relatorio').upload(nomeFicheiro, blob, { contentType: 'image/jpeg' });
        } else {
          const base64 = await FileSystem.readAsStringAsync(foto.uri, { encoding: 'base64' });
          await supabase.storage.from('fotos_relatorio').upload(nomeFicheiro, decode(base64), { contentType: 'image/jpeg' });
        }
        const { data: urlData } = supabase.storage.from('fotos_relatorio').getPublicUrl(nomeFicheiro);
        await supabase.from('fotos').insert([{ operacao_id: nOp.id, descricao: foto.descricao, foto_url: urlData.publicUrl, ordem: i }]);
      }
      alert('Registo guardado com sucesso!');
      setNifap(''); setNOperacao(''); setFotos([]); setNomePromotor('');
    } catch (error: any) { alert(error.message); } finally { setIsSubmitting(false); }
  };

  const webStyle = Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {};

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.container}>
      
      <Text style={styles.sectionTitle}>Identificação</Text>
      <View style={styles.card}>
        <Text style={styles.label}>NIFAP *</Text><TextInput style={[styles.input, webStyle]} value={nifap} onChangeText={setNifap} keyboardType="numeric" />
        <Text style={styles.label}>Nº Operação *</Text><TextInput style={[styles.input, webStyle]} value={nOperacao} onChangeText={setNOperacao} />
        <Text style={styles.label}>Nº Pedido</Text><TextInput style={[styles.input, webStyle]} value={nPedido} onChangeText={setNPedido} />
        <Text style={styles.label}>Nome do Promotor</Text><TextInput style={[styles.input, webStyle]} value={nomePromotor} onChangeText={setNomePromotor} />
        <Text style={styles.label}>Data da Visita</Text><TextInput style={[styles.input, webStyle]} value={dataVisita} onChangeText={setDataVisita} />
      </View>

      <Text style={styles.sectionTitle}>Localização e Valores</Text>
      <View style={styles.card}>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}><Text style={styles.label}>Concelho</Text><TextInput style={[styles.input, webStyle]} value={concelho} onChangeText={setConcelho} /></View>
          <View style={{ flex: 1 }}><Text style={styles.label}>Freguesia</Text><TextInput style={[styles.input, webStyle]} value={freguesia} onChangeText={setFreguesia} /></View>
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}><Text style={styles.label}>Invest. Total</Text><TextInput style={[styles.input, webStyle]} value={investimentoTotal} onChangeText={setInvestimentoTotal} /></View>
          <View style={{ flex: 1 }}><Text style={styles.label}>Apoio Atribuído</Text><TextInput style={[styles.input, webStyle]} value={apoioAtribuido} onChangeText={setApoioAtribuido} /></View>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Análise e Verificações</Text>
      <View style={styles.card}>
        <Text style={styles.label}>1 a) Identificação dos itens</Text>
        <TextInput style={[styles.input, styles.textArea, webStyle]} value={verificacao1a} onChangeText={setVerificacao1a} multiline />
        
        <Text style={styles.label}>1 b) Investimento na globalidade</Text>
        <TextInput style={[styles.input, styles.textArea, webStyle]} value={verificacao1b} onChangeText={setVerificacao1b} multiline />

        <Text style={styles.label}>2 - Regras de Publicidade</Text>
        <TextInput style={[styles.input, webStyle]} value={regrasPublicidade} onChangeText={setRegrasPublicidade} />
        
        <Text style={styles.label}>3 - Confronto de Documentos</Text>
        <TextInput style={[styles.input, webStyle]} value={confrontoDocumentos} onChangeText={setConfrontoDocumentos} />
        
        <Text style={styles.label}>4 - Controlo Visual da Exploração</Text>
        <TextInput style={[styles.input, styles.textArea, webStyle]} value={controloVisual} onChangeText={setControloVisual} multiline />
        
        <Text style={styles.label}>5 - Outras Verificações</Text>
        <TextInput style={[styles.input, styles.textArea, webStyle]} value={outrasVerificacoes} onChangeText={setOutrasVerificacoes} multiline />
      </View>

      <Text style={styles.sectionTitle}>Desconformidades e Assinaturas</Text>
      <View style={styles.card}>
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
              style={[styles.iconBtnDanger, { marginTop: 19 }]}
              onPress={() => { setTemSegundoTecnico(false); setNomeTecnico2(''); setNumTecnico2(''); }}
            >
              {Platform.OS !== 'web' && <MaterialIcons name="delete" size={20} color="#ef4444" />}
              <Text style={styles.iconBtnDangerText}>Remover</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.btnAddTecnico} onPress={() => setTemSegundoTecnico(true)}>
            {Platform.OS !== 'web' && <MaterialIcons name="person-add" size={18} color="#004b87" />}
            <Text style={styles.btnAddTecnicoText}>+ Adicionar 2º Técnico</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.sectionTitle}>Anexo III - Registo Fotográfico</Text>
      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.btnPrimary} onPress={adicionarCamera}>
          {Platform.OS !== 'web' && <MaterialIcons name="photo-camera" size={22} color="#ffffff" />}
          <Text style={styles.btnPrimaryText}>Tirar Foto</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnSecondary} onPress={adicionarGaleria}>
          {Platform.OS !== 'web' && <MaterialIcons name="photo-library" size={22} color="#004b87" />}
          <Text style={styles.btnSecondaryText}>Galeria</Text>
        </TouchableOpacity>
      </View>

      {fotos.map((foto, index) => (
        <View key={index} style={styles.fotoCard}>
          <View style={styles.fotoHeader}><Text style={styles.fotoIndex}>F{index + 1}</Text></View>
          <Image source={{ uri: foto.uri }} style={styles.imagem} />
          <View style={styles.fotoContent}>
            <TextInput style={[styles.fotoInput, webStyle]} value={foto.descricao} onChangeText={(text) => atualizarDescricao(text, index)} multiline />
            <View style={styles.fotoControls}>
              <View style={styles.orderControls}>
                <TouchableOpacity style={styles.iconBtn} onPress={() => moverFoto(index, 'cima')} disabled={index === 0}>
                  {Platform.OS !== 'web' ? <MaterialIcons name="arrow-upward" size={20} color={index === 0 ? "#cbd5e1" : "#475569"} /> : <Text style={{fontWeight: 'bold', fontSize: 16, color: index === 0 ? "#cbd5e1" : "#475569"}}>↑</Text>}
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconBtn} onPress={() => moverFoto(index, 'baixo')} disabled={index === fotos.length - 1}>
                  {Platform.OS !== 'web' ? <MaterialIcons name="arrow-downward" size={20} color={index === fotos.length - 1 ? "#cbd5e1" : "#475569"} /> : <Text style={{fontWeight: 'bold', fontSize: 16, color: index === fotos.length - 1 ? "#cbd5e1" : "#475569"}}>↓</Text>}
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={styles.iconBtnDanger} onPress={() => removerFoto(index)}>
                {Platform.OS !== 'web' && <MaterialIcons name="delete" size={20} color="#ef4444" />}
                <Text style={styles.iconBtnDangerText}>Remover</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ))}

      {fotos.length > 0 && (
        <TouchableOpacity style={styles.btnSubmit} onPress={guardarRelatorio} disabled={isSubmitting}>
          {isSubmitting ? <ActivityIndicator color="white" /> : <Text style={styles.btnSubmitText}>Guardar Registo Completo</Text>}
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#f8fafc', padding: 20 },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: '#004b87', textTransform: 'uppercase', marginBottom: 12, letterSpacing: 0.5, marginTop: 10 },
  card: { backgroundColor: '#ffffff', padding: 20, borderRadius: 12, marginBottom: 25, borderWidth: 1, borderColor: '#e2e8f0' },
  label: { fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: '700', marginBottom: 6, letterSpacing: 0.5 },
  input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 12, fontSize: 14, color: '#0f172a', marginBottom: 16 },
  textArea: { minHeight: 90, textAlignVertical: 'top' },
  actionsRow: { flexDirection: 'row', gap: 12, marginBottom: 25 },
  btnPrimary: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#004b87', paddingVertical: 14, borderRadius: 8 },
  btnPrimaryText: { color: '#ffffff', fontWeight: '700', fontSize: 14, marginLeft: 8 },
  btnSecondary: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#cbd5e1', paddingVertical: 14, borderRadius: 8 },
  btnSecondaryText: { color: '#004b87', fontWeight: '700', fontSize: 14, marginLeft: 8 },
  fotoCard: { backgroundColor: '#ffffff', borderRadius: 12, marginBottom: 20, borderWidth: 1, borderColor: '#e2e8f0', overflow: 'hidden' },
  fotoHeader: { position: 'absolute', top: 10, left: 10, zIndex: 1 },
  fotoIndex: { backgroundColor: '#004b87', color: 'white', fontSize: 12, fontWeight: 'bold', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, overflow: 'hidden' },
  imagem: { width: '100%', height: 220, resizeMode: 'cover', backgroundColor: '#e2e8f0' },
  fotoContent: { padding: 15 },
  fotoInput: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, padding: 12, fontSize: 14, color: '#334155', minHeight: 70, textAlignVertical: 'top', marginBottom: 15 },
  fotoControls: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderControls: { flexDirection: 'row', gap: 8 },
  iconBtn: { padding: 8, paddingHorizontal: 12, backgroundColor: '#f1f5f9', borderRadius: 6, borderWidth: 1, borderColor: '#e2e8f0' },
  iconBtnDanger: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, backgroundColor: '#fef2f2', borderRadius: 6, borderWidth: 1, borderColor: '#fecaca' },
  iconBtnDangerText: { color: '#ef4444', fontWeight: '600', fontSize: 13, marginLeft: 4 },
  btnAddTecnico: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0f9ff', paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: '#bae6fd', marginTop: 4 },
  btnAddTecnicoText: { color: '#004b87', fontWeight: '700', fontSize: 13, marginLeft: 6 },
  btnSubmit: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#059669', paddingVertical: 16, borderRadius: 8, marginTop: 10, marginBottom: 40 },
  btnSubmitText: { color: '#ffffff', fontWeight: '700', fontSize: 16, marginLeft: 8 }
});