/**
 * Web build of TimeField (TR-107): the browser's own time input, as in the design
 * canvas. The native picker package has no web implementation.
 */
import { createElement } from 'react';
import { isValidTime } from './editor/editorModel';
import { useTheme } from './theme';
import { font, radius, space, TOUCH } from './tokens';
import type { TimeFieldProps } from './TimeField';

export function TimeField({ value, onChange, accessibilityLabel, width = 96 }: TimeFieldProps) {
  const th = useTheme();
  return createElement('input', {
    type: 'time',
    required: true,
    value,
    'aria-label': accessibilityLabel,
    onChange: (e: { target: { value: string } }) => {
      if (isValidTime(e.target.value)) onChange(e.target.value);
    },
    style: {
      boxSizing: 'border-box',
      minWidth: width,
      minHeight: TOUCH,
      paddingLeft: space[4],
      paddingRight: space[3],
      borderRadius: radius.md,
      border: `1px solid ${th.line}`,
      backgroundColor: th.surface,
      color: th.text,
      colorScheme: th.name,
      fontFamily: font.family,
      fontSize: font.size.md,
    },
  });
}
