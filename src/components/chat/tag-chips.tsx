import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type TagChipOption = {
  value: string;
  label: string;
};

/** Unselected/selected fill pair for color-coding a category. Omit to use the default accent/backgroundElement look. */
export type TagChipTint = {
  light: string;
  solid: string;
};

export type TagChipsProps = {
  options: TagChipOption[];
  selected: string | null;
  onSelect: (value: string | null) => void;
  style?: StyleProp<ViewStyle>;
  tint?: TagChipTint;
};

export function TagChips({ options, selected, onSelect, style, tint }: TagChipsProps) {
  const theme = useTheme();
  return (
    <View style={[styles.container, style]}>
      {options.map((option) => {
        const isSelected = option.value === selected;
        const backgroundColor = tint
          ? isSelected
            ? tint.solid
            : tint.light
          : theme[isSelected ? 'accent' : 'backgroundElement'];
        return (
          <Pressable key={option.value} onPress={() => onSelect(isSelected ? null : option.value)}>
            {({ pressed }) => (
              <View style={[styles.chip, { backgroundColor }, pressed && styles.pressed]}>
                <ThemedText type="small" themeColor={isSelected ? 'background' : 'text'}>
                  {option.label}
                </ThemedText>
              </View>
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
