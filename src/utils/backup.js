// Backup local: gera o arquivo no cache e abre a folha de compartilhamento
// (WhatsApp, Drive, e-mail...). Importar substitui os dados atuais.

import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as db from '../db';

async function shareText(name, content, mimeType, dialogTitle) {
  const file = new File(Paths.cache, name);
  if (file.exists) file.delete();
  file.create();
  file.write(content);
  await Sharing.shareAsync(file.uri, { mimeType, dialogTitle });
}

export async function exportBackup() {
  const stamp = new Date().toISOString().slice(0, 10);
  await shareText(
    `meubolso-backup-${stamp}.json`,
    JSON.stringify(db.exportAll(), null, 2),
    'application/json',
    'Exportar backup do Meu Bolso'
  );
}

export async function exportSpreadsheet() {
  const stamp = new Date().toISOString().slice(0, 10);
  // BOM na frente pro Excel abrir os acentos corretamente.
  await shareText(
    `meubolso-lancamentos-${stamp}.csv`,
    `﻿${db.exportCsv()}`,
    'text/csv',
    'Exportar lançamentos'
  );
}

// Retorna true se importou; false se a pessoa cancelou a escolha do arquivo.
export async function importBackup() {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/json',
    copyToCacheDirectory: true,
  });
  if (result.canceled) return false;

  const file = new File(result.assets[0].uri);
  db.importAll(JSON.parse(await file.text()));
  return true;
}
