/**
 * A reminder time the user picks rather than types (TR-107), so the stored value is
 * always "HH:MM". Android opens the system clock dialog from a field styled like the
 * other inputs; iOS uses the system's compact picker. Web: TimeField.web.tsx.
 */
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Platform, Pressable, StyleSheet, Text } from 'react-native';
import { inputStyle } from './controls';
import { dateToTime, timeToDate } from './editor/editorModel';
import { useTheme } from './theme';
import { font } from './tokens';

export interface TimeFieldProps {
  value: string;
  onChange: (time: string) => void;
  accessibilityLabel: string;
  width?: number;
}

export function TimeField({ value, onChange, accessibilityLabel, width = 96 }: TimeFieldProps) {
  const th = useTheme();
  if (Platform.OS === 'ios') {
    return (
      <DateTimePicker
        value={timeToDate(value)}
        mode="time"
        display="compact"
        timeZoneName="UTC"
        themeVariant={th.name}
        accentColor={th.accent}
        onValueChange={(_, date) => onChange(dateToTime(date))}
      />
    );
  }
  const open = () =>
    DateTimePickerAndroid.open({ value: timeToDate(value), mode: 'time', timeZoneName: 'UTC', onValueChange: (_, date) => onChange(dateToTime(date)) });
  return (
    <Pressable
      onPress={open}
      accessibilityRole="button"
      accessibilityLabel={`${accessibilityLabel}, ${value}`}
      style={({ pressed }) => [inputStyle(th), styles.field, { width }, pressed && { borderColor: th.accent }]}>
      <Text style={[styles.text, { color: th.text }]}>{value}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  field: { justifyContent: 'center' },
  text: { fontFamily: font.family, fontSize: font.size.md, textAlign: 'center' },
});
