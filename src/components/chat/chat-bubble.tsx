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

export function ChatBubble({ sender, text, variant }: ChatBubbleProps) {
  const resolvedVariant = variant ?? (sender === 'ai' ? 'card' : 'blob');

  if (resolvedVariant === 'card') {
    return (
      <View style={styles.row}>
        <NineSliceBox
          images={BREAD_FRAME_IMAGES}
          insets={BREAD_FRAME_INSETS}
          style={styles.cardBubble}
          contentStyle={styles.cardContent}>
          <ThemedText themeColor="text" style={styles.cardText}>
            {text}
          </ThemedText>
        </NineSliceBox>
      </View>
    );
  }

  const isUser = sender === 'user';
  return (
    <View style={[styles.row, isUser && styles.rowUser]}>
      <ThemedView type={isUser ? 'accent' : 'backgroundElement'} style={styles.blobBubble}>
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
    maxWidth: '94%',
  },
  cardContent: {
    paddingLeft: BREAD_FRAME_INSETS.left + 10,
    paddingRight: BREAD_FRAME_INSETS.right + 10,
  },
  cardText: {
    marginBottom: Spacing.two * 1.5,
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
