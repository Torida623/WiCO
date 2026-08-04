import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { fetchWithTimeout, getApiUrl } from '@/lib/api';

const FRIDGE_SCAN_TIMEOUT_MS = 30_000;

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: 'images',
  quality: 0.5,
  base64: true,
  preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
};

type SlotKey = 'main' | 'sideDoor' | 'vegetableDrawer';

const SLOTS: { key: SlotKey; label: string }[] = [
  { key: 'main', label: '冷蔵室' },
  { key: 'sideDoor', label: 'ドア\nポケット' },
  { key: 'vegetableDrawer', label: '野菜室' },
];

type SlotPhoto = { uri: string; base64: string; mimeType: string };

type Phase = 'capture' | 'analyzing' | 'checklist';

export type FridgeScanPanelProps = {
  onConfirm: (ingredientsText: string) => void;
  onBack: () => void;
};

export function FridgeScanPanel({ onConfirm, onBack }: FridgeScanPanelProps) {
  const theme = useTheme();
  const [cameraPermission, requestCameraPermission] = ImagePicker.useCameraPermissions();

  const [photos, setPhotos] = useState<Partial<Record<SlotKey, SlotPhoto>>>({});
  const [phase, setPhase] = useState<Phase>('capture');
  const [detected, setDetected] = useState<string[]>([]);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [freeText, setFreeText] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const hasAnyPhoto = SLOTS.some((slot) => photos[slot.key]);

  function applyPhoto(slotKey: SlotKey, asset: ImagePicker.ImagePickerAsset) {
    if (!asset.base64) return;
    setPhotos((current) => ({
      ...current,
      [slotKey]: { uri: asset.uri, base64: asset.base64!, mimeType: asset.mimeType ?? 'image/jpeg' },
    }));
  }

  async function takePhotoForSlot(slotKey: SlotKey) {
    if (!cameraPermission?.granted) {
      const result = await requestCameraPermission();
      if (!result.granted) {
        Alert.alert('カメラを使えないよ', 'カメラの権限を許可してから試してね。');
        return;
      }
    }
    const result = await ImagePicker.launchCameraAsync(PICKER_OPTIONS);
    if (!result.canceled) applyPhoto(slotKey, result.assets[0]);
  }


  async function handleAnalyze() {
    const entries = SLOTS.filter((slot) => photos[slot.key]);
    if (entries.length === 0) return;

    setPhase('analyzing');
    setErrorMessage('');
    try {
      const res = await fetchWithTimeout(
        getApiUrl('/api/fridge-scan'),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            photos: entries.map((slot) => ({
              label: slot.label,
              base64: photos[slot.key]!.base64,
              mimeType: photos[slot.key]!.mimeType,
            })),
          }),
        },
        FRIDGE_SCAN_TIMEOUT_MS,
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(typeof data.message === 'string' ? data.message : '読み取りに失敗しました。');
      }
      const ingredients: string[] = Array.isArray(data.ingredients) ? data.ingredients : [];
      setDetected(ingredients);
      setChecked(Object.fromEntries(ingredients.map((item) => [item, true])));
      setPhase('checklist');
    } catch (error) {
      console.error(error);
      setDetected([]);
      setChecked({});
      setErrorMessage('うまく読み取れなかったみたい…下に食材を入力するか、撮り直してね。');
      setPhase('checklist');
    }
  }

  function toggleItem(item: string) {
    setChecked((current) => ({ ...current, [item]: !current[item] }));
  }

  const checkedItems = detected.filter((item) => checked[item]);
  const canConfirm = checkedItems.length > 0 || freeText.trim().length > 0;

  function handleConfirm() {
    if (!canConfirm) return;
    const parts = [...checkedItems];
    if (freeText.trim()) parts.push(freeText.trim());
    onConfirm(parts.join('、'));
  }

  if (phase === 'analyzing') {
    return (
      <ThemedView type="background" style={styles.centerFill}>
        <ActivityIndicator color={theme.accent} />
        <ThemedText type="small" themeColor="textSecondary" style={styles.analyzingText}>
          ペロココが冷蔵庫の中を見てるよ…
        </ThemedText>
      </ThemedView>
    );
  }

  if (phase === 'checklist') {
    return (
      <ScrollView
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled">
        <ThemedText type="smallBold" style={styles.title}>
          この中から使っていい食材を教えてね！
        </ThemedText>

        {errorMessage ? (
          <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
            {errorMessage}
          </ThemedText>
        ) : detected.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
            食材を見つけられなかったよ。下に入力してね。
          </ThemedText>
        ) : null}

        <View style={styles.checklist}>
          {detected.map((item) => (
            <Pressable key={item} onPress={() => toggleItem(item)}>
              {({ pressed }) => (
                <ThemedView
                  type={checked[item] ? 'backgroundSelected' : 'backgroundElement'}
                  style={[styles.checklistRow, pressed && styles.pressed]}>
                  <View
                    style={[
                      styles.checkbox,
                      { borderColor: checked[item] ? theme.accent : theme.textSecondary },
                      checked[item] && { backgroundColor: theme.accent },
                    ]}>
                    {checked[item] && (
                      <ThemedText type="smallBold" themeColor="background" style={styles.checkboxMark}>
                        ✓
                      </ThemedText>
                    )}
                  </View>
                  <ThemedText type="small" style={styles.checklistLabel}>
                    {item}
                  </ThemedText>
                </ThemedView>
              )}
            </Pressable>
          ))}
        </View>

        <ThemedView type="backgroundElement" style={styles.freeTextWrapper}>
          <TextInput
            value={freeText}
            onChangeText={setFreeText}
            placeholder="読み取れなかった食材があれば入力してね"
            placeholderTextColor={theme.textSecondary}
            style={[styles.freeTextInput, { color: theme.text }]}
          />
        </ThemedView>

        <View style={styles.buttonRow}>
          <Pressable style={styles.flex} onPress={() => setPhase('capture')}>
            {({ pressed }) => (
              <ThemedView type="backgroundElement" style={[styles.button, pressed && styles.pressed]}>
                <ThemedText type="smallBold" themeColor="text">
                  撮り直す
                </ThemedText>
              </ThemedView>
            )}
          </Pressable>
          <Pressable style={styles.flex} onPress={handleConfirm} disabled={!canConfirm}>
            {({ pressed }) => (
              <ThemedView
                type="accent"
                style={[styles.button, (pressed || !canConfirm) && styles.pressed]}>
                <ThemedText type="smallBold" themeColor="background">
                  これで決定
                </ThemedText>
              </ThemedView>
            )}
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  return (
    <View style={styles.captureRoot}>
      <View style={styles.captureOverlay}>
        <View style={styles.captureTextBlock}>
          <ThemedText type="smallBold" style={styles.title}>
            冷蔵庫の中を見せて！
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
            {'冷蔵庫・ドアポケット・野菜室を撮ってね\n（１枚だけでもOK！）'}
          </ThemedText>
        </View>

        <View style={styles.slotRowCentered}>
          <View style={styles.slotRow}>
            {SLOTS.map((slot) => (
              <Pressable key={slot.key} onPress={() => takePhotoForSlot(slot.key)}>
                {({ pressed }) => (
                  <ThemedView type="backgroundElement" style={[styles.slot, pressed && styles.pressed]}>
                    {photos[slot.key] ? (
                      <Image source={{ uri: photos[slot.key]!.uri }} style={styles.slotImage} contentFit="cover" />
                    ) : (
                      <ThemedText style={styles.slotIcon}>📷</ThemedText>
                    )}
                    <ThemedText type="small" style={styles.slotLabel}>
                      {slot.label}
                    </ThemedText>
                  </ThemedView>
                )}
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.captureControls}>
          <Pressable onPress={handleAnalyze} disabled={!hasAnyPhoto}>
            {({ pressed }) => (
              <ThemedView
                type="accent"
                style={[
                  styles.button,
                  !hasAnyPhoto && styles.analyzeButtonDisabled,
                  pressed && hasAnyPhoto && styles.pressed,
                ]}>
                <ThemedText type="smallBold" themeColor="background">
                  これで食材を読み取る
                </ThemedText>
              </ThemedView>
            )}
          </Pressable>

          <Pressable onPress={onBack} style={styles.backLink}>
            <ThemedText type="small" themeColor="textSecondary">
              戻る
            </ThemedText>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  centerFill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  analyzingText: {
    textAlign: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
  },
  title: {
    textAlign: 'center',
  },
  hint: {
    textAlign: 'center',
  },
  captureRoot: {
    flex: 1,
  },
  captureOverlay: {
    flex: 1,
    padding: Spacing.four,
    paddingTop: 124,
  },
  captureTextBlock: {
    gap: Spacing.two,
  },
  // Half of `slot`'s fixed 92px height, so this sits exactly on the
  // container's vertical center regardless of screen size.
  slotRowCentered: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    marginTop: -46,
    paddingHorizontal: Spacing.four,
  },
  // Anchored the same way as slotRowCentered, offset by half the slot
  // height (to clear its bottom edge) plus the requested 50px gap.
  captureControls: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    marginTop: 46 + 50,
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
  },
  slotRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.three,
  },
  slot: {
    width: 92,
    height: 92,
    borderRadius: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    overflow: 'hidden',
  },
  slotImage: {
    ...StyleSheet.absoluteFillObject,
  },
  slotIcon: {
    fontSize: 26,
    lineHeight: 30,
  },
  slotLabel: {
    textAlign: 'center',
  },
  checklist: {
    gap: Spacing.two,
  },
  checklistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
  },
  checklistLabel: {
    flex: 1,
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
  freeTextWrapper: {
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  freeTextInput: {
    fontSize: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  button: {
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.four,
  },
  analyzeButtonDisabled: {
    opacity: 0.85,
  },
  backLink: {
    alignItems: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
