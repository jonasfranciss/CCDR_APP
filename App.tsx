import 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, TouchableOpacity, StyleSheet, Image, StatusBar, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import Formulario from './Formulario';
import Historico from './Historico';
import Editar from './Editar';

const Stack = createNativeStackNavigator();

const configNavegacaoWeb = {
  prefixes: [],
  config: {
    screens: {
      Menu: '',
      Formulario: 'novo',
      Historico: 'gestao',
      Editar: 'editar',
    }
  }
};

function MenuInicial({ navigation }: any) {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
      
      <View style={styles.header}>
        {/* ATENÇÃO: COLA O TEU LOGOTIPO AQUI */}
        <Image 
          source={{ uri: 'https://nwgmloromztpzbeupzgz.supabase.co/storage/v1/object/public/assets/ccdrn.png' }} 
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.subtitle}>Plataforma de Verificação Física</Text>
      </View>

      <View style={styles.cardsContainer}>
        <TouchableOpacity 
          style={styles.card} 
          onPress={() => navigation.navigate('Formulario')}
          activeOpacity={0.8}
        >
          <View style={[styles.iconContainer, { backgroundColor: '#e0f2fe' }]}>
            {Platform.OS !== 'web' ? (
              <MaterialIcons name="add-a-photo" size={32} color="#005eb8" />
            ) : (
              <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#005eb8' }}>+</Text>
            )}
          </View>
          <Text style={styles.cardTitle}>Novo Registo</Text>
          <Text style={styles.cardDescription}>Criar e documentar um novo relatório de verificação no local com registo fotográfico.</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.card} 
          onPress={() => navigation.navigate('Historico')}
          activeOpacity={0.8}
        >
          <View style={[styles.iconContainer, { backgroundColor: '#f1f5f9' }]}>
            {Platform.OS !== 'web' ? (
              <MaterialIcons name="folder-shared" size={32} color="#475569" />
            ) : (
              <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#475569' }}>≡</Text>
            )}
          </View>
          <Text style={styles.cardTitle}>Gestão de Relatórios</Text>
          <Text style={styles.cardDescription}>Consultar o histórico, editar dados, reorganizar fotos e exportar documentos em formato PDF.</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>CCDR Norte © {new Date().getFullYear()}</Text>
      </View>
    </View>
  );
}

export default function App() {
  return (
    <NavigationContainer linking={configNavegacaoWeb}>
      <Stack.Navigator 
        screenOptions={{ 
          headerStyle: { backgroundColor: '#004b87' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '600' },
          headerBackTitleVisible: false
        }}
      >
        <Stack.Screen name="Menu" component={MenuInicial} options={{ headerShown: false }} />
        <Stack.Screen name="Formulario" component={Formulario} options={{ title: 'Novo Registo' }} />
        <Stack.Screen name="Historico" component={Historico} options={{ title: 'Histórico de Registos' }} />
        <Stack.Screen name="Editar" component={Editar} options={{ title: 'Editar Relatório' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 20 },
  header: { marginTop: 60, marginBottom: 50, alignItems: 'center' },
  logo: { width: 220, height: 90, marginBottom: 15 },
  subtitle: { fontSize: 13, color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.2 },
  cardsContainer: { flex: 1, gap: 20 },
  card: { backgroundColor: '#ffffff', padding: 24, borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#0f172a', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 3 },
  iconContainer: { width: 56, height: 56, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  cardTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a', marginBottom: 8 },
  cardDescription: { fontSize: 14, color: '#64748b', lineHeight: 22 },
  footer: { paddingBottom: 25, alignItems: 'center' },
  footerText: { fontSize: 12, color: '#94a3b8', fontWeight: '600' }
});