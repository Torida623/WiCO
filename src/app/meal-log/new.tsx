import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TagChips, TagChipOption } from '@/components/chat/tag-chips';
import { NutritionMeter } from '@/components/nutrition-meter';
import { ScreenHeader } from '@/components/screen-header';
import { SideMenu } from '@/components/side-menu';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { fetchWithTimeout, getApiUrl } from '@/lib/api';
import { importMealPhoto, MealType, NutritionBalance, saveMealRecord, searchMealRecords } from '@/lib/meal-records';

const KITCHEN_BACKGROUND = require('@/assets/images/meal-log/kitchen-bg.jpg');
const MASCOT_READING_IMAGE = require('@/assets/images/meal-log/mascot-reading-book.png');
const SPEECH_BUBBLE_IMAGE = require('@/assets/images/meal-log/speech-bubble-cloud.png');
const SPEECH_BUBBLE_ASPECT_RATIO = 1398 / 1125;

const FOOD_GROUP_COLORS = {
  energy: '#F0B84B',
  protein: '#E27058',
  vegetable: '#7FA65C',
} as const;

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: 'images',
  quality: 0.7,
  base64: true,
  // iOS photo library assets are often HEIC, which the nutrition-analysis
  // API rejects (it only accepts png/jpeg/gif/webp). Compatible mode makes
  // the picker hand back a broadly-supported format instead.
  preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
};

const MEAL_TYPE_OPTIONS: TagChipOption[] = [
  { value: 'breakfast', label: '朝' },
  { value: 'lunch', label: '昼' },
  { value: 'dinner', label: '夜' },
  { value: 'snack', label: 'おやつ' },
];

const NUTRITION_FETCH_TIMEOUT_MS = 30_000;

const MEMO_PLACEHOLDER = '料理の感想をペロココに教えてね';

// How far back / how many past records to hand the AI so it can notice
// patterns (e.g. vegetables running low several meals in a row) instead of
// judging each photo in isolation.
const RECENT_MEALS_LOOKBACK_DAYS = 7;
const RECENT_MEALS_LIMIT = 5;

type RecentMealSummary = {
  dishes: string[];
  nutritionBalance?: NutritionBalance;
};

async function getRecentMealSummaries(): Promise<RecentMealSummary[]> {
  const from = new Date();
  from.setDate(from.getDate() - RECENT_MEALS_LOOKBACK_DAYS);
  const records = await searchMealRecords({ from: from.toISOString() });
  return records.slice(0, RECENT_MEALS_LIMIT).map((record) => ({
    dishes: record.dishes,
    nutritionBalance: record.nutritionBalance,
  }));
}

async function analyzeNutritionBalance(
  dishes: string[],
  photoBase64: string | null,
  mimeType: string,
  recentMeals: RecentMealSummary[],
): Promise<NutritionBalance> {
  const res = await fetchWithTimeout(
    getApiUrl('/api/meal-nutrition'),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dishes, photoBase64: photoBase64 ?? undefined, mimeType, recentMeals }),
    },
    NUTRITION_FETCH_TIMEOUT_MS,
  );
  const data = await res.json();
  if (!res.ok) {
    throw new Error(typeof data.message === 'string' ? data.message : 'AIとの通信に失敗しました。');
  }
  return { energy: data.energy, protein: data.protein, vegetable: data.vegetable, comment: data.comment };
}

type Phase = 'capture' | 'naming' | 'analyzing' | 'saved';

export default function NewMealRecordScreen() {
  const [cameraPermission, requestCameraPermission] = ImagePicker.useCameraPermissions();
  const [libraryPermission, requestLibraryPermission] = ImagePicker.useMediaLibraryPermissions();

  const [phase, setPhase] = useState<Phase>('capture');
  const [pickedUri, setPickedUri] = useState<string | null>(null);
  const [pickedBase64, setPickedBase64] = useState<string | null>(null);
  const [pickedMimeType, setPickedMimeType] = useState('image/jpeg');
  const [permanentPhotoUri, setPermanentPhotoUri] = useState<string | null>(null);
  const [dishTitle, setDishTitle] = useState('');
  const [mealType, setMealType] = useState<MealType | null>(null);
  const [memo, setMemo] = useState('');
  const [nutritionBalance, setNutritionBalance] = useState<NutritionBalance | null>(null);

  function resetToCapture() {
    setPhase('capture');
    setPickedUri(null);
    setPickedBase64(null);
    setPickedMimeType('image/jpeg');
    setPermanentPhotoUri(null);
    setDishTitle('');
    setMealType(null);
    setMemo('');
    setNutritionBalance(null);
  }

  async function handlePicked(asset: ImagePicker.ImagePickerAsset) {
    setPickedUri(asset.uri);
    setPickedBase64(asset.base64 ?? null);
    setPickedMimeType(asset.mimeType ?? 'image/jpeg');

    try {
      const permanentUri = await importMealPhoto(asset.uri);
      setPermanentPhotoUri(permanentUri);
      setPhase('naming');
    } catch (error) {
      console.error(error);
      Alert.alert('写真の保存に失敗したよ', 'もう一度試してみてね。');
    }
  }

  async function handleTakePhoto() {
    if (!cameraPermission?.granted) {
      const result = await requestCameraPermission();
      if (!result.granted) {
        Alert.alert('カメラを使えないよ', 'カメラの権限を許可してから試してね。');
        return;
      }
    }
    const result = await ImagePicker.launchCameraAsync(PICKER_OPTIONS);
    if (!result.canceled) await handlePicked(result.assets[0]);
  }

  async function handlePickFromLibrary() {
    if (!libraryPermission?.granted) {
      const result = await requestLibraryPermission();
      if (!result.granted) {
        Alert.alert('写真ライブラリを使えないよ', '写真ライブラリの権限を許可してから試してね。');
        return;
      }
    }
    const result = await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);
    if (!result.canceled) await handlePicked(result.assets[0]);
  }

  function handleChangePhoto() {
    Alert.alert('写真を変更する', undefined, [
      { text: '撮影する', onPress: handleTakePhoto },
      { text: 'ギャラリーから選ぶ', onPress: handlePickFromLibrary },
      { text: 'キャンセル', style: 'cancel' },
    ]);
  }

  async function handleConfirmNaming() {
    if (!permanentPhotoUri) return;
    const finalDishes = dishTitle.trim() ? [dishTitle.trim()] : [];

    setPhase('analyzing');
    try {
      let balance: NutritionBalance | null = null;
      if (finalDishes.length > 0) {
        try {
          const recentMeals = await getRecentMealSummaries();
          balance = await analyzeNutritionBalance(finalDishes, pickedBase64, pickedMimeType, recentMeals);
        } catch (error) {
          console.error(error);
        }
      }
      setNutritionBalance(balance);

      await saveMealRecord({
        eatenAt: new Date().toISOString(),
        mealType: mealType ?? undefined,
        photoUri: permanentPhotoUri,
        dishes: finalDishes,
        memo: memo.trim() || undefined,
        nutritionBalance: balance ?? undefined,
      });
      setPhase('saved');
    } catch (error) {
      console.error(error);
      Alert.alert('記録に失敗したよ', 'もう一度試してみてね。');
      setPhase('naming');
    }
  }

  return (
    <View style={styles.container}>
      <Image source={KITCHEN_BACKGROUND} style={styles.absoluteFill} contentFit="cover" />
      <SideMenu />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ScreenHeader title="記録する" onBack={() => router.back()} />

        {phase === 'capture' && (
          <View style={[styles.content, styles.captureContent]} pointerEvents="box-none">
            <View style={styles.introArea}>
              <View style={styles.introBubbleWrap}>
                <Image source={SPEECH_BUBBLE_IMAGE} style={styles.introBubbleImage} contentFit="contain" />
                <View style={styles.introBubbleTextWrap} pointerEvents="none">
                  <ThemedText type="smallBold" style={styles.introBubbleText}>
                    食べたお料理を{'\n'}記録するよ♪
                  </ThemedText>
                </View>
              </View>
              <Image source={MASCOT_READING_IMAGE} style={styles.introMascotImage} contentFit="contain" />
            </View>
            <View style={[styles.buttonRow, styles.captureButtonRow]}>
              <Pressable onPress={handleTakePhoto} style={styles.actionButtonPressable}>
                {({ pressed }) => (
                  <ThemedView type="accent" style={[styles.actionButton, pressed && styles.pressed]}>
                    <ThemedText type="smallBold" themeColor="background">
                      撮影する
                    </ThemedText>
                  </ThemedView>
                )}
              </Pressable>
              <Pressable onPress={handlePickFromLibrary} style={styles.actionButtonPressable}>
                {({ pressed }) => (
                  <ThemedView type="accent" style={[styles.actionButton, pressed && styles.pressed]}>
                    <ThemedText type="smallBold" themeColor="background">
                      ギャラリーから選ぶ
                    </ThemedText>
                  </ThemedView>
                )}
              </Pressable>
            </View>
          </View>
        )}

        {phase === 'naming' && (
          <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Spacing.six}>
            <ScrollView contentContainerStyle={styles.editContent} keyboardShouldPersistTaps="handled">
              {pickedUri && (
                <Pressable onPress={handleChangePhoto} style={styles.editPreviewWrap}>
                  <Image source={{ uri: pickedUri }} style={styles.editPreview} contentFit="cover" />
                  <View style={styles.changePhotoBadge}>
                    <ThemedText type="small" themeColor="background">
                      写真を変更する
                    </ThemedText>
                  </View>
                </Pressable>
              )}

              <View style={styles.section}>
                <ThemedText type="smallBold">この料理を食べたのはいつかな？</ThemedText>
                <TagChips
                  options={MEAL_TYPE_OPTIONS}
                  selected={mealType}
                  onSelect={(value) => setMealType(value as MealType | null)}
                />
              </View>

              <View style={styles.section}>
                <ThemedText type="smallBold">この料理にタイトルをつけてね♪</ThemedText>
                <TextInput
                  value={dishTitle}
                  onChangeText={setDishTitle}
                  placeholder="料理名"
                  style={styles.dishInput}
                />
              </View>

              <View style={styles.section}>
                <ThemedText type="smallBold">今回の料理はどうだったかな？</ThemedText>
                <TextInput
                  value={memo}
                  onChangeText={setMemo}
                  placeholder={MEMO_PLACEHOLDER}
                  style={styles.memoInput}
                  multiline
                />
              </View>

              <Pressable onPress={handleConfirmNaming}>
                {({ pressed }) => (
                  <ThemedView type="accent" style={[styles.confirmButton, pressed && styles.pressed]}>
                    <ThemedText type="smallBold" themeColor="background">
                      OK
                    </ThemedText>
                  </ThemedView>
                )}
              </Pressable>
            </ScrollView>
          </KeyboardAvoidingView>
        )}

        {phase === 'analyzing' && (
          <View style={styles.content}>
            {pickedUri && <Image source={{ uri: pickedUri }} style={styles.preview} contentFit="cover" />}
            <View style={styles.analyzingOverlay}>
              <ActivityIndicator />
              <ThemedText type="small" themeColor="textSecondary">
                ペロココが料理を見てるよ…
              </ThemedText>
            </View>
          </View>
        )}

        {phase === 'saved' && (
          <ScrollView contentContainerStyle={styles.editContent}>
            {pickedUri && <Image source={{ uri: pickedUri }} style={styles.editPreview} contentFit="cover" />}
            <ThemedText type="small" themeColor="textSecondary" style={styles.savedNote}>
              記録したよ！
            </ThemedText>

            {nutritionBalance && (
              <View style={styles.section}>
                <ThemedText type="smallBold">栄養バランス</ThemedText>
                <NutritionMeter
                  label="エネルギーになる食品"
                  level={nutritionBalance.energy}
                  color={FOOD_GROUP_COLORS.energy}
                />
                <NutritionMeter
                  label="血や肉をつくる食品"
                  level={nutritionBalance.protein}
                  color={FOOD_GROUP_COLORS.protein}
                />
                <NutritionMeter
                  label="体の調子を整える食品"
                  level={nutritionBalance.vegetable}
                  color={FOOD_GROUP_COLORS.vegetable}
                />
                {nutritionBalance.comment && (
                  <ThemedView type="backgroundElement" style={styles.commentBubble}>
                    <ThemedText type="small">{nutritionBalance.comment}</ThemedText>
                  </ThemedView>
                )}
              </View>
            )}

            <View style={styles.buttonRow}>
              <Pressable onPress={resetToCapture} style={styles.actionButtonPressable}>
                {({ pressed }) => (
                  <ThemedView type="accent" style={[styles.actionButton, pressed && styles.pressed]}>
                    <ThemedText type="smallBold" themeColor="background">
                      もう一枚記録する
                    </ThemedText>
                  </ThemedView>
                )}
              </Pressable>
              <Pressable onPress={() => router.back()} style={styles.actionButtonPressable}>
                {({ pressed }) => (
                  <ThemedView type="backgroundElement" style={[styles.actionButton, pressed && styles.pressed]}>
                    <ThemedText type="smallBold">戻る</ThemedText>
                  </ThemedView>
                )}
              </Pressable>
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  absoluteFill: {
    ...StyleSheet.absoluteFillObject,
  },
  flex: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  content: {
    flex: 1,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  captureContent: {
    transform: [{ translateY: -(Spacing.six + Spacing.four) }],
  },
  preview: {
    flex: 1,
    borderRadius: Spacing.three,
  },
  introArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  introBubbleWrap: {
    width: '62%',
    aspectRatio: SPEECH_BUBBLE_ASPECT_RATIO,
    marginBottom: -Spacing.four,
    marginRight: '40%',
    transform: [{ translateY: Spacing.four }],
    zIndex: 1,
  },
  introBubbleImage: {
    width: '100%',
    height: '100%',
  },
  introBubbleTextWrap: {
    position: 'absolute',
    top: '22%',
    left: '20%',
    right: '20%',
    bottom: '22%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  introBubbleText: {
    textAlign: 'center',
  },
  introMascotImage: {
    width: '62%',
    aspectRatio: 1,
    marginLeft: '24%',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  captureButtonRow: {
    marginTop: -Spacing.six,
  },
  actionButtonPressable: {
    flex: 1,
  },
  actionButton: {
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    alignItems: 'center',
  },
  analyzingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: Spacing.three,
  },
  editContent: {
    padding: Spacing.three,
    gap: Spacing.four,
  },
  editPreviewWrap: {
    width: '100%',
  },
  editPreview: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: Spacing.three,
  },
  changePhotoBadge: {
    position: 'absolute',
    right: Spacing.two,
    bottom: Spacing.two,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.two,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  section: {
    gap: Spacing.two,
  },
  commentBubble: {
    marginTop: Spacing.one,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  dishInput: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  memoInput: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
    backgroundColor: 'rgba(0,0,0,0.05)',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  confirmButton: {
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    alignItems: 'center',
  },
  savedNote: {
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
