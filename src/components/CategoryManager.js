// Lista + edição de categorias de UM kind (despesa OU receita) — pra cada
// área cuidar só das categorias que usa: Despesas gerencia as de despesa,
// Carteira gerencia as de receita. Substitui a antiga lista única em Ajustes.

import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useApp } from '../app-context';
import * as db from '../db';
import { useTheme } from '../theme-context';
import { CategoryForm } from './CatalogForms';
import { Button, Card, Divider, IconBubble, Muted, SectionTitle } from './ui';

export default function CategoryManager({ kind, title = 'Categorias' }) {
  const { colors } = useTheme();
  const { version, refresh } = useApp();
  const [expanded, setExpanded] = useState(null);
  const [categoryForm, setCategoryForm] = useState({ open: false, category: null, parent: null });

  const categories = useMemo(() => db.getCategoryTree(kind), [kind, version]);

  const closeForm = () => setCategoryForm({ open: false, category: null, parent: null });
  const afterSave = () => {
    refresh();
    closeForm();
  };

  return (
    <>
      <SectionTitle action="+ nova" onAction={() => setCategoryForm({ open: true, category: null, parent: null })}>
        {title}
      </SectionTitle>
      <Card>
        {categories.length === 0 ? (
          <Muted>Nenhuma categoria ainda.</Muted>
        ) : (
          categories.map((cat, i) => {
            const isOpen = expanded === cat.id;
            return (
              <View key={cat.id}>
                {i > 0 ? <Divider /> : null}
                <Pressable
                  onPress={() => setExpanded(isOpen ? null : cat.id)}
                  style={({ pressed }) => [
                    { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11 },
                    pressed && { opacity: 0.6 },
                  ]}
                >
                  <IconBubble emoji={cat.emoji} color={cat.color} size={38} />
                  <Text style={{ flex: 1, fontSize: 15, fontWeight: '600', color: colors.text }}>{cat.name}</Text>
                  <Muted size={12}>
                    {cat.subs.length > 0 ? `${cat.subs.length} sub` : 'sem sub'} {isOpen ? '▲' : '▼'}
                  </Muted>
                </Pressable>

                {isOpen ? (
                  <View style={{ paddingLeft: 50, paddingBottom: 12, gap: 8 }}>
                    {cat.subs.map((sub) => (
                      <Pressable key={sub.id} onPress={() => setCategoryForm({ open: true, category: sub, parent: cat })}>
                        <Text style={{ color: colors.text, fontSize: 14, paddingVertical: 4 }}>• {sub.name}</Text>
                      </Pressable>
                    ))}
                    <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                      <Button
                        title="Editar"
                        variant="ghost"
                        style={{ flex: 1, paddingVertical: 9 }}
                        onPress={() => setCategoryForm({ open: true, category: cat, parent: null })}
                      />
                      <Button
                        title="+ subcategoria"
                        variant="soft"
                        style={{ flex: 1, paddingVertical: 9 }}
                        onPress={() => setCategoryForm({ open: true, category: null, parent: cat })}
                      />
                    </View>
                  </View>
                ) : null}
              </View>
            );
          })
        )}
      </Card>

      <CategoryForm
        visible={categoryForm.open}
        category={categoryForm.category}
        parent={categoryForm.parent}
        kind={kind}
        onClose={closeForm}
        onSaved={afterSave}
      />
    </>
  );
}
