// Formulários de conta e de categoria (usados nos Ajustes).

import { useEffect, useState } from 'react';
import { Alert, View } from 'react-native';
import * as db from '../db';
import { ACCOUNT_TYPES, CHART_COLORS } from '../theme';
import { EmojiColorField, Field, MoneyField, PickerField, TextField } from './fields';
import { Button, Sheet } from './ui';

const ACCOUNT_EMOJIS = ['🏦', '💵', '💳', '🐷', '🎟️', '📱', '💰', '🪙'];
const CATEGORY_EMOJIS = ['🍽️', '🚌', '🏠', '🎓', '🩺', '🏋️', '🎮', '🛍️', '📺', '💖', '🐶', '✈️', '📚', '🧾', '📦', '💼'];

export function AccountForm({ visible, onClose, onSaved, account }) {
  const [form, setForm] = useState({ name: '', type: 'corrente', emoji: '🏦', color: CHART_COLORS[1], initialCents: 0 });

  useEffect(() => {
    if (!visible) return;
    setForm(
      account
        ? {
            name: account.name,
            type: account.type,
            emoji: account.emoji,
            color: account.color,
            initialCents: account.initial_cents,
          }
        : { name: '', type: 'corrente', emoji: '🏦', color: CHART_COLORS[1], initialCents: 0 }
    );
  }, [visible, account]);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  function handleSave() {
    if (!form.name.trim()) {
      Alert.alert('Falta o nome', 'Dê um nome pra conta (ex.: Nubank, Carteira).');
      return;
    }
    db.saveAccount({
      id: account?.id,
      name: form.name.trim(),
      type: form.type,
      emoji: form.emoji || '🏦',
      color: form.color,
      initialCents: form.initialCents,
    });
    onSaved?.();
    onClose();
  }

  function handleDelete() {
    Alert.alert('Apagar conta', 'Os lançamentos dela ficam salvos, mas sem conta vinculada. Continuar?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Apagar',
        style: 'destructive',
        onPress: () => {
          db.deleteAccount(account.id);
          onSaved?.();
          onClose();
        },
      },
    ]);
  }

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={account ? 'Editar conta' : 'Nova conta'}
      height="75%"
      footer={
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {account ? <Button title="Apagar" variant="danger" onPress={handleDelete} style={{ flex: 1 }} /> : null}
          <Button title="Salvar" onPress={handleSave} style={{ flex: 2 }} />
        </View>
      }
    >
      <Field label="Nome">
        <TextField value={form.name} onChangeText={(t) => set({ name: t })} placeholder="Ex.: Nubank" maxLength={30} />
      </Field>

      <Field label="Tipo">
        <PickerField
          label="Tipo de conta"
          value={form.type}
          onChange={(type) => {
            const info = ACCOUNT_TYPES.find((t) => t.key === type);
            set({ type, emoji: info?.emoji ?? form.emoji });
          }}
          options={ACCOUNT_TYPES.map((t) => ({ key: t.key, label: t.label, emoji: t.emoji }))}
        />
      </Field>

      <Field label="Saldo inicial" hint="Quanto tinha nessa conta quando você começou a usar o app.">
        <MoneyField key={account?.id ?? 'new-account'} cents={form.initialCents} onChange={(c) => set({ initialCents: c })} big={false} />
      </Field>

      <Field label="Ícone e cor">
        <EmojiColorField
          emoji={form.emoji}
          color={form.color}
          onEmoji={(e) => set({ emoji: e })}
          onColor={(c) => set({ color: c })}
          emojis={ACCOUNT_EMOJIS}
          colorOptions={CHART_COLORS}
        />
      </Field>
    </Sheet>
  );
}

export function CategoryForm({ visible, onClose, onSaved, category, kind, parent }) {
  const [form, setForm] = useState({ name: '', emoji: '📦', color: CHART_COLORS[0] });

  useEffect(() => {
    if (!visible) return;
    setForm(
      category
        ? { name: category.name, emoji: category.emoji, color: category.color }
        : { name: '', emoji: parent?.emoji ?? '📦', color: parent?.color ?? CHART_COLORS[0] }
    );
  }, [visible, category, parent]);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const isSub = Boolean(parent) || Boolean(category?.parent_id);

  function handleSave() {
    if (!form.name.trim()) {
      Alert.alert('Falta o nome', 'Dê um nome pra categoria.');
      return;
    }
    db.saveCategory({
      id: category?.id,
      name: form.name.trim(),
      kind: category?.kind ?? kind,
      emoji: form.emoji || '📦',
      color: form.color,
      parentId: category?.parent_id ?? parent?.id ?? null,
    });
    onSaved?.();
    onClose();
  }

  function handleDelete() {
    const uses = db.countCategoryUse(category.id);
    Alert.alert(
      'Apagar categoria',
      uses > 0
        ? `${uses} ${uses === 1 ? 'lançamento usa' : 'lançamentos usam'} essa categoria. Eles ficam sem categoria. Continuar?`
        : 'Continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Apagar',
          style: 'destructive',
          onPress: () => {
            db.deleteCategory(category.id);
            onSaved?.();
            onClose();
          },
        },
      ]
    );
  }

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={category ? 'Editar categoria' : isSub ? `Nova subcategoria de ${parent?.name}` : 'Nova categoria'}
      height="70%"
      footer={
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {category ? <Button title="Apagar" variant="danger" onPress={handleDelete} style={{ flex: 1 }} /> : null}
          <Button title="Salvar" onPress={handleSave} style={{ flex: 2 }} />
        </View>
      }
    >
      <Field label="Nome">
        <TextField value={form.name} onChangeText={(t) => set({ name: t })} placeholder="Ex.: Padaria" maxLength={30} />
      </Field>

      {!isSub ? (
        <Field label="Ícone e cor">
          <EmojiColorField
            emoji={form.emoji}
            color={form.color}
            onEmoji={(e) => set({ emoji: e })}
            onColor={(c) => set({ color: c })}
            emojis={CATEGORY_EMOJIS}
            colorOptions={CHART_COLORS}
          />
        </Field>
      ) : null}
    </Sheet>
  );
}
