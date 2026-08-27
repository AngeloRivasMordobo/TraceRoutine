/**
 * Bottom sheet to edit one log (TR-42 skip with reason, TR-44 value, TR-51 full edit).
 * mode: 'skip' → reasons only · 'value' → number only · 'full' → state + value + reason.
 */
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import type { Activity, DateKey, LogState } from '../engine';
import { formatShortDate, t } from '../i18n';
import { appStore, useLog } from '../store/appStore';
import { Button } from './components';
import { Chip, Help, Sheet, inputStyle } from './controls';
import { useTheme } from './theme';
import { space } from './tokens';

type Mode = 'skip' | 'value' | 'full';
const REASONS = ['noTime', 'sick', 'travel', 'other'] as const;

export function LogSheet({ activity, date, mode, visible, onClose }: { activity: Activity; date: DateKey; mode: Mode; visible: boolean; onClose: () => void }) {
  const th = useTheme();
  const log = useLog(activity.id, date);
  // The sheet is mounted only while open, so initial state is read once per opening.
  const [state, setState] = useState<LogState | null>(() => (mode === 'skip' ? 'skip' : mode === 'value' ? 'done' : (log?.state ?? null)));
  const [value, setValue] = useState(() => (log?.value != null ? String(log.value) : ''));
  const [reason, setReason] = useState<string | null>(() => log?.reason ?? null);

  const hasValue = activity.record !== 'check';
  const confirm = () => {
    const n = value.trim() === '' ? null : Number(value.replace(',', '.'));
    appStore.setLog(activity.id, date, state, { value: Number.isFinite(n as number) ? n : null, reason: state === 'skip' ? reason : null });
    onClose();
  };
  const title = mode === 'skip' ? t('today.skipTitle', { name: activity.name }) : mode === 'value' ? t('today.valueTitle') : t('month.editCell', { name: activity.name, date: formatShortDate(date) });

  return (
    <Sheet visible={visible} onClose={onClose} title={title}>
      {mode === 'full' && (
        <View style={styles.row}>
          {([null, 'done', 'min', 'skip'] as (LogState | null)[]).map((s) => (
            <Chip key={s ?? 'empty'} label={s ? t(`states.${s}`) : t('month.empty')} on={state === s} onPress={() => setState(s)} />
          ))}
        </View>
      )}
      {mode !== 'skip' && hasValue && state !== 'skip' && (
        <View>
          <Help>{`${t('today.valueHelp')}${activity.unit ? ` · ${activity.unit}` : ''}`}</Help>
          <TextInput
            value={value}
            onChangeText={setValue}
            keyboardType="decimal-pad"
            placeholder={activity.unit ?? ''}
            placeholderTextColor={th.faint}
            style={[inputStyle(th), { marginTop: space[3] }]}
            accessibilityLabel={t('month.value')}
          />
          {activity.record === 'minutes' && (
            <View style={[styles.row, { marginTop: space[3] }]}>
              {[5, 10, 15, 30].map((n) => <Chip key={n} label={`+${n}`} onPress={() => setValue(String((Number(value) || 0) + n))} />)}
            </View>
          )}
        </View>
      )}
      {(mode === 'skip' || state === 'skip') && (
        <View>
          <Help>{t('today.skipHelp')}</Help>
          <View style={[styles.row, { marginTop: space[3] }]}>
            {REASONS.map((r) => (
              <Chip key={r} label={t(`today.reason${r.charAt(0).toUpperCase()}${r.slice(1)}`)} on={reason === r} onPress={() => setReason(reason === r ? null : r)} />
            ))}
          </View>
        </View>
      )}
      <Button label={mode === 'skip' ? t('today.confirmSkip') : t('today.confirm')} onPress={confirm} style={{ marginTop: space[6] }} />
      {mode === 'value' && <Button label={t('today.noValue')} variant="ghost" onPress={() => { appStore.setLog(activity.id, date, 'done'); onClose(); }} />}
      <Text style={{ height: 0 }} />
    </Sheet>
  );
}

const styles = StyleSheet.create({ row: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] } });
