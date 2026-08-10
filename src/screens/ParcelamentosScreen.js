// Tela exclusiva de parcelamentos: só pra acompanhar compras parceladas.
// Cada card mostra nome, total, parcela atual (4/12), quantas faltam, valor da
// parcela, data da próxima e status. Parcelas marcadas como "fora do saldo"
// (ex.: cartão do pai) aparecem aqui, mas não descontam do saldo do mês.

import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useApp } from '../app-context';
import * as db from '../db';
import { useTheme } from '../theme-context';
import { dueLabel, formatDate, monthLabel } from '../utils/date';
import { formatMoney } from '../utils/money';
import InstallmentForm from '../components/InstallmentForm';
import { Badge, Button, Card, Divider, EmptyState, Header, IconBubble, Muted, ProgressBar, SectionTitle, Sheet } from '../components/ui';

export default function ParcelamentosScreen() {
  const { colors } = useTheme();
  const { month, version, refresh, back } = useApp();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [detail, setDetail] = useState(null);

  const { list, forecast } = useMemo(
    () => ({ list: db.getInstallments(), forecast: db.getInstallmentForecast(month, 6) }),
    [month, version]
  );

  const open = list.filter((i) => i.remaining_cents > 0);
  const done = list.filter((i) => i.remaining_cents === 0);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 20, paddingBottom: 32 }}
      showsVerticalScrollIndicator={false}
    >
      <Header title="Parcelamentos" subtitle="Suas compras parceladas" onBack={back} />

      <Card style={{ marginTop: 14 }}>
        <Muted>Falta pagar (dentro do seu saldo)</Muted>
        <Text style={{ fontSize: 26, fontWeight: '800', color: colors.expense, marginTop: 2 }}>
          {formatMoney(forecast.total_cents)}
        </Text>
        <Muted size={12}>{forecast.parcels} {forecast.parcels === 1 ? 'parcela em aberto' : 'parcelas em aberto'}</Muted>

        {forecast.byMonth.length > 0 ? (
          <View style={{ marginTop: 14, gap: 8 }}>
            <Muted size={12}>Quanto pesa em cada mês</Muted>
            {forecast.byMonth.map((row) => {
              const max = Math.max(...forecast.byMonth.map((r) => r.total_cents), 1);
              return (
                <View key={row.month} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Text style={{ width: 54, fontSize: 12, color: colors.textMuted }}>{monthLabel(row.month)}</Text>
                  <View style={{ flex: 1 }}>
                    <ProgressBar percent={(row.total_cents / max) * 100} color={colors.expense} height={7} />
                  </View>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text, width: 84, textAlign: 'right' }}>
                    {formatMoney(row.total_cents)}
                  </Text>
                </View>
              );
            })}
          </View>
        ) : null}
      </Card>

      <SectionTitle action="+ nova" onAction={() => { setEditing(null); setFormOpen(true); }}>
        Em andamento
      </SectionTitle>

      {open.length === 0 ? (
        <Card>
          <EmptyState
            emoji="💳"
            title="Nenhuma parcela em aberto"
            subtitle="Cadastre uma compra parcelada pra acompanhar quanto falta pra quitar."
            action="Cadastrar compra"
            onAction={() => { setEditing(null); setFormOpen(true); }}
          />
        </Card>
      ) : (
        open.map((item) => <InstallmentCard key={item.id} item={item} month={month} onPress={() => setDetail(item)} />)
      )}

      {done.length > 0 ? (
        <>
          <SectionTitle>Quitadas 🎉</SectionTitle>
          <Card>
            {done.map((item, i) => (
              <View key={item.id}>
                {i > 0 ? <Divider /> : null}
                <Pressable onPress={() => setDetail(item)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11 }}>
                  <IconBubble emoji="✅" color={colors.income} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>{item.description}</Text>
                    <Muted size={12}>{item.count}x · quitada</Muted>
                  </View>
                  <Muted size={13}>{formatMoney(item.total_cents)}</Muted>
                </Pressable>
              </View>
            ))}
          </Card>
        </>
      ) : null}

      <InstallmentForm
        visible={formOpen}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        onSaved={refresh}
        installment={editing}
      />

      <DetailSheet
        detail={detail}
        onClose={() => setDetail(null)}
        onEdit={() => { setEditing(detail); setDetail(null); setFormOpen(true); }}
        onRefresh={refresh}
      />
    </ScrollView>
  );
}

function InstallmentCard({ item, month, onPress }) {
  const { colors } = useTheme();
  const current = item.paid_parcels;
  const remainingParcels = item.count - current;

  return (
    <Card style={{ marginBottom: 12 }} onPress={onPress}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <IconBubble emoji={item.parent_emoji ?? item.category_emoji ?? '💳'} color={item.parent_color ?? item.category_color ?? colors.expense} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>{item.description}</Text>
          <Muted size={12}>
            {formatMoney(item.total_cents)} · {item.count}x de {formatMoney(Math.round(item.total_cents / item.count))}
          </Muted>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <Badge label={`${current}/${item.count}`} color={colors.primary} />
          {item.off_budget === 1 ? <Badge label="fora do saldo" color={colors.textMuted} /> : null}
        </View>
      </View>

      <View style={{ marginTop: 12, gap: 7 }}>
        <ProgressBar percent={(current / item.count) * 100} color={colors.primary} />
      </View>

      {/* Campos pedidos: parcela atual, faltam, valor, próxima data, status */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 12 }}>
        <Info label="Parcela atual" value={`${current}/${item.count}`} />
        <Info label="Faltam" value={`${remainingParcels} ${remainingParcels === 1 ? 'parcela' : 'parcelas'}`} />
        <Info label="Valor da parcela" value={formatMoney(Math.round(item.total_cents / item.count))} />
        <Info label="Falta pagar" value={formatMoney(item.remaining_cents)} />
        <Info label="Próxima parcela" value={item.next_date ? formatDate(item.next_date) : '—'} />
        <Info label="Termina em" value={item.last_date ? monthLabel(item.last_date.slice(0, 7)) : '—'} />
      </View>

      {item.note ? <Muted size={12} style={{ marginTop: 6 }}>📝 {item.note}</Muted> : null}
    </Card>
  );
}

function Info({ label, value }) {
  const { colors } = useTheme();
  return (
    <View style={{ width: '50%', paddingVertical: 5 }}>
      <Text style={{ fontSize: 11, color: colors.textMuted }}>{label}</Text>
      <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text, marginTop: 1 }}>{value}</Text>
    </View>
  );
}

function DetailSheet({ detail, onClose, onEdit, onRefresh }) {
  const { colors } = useTheme();
  const { refresh } = useApp();
  const parcels = useMemo(() => (detail ? db.getInstallmentParcels(detail.id) : []), [detail]);

  return (
    <Sheet
      visible={Boolean(detail)}
      onClose={onClose}
      title={detail?.description ?? ''}
      height="82%"
      footer={<Button title="Editar compra" variant="ghost" onPress={onEdit} />}
    >
      {detail?.off_budget === 1 ? (
        <Card style={{ marginBottom: 12 }}>
          <Muted size={12}>💡 Esta compra está marcada como fora do seu saldo — ela não desconta do saldo mensal.{detail.note ? ` (${detail.note})` : ''}</Muted>
        </Card>
      ) : null}
      {parcels.map((parcel) => (
        <View key={parcel.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontWeight: '600' }}>Parcela {parcel.installment_no}/{parcel.installment_total}</Text>
            <Muted size={12}>{formatDate(parcel.date)} · {parcel.paid ? 'paga' : dueLabel(parcel.date)}</Muted>
          </View>
          <Text style={{ color: parcel.paid ? colors.textMuted : colors.text, fontWeight: '700', marginRight: 10 }}>
            {formatMoney(parcel.amount_cents)}
          </Text>
          {!parcel.paid ? (
            <Pressable
              onPress={() => { db.setTransactionPaid(parcel.id, true); refresh(); onRefresh?.(); onClose(); }}
              hitSlop={8}
              style={{ paddingHorizontal: 9, paddingVertical: 4, borderRadius: 9, backgroundColor: colors.primaryLight }}
            >
              <Text style={{ fontSize: 11, fontWeight: '700', color: colors.primary }}>paguei ✓</Text>
            </Pressable>
          ) : (
            <Text style={{ color: colors.income, fontWeight: '800' }}>✓</Text>
          )}
        </View>
      ))}
    </Sheet>
  );
}
