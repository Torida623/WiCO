import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

export type TagChipOption = {
  value: string;
  label: string;
};

export type TagChipsProps = {
  options: TagChipOption[];
  selected: string | null;
  onSelect: (value: string | null) => void;
  style?: StyleProp<ViewStyle>;
};

export function TagChips({ options, selected, onSelect, style }: TagChipsProps) {
  return (
    <View style={[styles.container, style]}>
      {options.map((option) => {
        const isSelected = option.value === selected;
        return (
          <Pressable key={option.value} onPress={() => onSelect(isSelected ? null : option.value)}>
            {({ pressed }) => (
              <ThemedView
                type={isSelected ? 'accent' : 'backgroundElement'}
                style={[styles.chip, pressed && styles.pressed]}>
                <ThemedText type="small" themeColor={isSelected ? 'background' : 'text'}>
                  {option.label}
                </ThemedText>
              </ThemedView>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one + Spacing.half,
    borderRadius: Spacing.four,
  },
  pressed: {
    opacity: 0.7,
  },
});
