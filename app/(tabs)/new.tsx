import { Redirect } from 'expo-router';

/**
 * The middle slot of the design's bottom bar. Its tab button opens the editor
 * instead of navigating, so this screen only renders if something focuses the
 * route directly — in which case it hands over to the editor.
 */
export default function NewActivityTab() {
  return <Redirect href="/editor" />;
}
