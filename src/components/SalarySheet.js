// Prompt do salário de um mês, reutilizado em todo lugar que abre ou edita um
// mês: ao abrir (informar quanto recebeu) e ao editar o salário de um mês já
// aberto. Vale só para o mês em questão — não mexe no salário padrão.

import { useEffect, useState } from 'react';
import { useTheme } from '../theme-context';
import { Field, MoneyField } from './fields';
import { Button, Muted, Sheet } from './ui';

export default function SalarySheet({ visible, title, subtitle, initial, confirmLabel = 'Salvar', onClose, onConfirm }) {
  const { colors } = useTheme();
  const [cents, setCents] = useState(initial);

  useEffect(() => { if (visible) setCents(initial); }, [visible]);

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={title}
      height="52%"
      footer={<Button title={confirmLabel} onPress={() => { onConfirm(cents); onClose(); }} />}
    >
      <Muted style={{ marginBottom: 10 }}>{subtitle}</Muted>
      <Field label="Salário do mês">
        <MoneyField key={visible ? 'open' : 'closed'} cents={cents} onChange={setCents} autoFocus color={colors.income} />
      </Field>
      <Muted size={12}>Deixe em zero se não recebeu salário neste mês.</Muted>
    </Sheet>
  );
}
