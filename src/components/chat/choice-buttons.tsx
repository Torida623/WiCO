import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

export type ChoiceButtonsProps<T extends string> = {
  options: { value: T; label: string }[];
  onSelect: (value: T) => void;
};

export function ChoiceButtons<T extends string>({ options, onSelect }: ChoiceButtonsProps<T>) {
  return (
    <View style={styles.container}>
      {options.map((option) => (
        <Pressable key={option.value} onPress={() => onSelect(option.value)}>
          {({ pressed }) => (
            <ThemedView type="backgroundElement" style={[styles.button, pressed && styles.pressed]}>
              <ThemedText type="smallBold">{option.label}</ThemedText>
            </ThemedView>
          )}
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  button: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.four,
  },
  pressed: {
    opacity: 0.7,
  },
});
