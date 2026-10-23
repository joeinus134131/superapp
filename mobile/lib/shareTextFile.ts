import { Platform } from 'react-native';
export async function shareTextFile(content: string, filename: string, mimeType = 'text/csv', uti = 'public.comma-separated-values-text') {
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([content], { type: `${mimeType};charset=utf-8` }));
    const link = document.createElement('a'); link.href = url; link.download = filename;
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }
  const Sharing = await import('expo-sharing');
  if (!await Sharing.isAvailableAsync()) throw new Error('SHARING_UNAVAILABLE');
  const { File, Paths } = await import('expo-file-system');
  const file = new File(Paths.cache, filename);
  try {
    file.write(content);
    await Sharing.shareAsync(file.uri, { mimeType, UTI: uti });
  } finally { if (file.exists) file.delete(); }
}

