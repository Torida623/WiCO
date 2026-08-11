import { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
  InputAccessoryView,
  Keyboard,
  KeyboardEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  TextInputProps,
  TextInputSelectionChangeEventData,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type QuickInsertKind = 'basic' | 'garnish' | 'seasoning';

const WORD_SETS: Record<QuickInsertKind, string[]> = {
  basic: ['1/2', '1', '2', '3', '4', '適量', '少々', 'g', 'ml', '個', '本', '枚'],
  garnish: ['適量', '少々'],
  seasoning: ['大さじ', '小さじ', '1/2', '1', '2', '3', '4', '少々', 'g', 'ml'],
};

const ACCESSORY_ID = 'wico-ingredients-quick-insert';
const DEFAULT_KIND: QuickInsertKind = 'basic';

type ActiveField = {
  value: string;
  onChangeText: (text: string) => void;
  selection: { start: number; end: number };
};

const QuickInsertBarContext = createContext<{
  activeFieldRef: React.MutableRefObject<ActiveField | null>;
  setActiveKind: (kind: QuickInsertKind) => void;
} | null>(null);

function useQuickInsertBarContext() {
  const ctx = useContext(QuickInsertBarContext);
  if (!ctx) throw new Error('QuickInsertTextInput must be used inside a QuickInsertProvider');
  return ctx;
}

/**
 * Drop-in TextInput replacement for the ingredient-related fields. `kind` picks which word
 * set the quick-insert bar shows while this field is focused (基本の材料/付け合わせ/調味料
 * each want a different set — see WORD_SETS). Also tracks this field's current value/cursor
 * position in a shared ref, so the bar's buttons know where to splice in the tapped word.
 * On blur we deliberately leave the ref pointing at this field — on Android the custom bar
 * isn't a real keyboard accessory, so tapping a button blurs the field a beat before onPress
 * fires, and losing the target here would make the tap silently do nothing.
 */
export function QuickInsertTextInput(props: TextInputProps & { kind: QuickInsertKind }) {
  const { kind, value, onChangeText, onFocus, onBlur, onSelectionChange, ...rest } = props;
  const { activeFieldRef, setActiveKind } = useQuickInsertBarContext();
  const isFocusedRef = useRef(false);
  const selectionRef = useRef({ start: (value ?? '').length, end: (value ?? '').length });

  useEffect(() => {
    if (isFocusedRef.current && onChangeText) {
      activeFieldRef.current = { value: value ?? '', onChangeText, selection: selectionRef.current };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <TextInput
      {...rest}
      value={value}
      onChangeText={onChangeText}
      inputAccessoryViewID={Platform.OS === 'ios' ? ACCESSORY_ID : undefined}
      onFocus={(e) => {
        isFocusedRef.current = true;
        setActiveKind(kind);
        if (onChangeText) {
          activeFieldRef.current = { value: value ?? '', onChangeText, selection: selectionRef.current };
        }
        onFocus?.(e);
      }}
      onBlur={(e) => {
        isFocusedRef.current = false;
        onBlur?.(e);
      }}
      onSelectionChange={(e: NativeSyntheticEvent<TextInputSelectionChangeEventData>) => {
        selectionRef.current = e.nativeEvent.selection;
        if (isFocusedRef.current && onChangeText) {
          activeFieldRef.current = { value: value ?? '', onChangeText, selection: e.nativeEvent.selection };
        }
        onSelectionChange?.(e);
      }}
    />
  );
}

function insertIntoActiveField(activeFieldRef: React.MutableRefObject<ActiveField | null>, word: string) {
  const field = activeFieldRef.current;
  if (!field) return;
  const { value, onChangeText, selection } = field;
  const start = selection.start ?? value.length;
  const end = selection.end ?? value.length;
  const nextValue = value.slice(0, start) + word + value.slice(end);
  const nextCursor = start + word.length;
  field.selection = { start: nextCursor, end: nextCursor };
  onChangeText(nextValue);
}

function QuickInsertButtons({ words, onPressWord }: { words: string[]; onPressWord: (word: string) => void }) {
  return (
    <View style={styles.buttonRow}>
      {words.map((word) => (
        <Pressable key={word} onPress={() => onPressWord(word)} hitSlop={4}>
          {({ pressed }) => (
            <ThemedView type="backgroundElement" style={[styles.chip, pressed && styles.pressed]}>
              <ThemedText type="small">{word}</ThemedText>
            </ThemedView>
          )}
        </Pressable>
      ))}
    </View>
  );
}

/** Wraps the ingredient section of the form. Renders the iOS keyboard-accessory bar and
 * (while the keyboard is open) the Android equivalent bar pinned above it. Which word set
 * shows is driven by whichever QuickInsertTextInput is currently focused (its `kind` prop). */
export function QuickInsertProvider({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  const activeFieldRef = useRef<ActiveField | null>(null);
  const [activeKind, setActiveKind] = useState<QuickInsertKind>(DEFAULT_KIND);
  const [androidKeyboardHeight, setAndroidKeyboardHeight] = useState(0);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const showSub = Keyboard.addListener('keyboardDidShow', (e: KeyboardEvent) => {
      setAndroidKeyboardHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setAndroidKeyboardHeight(0));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handlePressWord = (word: string) => insertIntoActiveField(activeFieldRef, word);
  const words = WORD_SETS[activeKind];

  return (
    <QuickInsertBarContext.Provider value={{ activeFieldRef, setActiveKind }}>
      {children}
      {Platform.OS === 'ios' && (
        <InputAccessoryView nativeID={ACCESSORY_ID}>
          <View style={[styles.iosBar, { backgroundColor: theme.background }]}>
            <QuickInsertButtons words={words} onPressWord={handlePressWord} />
          </View>
        </InputAccessoryView>
      )}
      {Platform.OS === 'android' && androidKeyboardHeight > 0 && (
        <View style={[styles.androidBar, { bottom: androidKeyboardHeight, backgroundColor: theme.background }]}>
          <QuickInsertButtons words={words} onPressWord={handlePressWord} />
        </View>
      )}
    </QuickInsertBarContext.Provider>
  );
}

const styles = StyleSheet.create({
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.four,
  },
  pressed: {
    opacity: 0.7,
  },
  iosBar: {},
  androidBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    elevation: 8,
  },
});
