import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { NineSliceBox } from '@/components/ui/nine-slice-box';
import { BREAD_FRAME_IMAGES, BREAD_FRAME_INSETS } from '@/constants/bread-frame';
import { Spacing } from '@/constants/theme';

export type ChatBubbleProps = {
  sender: 'ai' | 'user';
  text: string;
  variant?: 'blob' | 'card';
};

export function ChatBubble({ sender, text, variant = 'blob' }: ChatBubbleProps) {
  const isUser = sender === 'user';
  const themeColor = isUser ? 'accent' : 'backgroundElement';

  if (variant === 'card') {
    return (
      <View style={[styles.row, isUser && styles.rowUser]}>
        <NineSliceBox images={BREAD_FRAME_IMAGES} insets={BREAD_FRAME_INSETS} style={styles.cardBubble}>
          <ThemedText themeColor="text">{text}</ThemedText>
        </NineSliceBox>
      </View>
    );
  }

  return (
    <View style={[styles.row, isUser && styles.rowUser]}>
      <ThemedView type={themeColor} style={styles.blobBubble}>
        <View style={styles.highlight} pointerEvents="none" />
        <ThemedText themeColor={isUser ? 'background' : 'text'}>{text}</ThemedText>
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  rowUser: {
    justifyContent: 'flex-end',
  },
  blobBubble: {
    maxWidth: '85%',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderRadius: 999,
    overflow: 'hidden',
  },
  cardBubble: {
    maxWidth: '85%',
  },
  highlight: {
    position: 'absolute',
    top: '10%',
    left: '8%',
    width: '30%',
    height: '35%',
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    opacity: 0.35,
    transform: [{ rotate: '-20deg' }],
  },
});
