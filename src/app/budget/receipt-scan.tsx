import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/screen-header';
import { SideMenu } from '@/components/side-menu';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { fetchWithTimeout, getApiUrl } from '@/lib/api';
import { addExpenseEntry, ExpenseCategory, formatYen } from '@/lib/household-budget';

const RECEIPT_SCAN_TIMEOUT_MS = 30_000;

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: 'images',
  quality: 0.5,
  base64: true,
  preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
};

type Phase = 'capture' | 'analyzing' | 'checklist';

type ReceiptItem = {
  id: string;
  name: string;
  amount: number;
  category: ExpenseCategory;
  included: boolean;
};

/** Reads the receipt's own printed date as local noon, so it lands in the right month regardless of when the photo was actually reviewed. */
function parsePurchaseDate(value: string | null): Date | undefined {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return undefined;
  const [, year, month, day] = match;
  return new Date(Number(year), Number(month) - 1, Number(day), 12, 0, 0);
}

function formatPurchaseDateLabel(value: string): string {
  const match = value.match(/^\d{4}-(\d{2})-(\d{2})$/);
  return match ? `${Number(match[1])}/${Number(match[2])}` : value;
}

export default function ReceiptScanScreen() {
  const theme = useTheme();
  const [cameraPermission, requestCameraPermission] = ImagePicker.useCameraPermissions();
  const [phase, setPhase] = useState<Phase>('capture');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [storeName, setStoreName] = useState<string | null>(null);
  const [purchaseDate, setPurchaseDate] = useState<string | null>(null);
  const [items, setItems] = useState<ReceiptItem[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  async function analyze(asset: ImagePicker.ImagePickerAsset) {
    if (!asset.base64) return;
    setPhotoUri(asset.uri);
    setPhase('analyzing');
    setErrorMessage('');
    setStoreName(null);
    setPurchaseDate(null);
    try {
      const res = await fetchWithTimeout(
        getApiUrl('/api/receipt-scan'),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ photo: { base64: asset.base64, mimeType: asset.mimeType ?? 'image/jpeg' } }),
        },
        RECEIPT_SCAN_TIMEOUT_MS,
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(typeof data.message === 'string' ? data.message : '読み取りに失敗しました。');
      }
      const rawItems: { name: string; amount: number; category: ExpenseCategory }[] = Array.isArray(data.items)
        ? data.items
        : [];
      setStoreName(typeof data.storeName === 'string' ? data.storeName : null);
      setPurchaseDate(typeof data.purchaseDate === 'string' ? data.purchaseDate : null);
      setItems(
        rawItems.map((item, index) => ({
          id: `${index}-${item.name}`,
          name: item.name,
          amount: item.amount,
          category: item.category,
          included: true,
        })),
      );
      setPhase('checklist');
    } catch (error) {
      console.error(error);
      setItems([]);
      setErrorMessage('うまく読み取れなかったみたい…撮り直してみてね。');
      setPhase('checklist');
    }
  }

  async function takePhoto() {
    if (!cameraPermission?.granted) {
      const result = await requestCameraPermission();
      if (!result.granted) return;
    }
    const result = await ImagePicker.launchCameraAsync(PICKER_OPTIONS);
    if (!result.canceled) analyze(result.assets[0]);
  }

  function toggleIncluded(id: string) {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, included: !item.included } : item)));
  }

  function toggleCategory(id: string) {
    setItems((current) =>
      current.map((item) =>
        item.id === id ? { ...item, category: item.category === 'food' ? 'other' : 'food' } : item,
      ),
    );
  }

  const includedItems = items.filter((item) => item.included);
  const foodTotal = includedItems.filter((item) => item.category === 'food').reduce((sum, i) => sum + i.amount, 0);
  const otherTotal = includedItems.filter((item) => item.category === 'other').reduce((sum, i) => sum + i.amount, 0);
  const canSave = foodTotal + otherTotal > 0;

  async function handleSave() {
    if (!canSave || isSaving) return;
    setIsSaving(true);
    const memo = storeName ?? undefined;
    const occurredAt = parsePurchaseDate(purchaseDate);
    try {
      if (foodTotal > 0) await addExpenseEntry({ amount: foodTotal, category: 'food', memo, occurredAt });
      if (otherTotal > 0) await addExpenseEntry({ amount: otherTotal, category: 'other', memo, occurredAt });
      router.back();
    } catch (error) {
      console.error(error);
      setIsSaving(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SideMenu />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ScreenHeader title="レシート読み取り" onBack={() => router.back()} />

        {phase === 'analyzing' && (
          <View style={styles.centered}>
            <ActivityIndicator color={theme.accent} />
            <ThemedText type="small" themeColor="textSecondary" style={styles.analyzingText}>
              レシートを読み取ってるよ…
            </ThemedText>
          </View>
        )}

        {phase === 'capture' && (
          <View style={styles.captureArea}>
            {photoUri && <Image source={{ uri: photoUri }} style={styles.preview} contentFit="contain" />}
            <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
              レシートを撮影してね
            </ThemedText>
            <Pressable onPress={takePhoto}>
              {({ pressed }) => (
                <ThemedView type="accent" style={[styles.captureButton, pressed && styles.pressed]}>
                  <ThemedText type="smallBold" themeColor="background">
                    撮影する
                  </ThemedText>
                </ThemedView>
              )}
            </Pressable>
          </View>
        )}

        {phase === 'checklist' && (
          <ScrollView contentContainerStyle={styles.checklistContent} keyboardShouldPersistTaps="handled">
            {(storeName || purchaseDate) && (
              <View style={styles.receiptMetaRow}>
                {storeName && <ThemedText type="smallBold">{storeName}</ThemedText>}
                {purchaseDate && (
                  <ThemedText type="small" themeColor="textSecondary">
                    {formatPurchaseDateLabel(purchaseDate)}の購入
                  </ThemedText>
                )}
              </View>
            )}

            {errorMessage ? (
              <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
                {errorMessage}
              </ThemedText>
            ) : items.length === 0 ? (
              <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
                商品を読み取れなかったよ。撮り直してみてね。
              </ThemedText>
            ) : (
              <View style={styles.itemList}>
                {items.map((item) => (
                  <View key={item.id} style={styles.itemRow}>
                    <Pressable onPress={() => toggleIncluded(item.id)} style={styles.itemCheckboxArea}>
                      {({ pressed }) => (
                        <ThemedView
                          type={item.included ? 'backgroundSelected' : 'backgroundElement'}
                          style={[styles.itemCheckboxRow, pressed && styles.pressed]}>
                          <View
                            style={[
                              styles.checkbox,
                              { borderColor: item.included ? theme.accent : theme.textSecondary },
                              item.included && { backgroundColor: theme.accent },
                            ]}>
                            {item.included && (
                              <ThemedText type="smallBold" themeColor="background" style={styles.checkboxMark}>
                                ✓
                              </ThemedText>
                            )}
                          </View>
                          <ThemedText type="small" style={styles.itemName}>
                            {item.name}
                          </ThemedText>
                          <ThemedText type="small" themeColor="textSecondary">
                            {formatYen(item.amount)}
                          </ThemedText>
                        </ThemedView>
                      )}
                    </Pressable>
                    <Pressable onPress={() => toggleCategory(item.id)}>
                      {({ pressed }) => (
                        <ThemedView
                          type={item.category === 'food' ? 'accent' : 'backgroundElement'}
                          style={[styles.categoryTag, pressed && styles.pressed]}>
                          <ThemedText
                            type="small"
                            themeColor={item.category === 'food' ? 'background' : 'textSecondary'}>
                            {item.category === 'food' ? '食費' : '食費以外'}
                          </ThemedText>
                        </ThemedView>
                      )}
                    </Pressable>
                  </View>
                ))}
              </View>
            )}

            {items.length > 0 && (
              <ThemedText type="small" themeColor="textSecondary" style={styles.totalsText}>
                食費 {formatYen(foodTotal)} ／ 食費以外 {formatYen(otherTotal)}
              </ThemedText>
            )}

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
              <Pressable style={styles.flex} onPress={handleSave} disabled={!canSave || isSaving}>
                {({ pressed }) => (
                  <ThemedView
                    type="accent"
                    style={[styles.button, (pressed || !canSave || isSaving) && styles.pressed]}>
                    <ThemedText type="smallBold" themeColor="background">
                      これで記録する
                    </ThemedText>
                  </ThemedView>
                )}
              </Pressable>
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  flex: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  analyzingText: {
    textAlign: 'center',
  },
  captureArea: {
    flex: 1,
    justifyContent: 'center',
    padding: Spacing.four,
    gap: Spacing.three,
  },
  preview: {
    width: '100%',
    height: 220,
    borderRadius: Spacing.three,
  },
  hint: {
    textAlign: 'center',
  },
  captureButton: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
    borderRadius: Spacing.four,
  },
  checklistContent: {
    flexGrow: 1,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  receiptMetaRow: {
    alignItems: 'center',
    gap: Spacing.half,
  },
  itemList: {
    gap: Spacing.one,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  itemCheckboxArea: {
    flex: 1,
  },
  itemCheckboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
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
  itemName: {
    flex: 1,
  },
  categoryTag: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.three,
  },
  totalsText: {
    textAlign: 'center',
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
  pressed: {
    opacity: 0.7,
  },
});
