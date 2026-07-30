import { Image, ImageSource } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

export type ChoiceOption<T extends string> = {
  value: T;
  label: string;
  icon?: ImageSource;
  iconPosition?: 'left' | 'right';
  newRow?: boolean;
};

export type ChoiceButtonsProps<T extends string> = {
  options: ChoiceOption<T>[];
  onSelect: (value: T) => void;
};

export function ChoiceButtons<T extends string>({ options, onSelect }: ChoiceButtonsProps<T>) {
  return (
    <View style={styles.container}>
      {options.flatMap((option) => {
        const iconPosition = option.iconPosition ?? 'left';
        const button = (
          <Pressable key={option.value} onPress={() => onSelect(option.value)}>
            {({ pressed }) => (
              <ThemedView
                type="backgroundElement"
                style={[
                  styles.button,
                  option.icon && (iconPosition === 'left' ? styles.buttonWithIconLeft : styles.buttonWithIconRight),
                  pressed && styles.pressed,
                ]}>
                {option.icon && (
                  <Image
                    source={option.icon}
                    style={iconPosition === 'left' ? styles.iconLeft : styles.iconRight}
                    contentFit="contain"
                  />
                )}
                <ThemedText type="smallBold">{option.label}</ThemedText>
              </ThemedView>
            )}
          </Pressable>
        );

        return option.newRow ? [<View key={`${option.value}-break`} style={styles.rowBreak} />, button] : [button];
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  rowBreak: {
    flexBasis: '100%',
    height: 0,
  },
  button: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.four,
    alignItems: 'center',
  },
  buttonWithIconLeft: {
    paddingLeft: Spacing.three + Spacing.two,
  },
  buttonWithIconRight: {
    paddingRight: Spacing.three + Spacing.two,
  },
  iconLeft: {
    position: 'absolute',
    left: -6,
    bottom: -6,
    width: 22,
    height: 22,
  },
  iconRight: {
    position: 'absolute',
    right: -6,
    bottom: -6,
    width: 22,
    height: 22,
  },
  pressed: {
    opacity: 0.7,
  },
});
