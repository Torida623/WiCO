import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AllergenCategory, ALLERGENS } from '@/constants/allergens';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const CATEGORY_LABELS: Record<AllergenCategory, string> = {
  mandatory: '特定原材料（表示義務）',
  recommended: '特定原材料に準ずるもの（表示推奨）',
};

export type AllergenChecklistProps = {
  checkedIds: string[];
  onToggle: (id: string) => void;
};

export function AllergenChecklist({ checkedIds, onToggle }: AllergenChecklistProps) {
  const theme = useTheme();

  return (
    <>
      {(['mandatory', 'recommended'] as AllergenCategory[]).map((category) => (
        <View key={category} style={styles.section}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            {CATEGORY_LABELS[category]}
          </ThemedText>
          <View style={styles.list}>
            {ALLERGENS.filter((allergen) => allergen.category === category).map((allergen) => {
              const checked = checkedIds.includes(allergen.id);
              return (
                <Pressable key={allergen.id} onPress={() => onToggle(allergen.id)}>
                  {({ pressed }) => (
                    <ThemedView
                      type={checked ? 'backgroundSelected' : 'backgroundElement'}
                      style={[styles.row, pressed && styles.pressed]}>
                      <View
                        style={[
                          styles.checkbox,
                          { borderColor: checked ? theme.accent : theme.textSecondary },
                          checked && { backgroundColor: theme.accent },
                        ]}>
                        {checked && (
                          <ThemedText type="smallBold" themeColor="background" style={styles.checkboxMark}>
                            ✓
                          </ThemedText>
                        )}
                      </View>
                      <ThemedText type="small" style={styles.rowLabel}>
                        {allergen.label}
                      </ThemedText>
                    </ThemedView>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.two,
  },
  list: {
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Spacing.three,
    padding: Spacing.three,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: Spacing.half,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxMark: {
    fontSize: 13,
    lineHeight: 15,
  },
  rowLabel: {
    flex: 1,
  },
  pressed: {
    opacity: 0.7,
  },
});
