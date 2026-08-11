import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NutritionMeter } from '@/components/nutrition-meter';
import { ScreenHeader } from '@/components/screen-header';
import { SideMenu } from '@/components/side-menu';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { fetchWithTimeout, getApiUrl } from '@/lib/api';
import { importMealPhoto, MealType, NutritionBalance, saveMealRecord, searchMealRecords } from '@/lib/meal-records';

const KITCHEN_BACKGROUND = require('@/assets/images/meal-log/kitchen-bg.jpg');
const MASCOT_READING_IMAGE = require('@/assets/images/meal-log/mascot-reading-book.png');
const SPEECH_BUBBLE_IMAGE = require('@/assets/images/meal-log/speech-bubble-cloud.png');
const SPEECH_BUBBLE_ASPECT_RATIO = 1398 / 1125;

// ひなた作の「記録する」フォームカード素材。見出し文言・区切り線・プレースホル
// ダー文字は絵の中に焼き込まれていて、コード側は空欄ゾーンに朝/昼/夜/おやつの
// 画像ボタンとTextInputを重ねるだけ。左右の余白は写真プレビューと横幅を揃えるため実際の絵の輪郭ぎり
// ぎりまでトリム済み(830x1135)。座標はそのトリム後の画像上の実測値をパーセン
// トに変換したもの。
const NAMING_FORM_CARD_IMAGE = require('@/assets/images/meal-log/naming-form-card.png');
const NAMING_FORM_CARD_ASPECT_RATIO = 830 / 1135;
const NAMING_CONFIRM_BUTTON_IMAGE = require('@/assets/images/meal-log/naming-confirm-button.png');
const NAMING_CONFIRM_BUTTON_ASPECT_RATIO = 1707 / 382;

// Wooden photo-frame overlay for the picked photo. The frame PNG has its
// inner window cut out (transparent), so the photo sits in a plain View
// behind it, inset to NAMING_PHOTO_WINDOW, with the frame drawn on top.
const NAMING_PHOTO_FRAME_IMAGE = require('@/assets/images/meal-log/naming-photo-frame.png');
const NAMING_PHOTO_FRAME_ASPECT_RATIO = 1451 / 985;
const NAMING_PHOTO_WINDOW = { top: '10.6%', left: '6.1%', width: '87.5%', height: '78.9%' } as const;
const NAMING_CHANGE_PHOTO_BADGE_IMAGE = require('@/assets/images/meal-log/naming-change-photo-badge.png');
const NAMING_CHANGE_PHOTO_BADGE_ASPECT_RATIO = 1363 / 382;

// タイトル・メモ欄は、絵に焼き込まれた「料理名」等のプレースホルダー文字を隠す
// ための不透明パッチ(枠内の塗り色をサンプリングした色)の上に、実際に入力でき
// るTextInputを重ねている。パッチは絵に描かれた枠線のすぐ内側までしか広げず、
// 枠線自体は覆わずに見せている。
const NAMING_FORM_CARD_FILL_COLOR = 'rgb(253, 246, 236)';
const NAMING_CHIPS_ZONE = { top: '14.5%', left: '2.2%', width: '95.3%' } as const;
const NAMING_TITLE_BOX = { top: '40.4%', left: '8.2%', width: '83.3%', height: '10.8%' } as const;
// height is a fixed dp (not a % of the card) because it has to match the
// memoInput/memoPreviewText line-height math below, which is also fixed dp —
// a %-based height drifted out of sync with that on different screen sizes.
const NAMING_MEMO_BOX = { top: '69.7%', left: '7.0%', width: '85.6%', height: 100 } as const;

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

// ひなた作の食事タイプボタン。history.tsxの期間フィルターと同様、未選択(クリーム)/
// 選択中(オレンジ)で丸ごと絵が違うので状態ごとに画像をソース切り替えする。ボタンごとに
// 実測アスペクト比が微妙に違うので、未選択画像の比率を基準に固定枠を作り、選択中画像は
// contain指定でその枠に収める(枠を固定してトグル時のガタつきを防ぐ)。
const MEAL_TYPE_PILL_IMAGES = {
  breakfast: {
    off: require('@/assets/images/meal-log/meal-type-pill-breakfast-off.png'),
    on: require('@/assets/images/meal-log/meal-type-pill-breakfast-on.png'),
    aspectRatio: 336 / 226,
  },
  lunch: {
    off: require('@/assets/images/meal-log/meal-type-pill-lunch-off.png'),
    on: require('@/assets/images/meal-log/meal-type-pill-lunch-on.png'),
    aspectRatio: 332 / 229,
  },
  dinner: {
    off: require('@/assets/images/meal-log/meal-type-pill-dinner-off.png'),
    on: require('@/assets/images/meal-log/meal-type-pill-dinner-on.png'),
    aspectRatio: 335 / 229,
  },
  snack: {
    off: require('@/assets/images/meal-log/meal-type-pill-snack-off.png'),
    on: require('@/assets/images/meal-log/meal-type-pill-snack-on.png'),
    aspectRatio: 427 / 229,
  },
} as const;

const MEAL_TYPE_OPTIONS: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

function MealTypeFilterChips({
  selected,
  onSelect,
}: {
  selected: MealType | null;
  onSelect: (value: MealType | null) => void;
}) {
  return (
    <View style={styles.mealTypeRow}>
      {MEAL_TYPE_OPTIONS.map((value) => {
        const isSelected = value === selected;
        const { off, on, aspectRatio } = MEAL_TYPE_PILL_IMAGES[value];
        return (
          <Pressable
            key={value}
            onPress={() => onSelect(isSelected ? null : value)}
            style={({ pressed }) => [styles.mealTypePill, { aspectRatio }, pressed && styles.pressed]}
          >
            <Image source={off} style={styles.mealTypePillImage} contentFit="contain" />
            {isSelected && <Image source={on} style={styles.mealTypePillImage} contentFit="contain" />}
          </Pressable>
        );
      })}
    </View>
  );
}

const NUTRITION_FETCH_TIMEOUT_MS = 30_000;

// Rough character budget for ~3 wrapped lines of the memo preview. Doing
// this by hand instead of leaning on numberOfLines/ellipsizeMode, which
// wasn't reliably capping at 3 lines for this box.
const MEMO_PREVIEW_MAX_CHARS = 48;

function truncateMemoPreview(text: string): string {
  if (text.length <= MEMO_PREVIEW_MAX_CHARS) return text;
  return `${text.slice(0, MEMO_PREVIEW_MAX_CHARS)}…`;
}

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
  const theme = useTheme();
  const [cameraPermission, requestCameraPermission] = ImagePicker.useCameraPermissions();
  const [libraryPermission, requestLibraryPermission] = ImagePicker.useMediaLibraryPermissions();

  const [phase, setPhase] = useState<Phase>('capture');
  const [pickedUri, setPickedUri] = useState<string | null>(null);
  const [pickedBase64, setPickedBase64] = useState<string | null>(null);
  const [pickedMimeType, setPickedMimeType] = useState('image/jpeg');
  const [permanentPhotoUri, setPermanentPhotoUri] = useState<string | null>(null);
  const [dishTitle, setDishTitle] = useState('');
  const [dishTitleFocused, setDishTitleFocused] = useState(false);
  const dishTitleInputRef = useRef<TextInput>(null);
  const [mealType, setMealType] = useState<MealType | null>(null);
  const [memo, setMemo] = useState('');
  const [memoFocused, setMemoFocused] = useState(false);
  const memoInputRef = useRef<TextInput>(null);
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
        <ScreenHeader onBack={() => router.back()} />

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
            behavior={Platform.OS === 'android' ? 'height' : undefined}>
            <ScrollView
              contentContainerStyle={styles.editContent}
              keyboardShouldPersistTaps="handled"
              automaticallyAdjustKeyboardInsets
              contentInsetAdjustmentBehavior="automatic">
              {/* Catches taps on the empty space between fields (not just the
                  fields themselves) to dismiss the keyboard — a child
                  Pressable/TextInput still wins the touch over this one.
                  Explicitly blurring (not just Keyboard.dismiss(), which
                  only hides the keyboard UI) so onBlur reliably fires and
                  the memo box swaps back to its 3-line preview. */}
              <Pressable
                style={styles.editContentInner}
                onPress={() => {
                  dishTitleInputRef.current?.blur();
                  memoInputRef.current?.blur();
                  Keyboard.dismiss();
                }}>
                {pickedUri && (
                  <Pressable onPress={handleChangePhoto} style={styles.editPreviewWrap}>
                    <View style={styles.photoFrameWrapper}>
                      <View style={[styles.photoWindow, NAMING_PHOTO_WINDOW]}>
                        <Image source={{ uri: pickedUri }} style={styles.photoWindowImage} contentFit="cover" />
                      </View>
                      <Image source={NAMING_PHOTO_FRAME_IMAGE} style={styles.photoFrameImage} contentFit="contain" />
                      <Image
                        source={NAMING_CHANGE_PHOTO_BADGE_IMAGE}
                        style={styles.changePhotoBadgeImage}
                        contentFit="contain"
                      />
                    </View>
                  </Pressable>
                )}

                <View style={styles.formCardWrapper}>
                  <Image source={NAMING_FORM_CARD_IMAGE} style={styles.formCardImage} contentFit="contain" />

                  <View style={[styles.chipsZone, NAMING_CHIPS_ZONE]}>
                    <MealTypeFilterChips selected={mealType} onSelect={setMealType} />
                  </View>

                  {/* The card art already draws the "料理名"/感想 placeholder
                      text, so the patch only needs to appear once the field
                      is focused or has real text, to keep it from showing
                      through the cursor/typed input — otherwise the box is
                      untouched original art. */}
                  <View
                    style={[
                      styles.inputPatch,
                      NAMING_TITLE_BOX,
                      { backgroundColor: dishTitle || dishTitleFocused ? NAMING_FORM_CARD_FILL_COLOR : 'transparent' },
                    ]}>
                    <TextInput
                      ref={dishTitleInputRef}
                      value={dishTitle}
                      onChangeText={setDishTitle}
                      onFocus={() => setDishTitleFocused(true)}
                      onBlur={() => setDishTitleFocused(false)}
                      style={[styles.dishInput, { color: theme.text }]}
                    />
                  </View>

                  <View
                    style={[
                      styles.inputPatch,
                      NAMING_MEMO_BOX,
                      { backgroundColor: memo || memoFocused ? NAMING_FORM_CARD_FILL_COLOR : 'transparent' },
                    ]}>
                    <TextInput
                      ref={memoInputRef}
                      value={memo}
                      onChangeText={setMemo}
                      onFocus={() => setMemoFocused(true)}
                      onBlur={() => setMemoFocused(false)}
                      style={[styles.memoInput, { color: theme.text }]}
                      multiline
                    />
                    {/* While not editing, show a 3-line/ellipsis preview
                        instead of the scrolled input — tapping it re-focuses
                        the real TextInput underneath for editing. */}
                    {!memoFocused && memo.length > 0 && (
                      <Pressable
                        style={[StyleSheet.absoluteFill, { backgroundColor: NAMING_FORM_CARD_FILL_COLOR }]}
                        onPress={() => memoInputRef.current?.focus()}>
                        <ThemedText style={[styles.memoPreviewText, { color: theme.text }]}>
                          {truncateMemoPreview(memo)}
                        </ThemedText>
                      </Pressable>
                    )}
                  </View>
                </View>

                <Pressable onPress={handleConfirmNaming}>
                  {({ pressed }) => (
                    <Image
                      source={NAMING_CONFIRM_BUTTON_IMAGE}
                      style={[styles.confirmButtonImage, pressed && styles.pressed]}
                      contentFit="contain"
                    />
                  )}
                </Pressable>
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
            <View style={styles.editContentInner}>
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
    flexGrow: 1,
  },
  editContentInner: {
    flexGrow: 1,
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
  photoFrameWrapper: {
    width: '100%',
    aspectRatio: NAMING_PHOTO_FRAME_ASPECT_RATIO,
    position: 'relative',
  },
  photoWindow: {
    position: 'absolute',
    overflow: 'hidden',
  },
  photoWindowImage: {
    width: '100%',
    height: '100%',
  },
  photoFrameImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  changePhotoBadgeImage: {
    position: 'absolute',
    right: '14%',
    bottom: '2%',
    width: '32%',
    aspectRatio: NAMING_CHANGE_PHOTO_BADGE_ASPECT_RATIO,
  },
  section: {
    gap: Spacing.two,
  },
  formCardWrapper: {
    width: '100%',
    aspectRatio: NAMING_FORM_CARD_ASPECT_RATIO,
    position: 'relative',
  },
  formCardImage: {
    width: '100%',
    height: '100%',
  },
  chipsZone: {
    position: 'absolute',
  },
  mealTypeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  mealTypePill: {
    height: 36,
  },
  mealTypePillImage: {
    ...StyleSheet.absoluteFillObject,
  },
  inputPatch: {
    position: 'absolute',
    borderRadius: Spacing.three,
    overflow: 'hidden',
  },
  commentBubble: {
    marginTop: Spacing.one,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  dishInput: {
    flex: 1,
    paddingHorizontal: Spacing.three,
    fontSize: 14,
  },
  memoInput: {
    // Fixed to ~3 lines — typing more is fine, it just scrolls internally
    // instead of growing (or overflowing) the box. Generous vs. the bare
    // 3*lineHeight+padding math (68) — that was clipping part of line 3 in
    // practice, so this leaves real headroom instead of a tight fit.
    height: 90,
    lineHeight: 20,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  memoPreviewText: {
    // No fixed height here — numberOfLines={3} on the Text itself already
    // caps it at 3 lines; adding a height too (like memoInput needs, for
    // the scrollable TextInput) ended up clipping it to fewer lines.
    lineHeight: 20,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    fontSize: 14,
  },
  confirmButtonImage: {
    width: '100%',
    aspectRatio: NAMING_CONFIRM_BUTTON_ASPECT_RATIO,
  },
  savedNote: {
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
