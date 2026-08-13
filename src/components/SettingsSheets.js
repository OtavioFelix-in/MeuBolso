// Sub-telas (sheets) usadas em Ajustes: editar nome, editar salário e ler os
// textos legais. Extraídas de SettingsScreen.js pra manter o arquivo principal
// só com a lista de seções.

import { useEffect, useState } from 'react';
import { Text } from 'react-native';
import * as db from '../db';
import { useTheme } from '../theme-context';
import { currentMonth, monthLabel, monthOf } from '../utils/date';
import { DateField, Field, MoneyField, StepperField, TextField } from './fields';
import { Button, Muted, Sheet } from './ui';

export function ProfileSheet({ visible, initial, onClose, onSaved }) {
  const [name, setName] = useState(initial);

  useEffect(() => { if (visible) setName(initial); }, [visible, initial]);

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Seu nome"
      height="46%"
      footer={<Button title="Salvar" onPress={() => { db.setUserName(name); onSaved?.(); onClose(); }} />}
    >
      <Field label="Como o app deve te chamar">
        <TextField value={name} onChangeText={setName} placeholder="Seu nome" autoFocus maxLength={40} />
      </Field>
    </Sheet>
  );
}

export function LegalSheet({ type, onClose }) {
  const { colors } = useTheme();
  const isPrivacy = type === 'privacy';
  const paragraphs = isPrivacy ? PRIVACY : TERMS;

  return (
    <Sheet
      visible={Boolean(type)}
      onClose={onClose}
      title={isPrivacy ? 'Política de privacidade' : 'Termos de uso'}
      height="84%"
    >
      {paragraphs.map((p, i) => (
        <Text key={i} style={{ fontSize: 13.5, color: colors.text, lineHeight: 21, marginBottom: 12 }}>{p}</Text>
      ))}
      <Muted size={12} style={{ marginTop: 4, marginBottom: 8 }}>Atualizado em agosto de 2026.</Muted>
    </Sheet>
  );
}

const PRIVACY = [
  'O Meu Bolso é um aplicativo de controle financeiro que funciona 100% offline. Todos os dados que você registra (lançamentos, contas, salário, categorias e demais informações) ficam salvos apenas no seu próprio aparelho.',
  'Não coletamos, não enviamos e não armazenamos seus dados em nenhum servidor. O desenvolvedor não tem acesso a nenhuma informação sua.',
  'O app não usa rastreadores, não exibe anúncios e não compartilha dados com terceiros.',
  'As permissões que o app pode pedir são usadas só no aparelho: câmera e fotos para anexar comprovantes aos lançamentos, notificações para lembretes de contas, e biometria apenas para desbloquear o app. Nada disso sai do seu celular.',
  'Como os dados ficam só no aparelho, faça backups pela tela de Ajustes para não perdê-los ao trocar ou formatar o celular. Você pode apagar todos os seus dados a qualquer momento em Ajustes › Apagar todos os dados.',
];

const TERMS = [
  'O Meu Bolso é oferecido "como está", para ajudar você a organizar suas finanças pessoais. Ele é um apoio à sua organização e não substitui a orientação de um profissional financeiro.',
  'Você é responsável pelas informações que registra e por manter backups dos seus dados. Como tudo fica apenas no seu aparelho, o desenvolvedor não se responsabiliza por perda de dados decorrente de troca, formatação ou perda do aparelho, nem da desinstalação do app.',
  'O app não realiza transações financeiras e não se conecta a bancos: todos os valores são informados manualmente por você.',
  'Ao usar o aplicativo, você concorda com estes termos, que podem ser atualizados em novas versões do app.',
];

export function SalarySheet({ visible, current, onClose, onSaved }) {
  const { colors } = useTheme();
  const [cents, setCents] = useState(current.cents);
  const [day, setDay] = useState(current.day || 5);
  const [applyFrom, setApplyFrom] = useState(currentMonth());

  useEffect(() => {
    if (visible) {
      setCents(current.cents);
      setDay(current.day || 5);
      setApplyFrom(currentMonth());
    }
  }, [visible, current.cents, current.day]);

  function save() {
    db.saveSalary({ cents, day, applyFrom });
    onSaved?.();
    onClose();
  }

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Salário / renda fixa"
      height="72%"
      footer={<Button title="Salvar" onPress={save} />}
    >
      <Field label="Valor do salário">
        <MoneyField key={visible ? 'sal-open' : 'sal-closed'} cents={cents} onChange={setCents} autoFocus color={colors.income} />
      </Field>
      <Field label="Dia que costuma cair" hint="Entra automático todo mês que você abrir.">
        <StepperField value={day} onChange={setDay} min={1} max={31} suffix="do mês" />
      </Field>
      <Field
        label="Valer a partir de"
        hint="O novo valor vale deste mês em diante. Meses anteriores (já abertos) continuam com o salário antigo."
      >
        <DateField value={`${applyFrom}-01`} onChange={(d) => setApplyFrom(monthOf(d))} placeholder="Este mês" />
      </Field>
      {current.configured ? (
        <Muted size={12}>Vigência: {monthLabel(applyFrom, { full: true })} em diante.</Muted>
      ) : null}
    </Sheet>
  );
}
