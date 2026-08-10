// Comprovantes: a foto escolhida vai pro diretório do app, senão o arquivo
// some quando o Android limpa o cache e a miniatura fica quebrada.

import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';

const FOLDER = 'comprovantes';

function receiptsDir() {
  const dir = new Directory(Paths.document, FOLDER);
  if (!dir.exists) dir.create({ intermediates: true });
  return dir;
}

function persist(uri) {
  const source = new File(uri);
  const extension = source.name?.includes('.') ? source.name.split('.').pop() : 'jpg';
  const destination = new File(receiptsDir(), `${Date.now()}.${extension}`);
  source.copy(destination);
  return destination.uri;
}

// Retorna a uri salva, ou null se a pessoa cancelou / negou a permissão.
export async function pickReceipt(fromCamera = false) {
  const permission = fromCamera
    ? await ImagePicker.requestCameraPermissionsAsync()
    : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return null;

  const options = { mediaTypes: 'images', quality: 0.6, allowsEditing: false };
  const result = fromCamera
    ? await ImagePicker.launchCameraAsync(options)
    : await ImagePicker.launchImageLibraryAsync(options);

  if (result.canceled || !result.assets?.length) return null;
  return persist(result.assets[0].uri);
}

export function deleteReceipt(uri) {
  if (!uri) return;
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // Comprovante já sumiu do disco — não é motivo pra quebrar a tela.
  }
}
