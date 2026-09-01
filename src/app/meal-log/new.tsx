import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
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

import { ScreenHeader } from '@/components/screen-header';
import { SideMenu } from '@/components/side-menu';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useHierarchicalBack } from '@/hooks/use-hierarchical-back';
import { useTheme } from '@/hooks/use-theme';
import { fetchWithTimeout, getApiUrl } from '@/lib/api';
import { grantFirstCookingTrioGift } from '@/lib/first-cooking-gifts';
import {
  buildLinkedRecipesFromMenu,
  DecidedMenu,
  getDecidedMenu,
  listDecidedMenus,
  pickPrimaryLinkedRecipeTitle,
} from '@/lib/decided-menus';
import { refreshKitchenMemory } from '@/lib/kitchen-memory';
import { importMealPhoto, MealType, NutritionBalance, saveMealRecord, searchMealRecords } from '@/lib/meal-records';

const KITCHEN_BACKGROUND = require('@/assets/images/meal-log/kitchen-bg.jpg');
const MASCOT_READING_IMAGE = require('@/assets/images/meal-log/mascot-reading-book.png');
const SPEECH_BUBBLE_IMAGE = require('@/assets/images/meal-log/speech-bubble-cloud.png');
const SPEECH_BUBBLE_ASPECT_RATIO = 1398 / 1125;

// ひなた作の記録元選択ボタン3種。撮影する・ギャラリーから選ぶのカード自体の高さ(文字だけが描かれて
// いる、カメラの下がったストラップやギャラリー側の飾りテープなど枠外にはみ出す装飾がない場所で測った
// 高さ)を実測すると、撮影する=566px・ギャラリーから選ぶ=527pxで、後者は上に約58pxの透明な余白
// (装飾の縦のはみ出し分を画像の外形に含めたトリムの都合)が乗っている。GALLERY_BUTTON_HEIGHT_SCALE
// はその分を打ち消してカードの実寸高さを揃えるための倍率(566/567 ÷ 527/585 ≈ 1.11)。
const TAKE_PHOTO_BUTTON_IMAGE = require('@/assets/images/meal-log/take-photo-button-v2.png');
const TAKE_PHOTO_BUTTON_ASPECT_RATIO = 2078 / 567;
const PICK_FROM_GALLERY_BUTTON_IMAGE = require('@/assets/images/meal-log/pick-from-gallery-button-v2.png');
const PICK_FROM_GALLERY_BUTTON_ASPECT_RATIO = 1696 / 585;
const GALLERY_BUTTON_HEIGHT_SCALE = 1.11;
const PICK_FROM_MENU_BUTTON_IMAGE = require('@/assets/images/meal-log/pick-from-menu-button.png');
const PICK_FROM_MENU_BUTTON_ASPECT_RATIO = 1124 / 236;
const CAPTURE_BUTTON_GAP = Spacing.two;
/** 両方のボタンを一緒に大きく/小さくしたい時はこの値だけ変える。1.0が「行の横幅ぴったりに収まる
 * 最大サイズ」なので、1より大きくすると画面幅からはみ出す — 小さくする方向(1未満)だけ安全。 */
const CAPTURE_BUTTON_OVERALL_SCALE = 1;

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

type Phase = 'capture' | 'naming' | 'analyzing';

export default function NewMealRecordScreen() {
  const theme = useTheme();
  const goBack = useHierarchicalBack();
  const { menuId, dishIndices: dishIndicesParam } = useLocalSearchParams<{ menuId?: string; dishIndices?: string }>();
  const [cameraPermission, requestCameraPermission] = ImagePicker.useCameraPermissions();
  const [libraryPermission, requestLibraryPermission] = ImagePicker.useMediaLibraryPermissions();

  const [phase, setPhase] = useState<Phase>('capture');
  const [captureButtonRowWidth, setCaptureButtonRowWidth] = useState(0);
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
  // 参考にした献立 — either handed off via ?menuId= from 献立ノート's「料理の思い出に記録する」button, or
  // picked directly on this screen's 献立から選ぶ picker (for when a photo gets taken first, without
  // ever visiting 献立ノート). Both paths converge on the same selectedMenu/selectedDishIndices state.
  const [recentMenus, setRecentMenus] = useState<DecidedMenu[]>([]);
  const [selectedMenu, setSelectedMenu] = useState<DecidedMenu | null>(null);
  const [selectedDishIndices, setSelectedDishIndices] = useState<Set<number>>(new Set());
  // Hidden by default so the capture screen starts as just 撮影する/ギャラリーから選ぶ — opens up (and
  // starts pre-opened) once there's a reason to show it: the person taps 献立から選ぶ, or a menu
  // already arrived via ?menuId= from 献立ノート.
  const [showMenuPicker, setShowMenuPicker] = useState(Boolean(menuId));

  useEffect(() => {
    listDecidedMenus().then(setRecentMenus);
  }, []);

  useEffect(() => {
    if (!menuId) return;
    let cancelled = false;
    getDecidedMenu(menuId).then((menu) => {
      if (cancelled || !menu) return;
      const dishIndices = dishIndicesParam
        ? dishIndicesParam
            .split(',')
            .map((s) => Number(s))
            .filter((n) => !Number.isNaN(n))
        : (menu.dishes ?? []).map((_, index) => index);
      setSelectedMenu(menu);
      setSelectedDishIndices(new Set(dishIndices));
      setShowMenuPicker(true);
    });
    return () => {
      cancelled = true;
    };
  }, [menuId, dishIndicesParam]);

  // The dish-name field only exists from the 'naming' phase onward, i.e. always after any menu
  // selection happens (param-driven on mount, or picked on this still-photo-less capture screen) —
  // so it's always safe to overwrite here rather than only filling it in when empty.
  useEffect(() => {
    if (!selectedMenu) return;
    const recipes = buildLinkedRecipesFromMenu(
      selectedMenu,
      selectedMenu.dishes && selectedMenu.dishes.length > 0 ? [...selectedDishIndices] : undefined,
    );
    setDishTitle(pickPrimaryLinkedRecipeTitle(recipes));
  }, [selectedMenu, selectedDishIndices]);

  function toggleMenuSelection(menu: DecidedMenu) {
    if (selectedMenu?.id === menu.id) {
      setSelectedMenu(null);
      setSelectedDishIndices(new Set());
      setDishTitle('');
      return;
    }
    setSelectedMenu(menu);
    setSelectedDishIndices(new Set((menu.dishes ?? []).map((_, index) => index)));
  }

  function toggleSelectedDish(index: number) {
    setSelectedDishIndices((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
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

      const linkedRecipes = selectedMenu
        ? buildLinkedRecipesFromMenu(
            selectedMenu,
            selectedMenu.dishes && selectedMenu.dishes.length > 0 ? [...selectedDishIndices] : undefined,
          )
        : undefined;

      const record = await saveMealRecord({
        eatenAt: new Date().toISOString(),
        mealType: mealType ?? undefined,
        photoUri: permanentPhotoUri,
        dishes: finalDishes,
        memo: memo.trim() || undefined,
        nutritionBalance: balance ?? undefined,
        linkedRecipes,
      });
      // Fire-and-forget: only worth re-deriving when this save actually adds new evidence.
      if (memo.trim()) refreshKitchenMemory().catch((error) => console.error(error));
      grantFirstCookingTrioGift('meal-record').catch((error) => console.error(error));
      // The memory's own detail page shows the same nutrition summary and (when this record came
      // from a decided menu) the 研究所にレシピを保存する checklist, so there's no separate "saved"
      // screen to duplicate that here — just hand off to the page that persists. Its back button
      // walks the screen hierarchy (→ これまでの記録) regardless of how we got here, so no need to
      // tell it which entry point this was.
      router.replace({ pathname: '/meal-log/[id]', params: { id: record.id } });
    } catch (error) {
      console.error(error);
      Alert.alert('記録に失敗したよ', 'もう一度試してみてね。');
      setPhase('naming');
    }
  }

  // Solves for a base height so that takePhotoHeight = base and galleryHeight = base *
  // GALLERY_BUTTON_HEIGHT_SCALE (equalizing the two cards' actual measured body height) while the
  // two widths (each height * its own aspect ratio) plus the gap still add up to exactly the row's
  // measured width — always fits the screen, whatever the device. CAPTURE_BUTTON_OVERALL_SCALE then
  // scales both together, for whenever the buttons as a whole should get bigger or smaller.
  const captureButtonBaseHeight =
    captureButtonRowWidth > 0
      ? ((captureButtonRowWidth - CAPTURE_BUTTON_GAP) /
          (TAKE_PHOTO_BUTTON_ASPECT_RATIO + GALLERY_BUTTON_HEIGHT_SCALE * PICK_FROM_GALLERY_BUTTON_ASPECT_RATIO)) *
        CAPTURE_BUTTON_OVERALL_SCALE
      : 0;
  const takePhotoButtonHeight = captureButtonBaseHeight;
  const takePhotoButtonWidth = takePhotoButtonHeight * TAKE_PHOTO_BUTTON_ASPECT_RATIO;
  const pickFromGalleryButtonHeight = captureButtonBaseHeight * GALLERY_BUTTON_HEIGHT_SCALE;
  const pickFromGalleryButtonWidth = pickFromGalleryButtonHeight * PICK_FROM_GALLERY_BUTTON_ASPECT_RATIO;

  return (
    <View style={styles.container}>
      <Image source={KITCHEN_BACKGROUND} style={styles.absoluteFill} contentFit="cover" />
      <SideMenu />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ScreenHeader onBack={goBack} />

        {phase === 'capture' && (
          <ScrollView style={styles.flex} contentContainerStyle={styles.captureScrollContent} pointerEvents="box-none">
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
            <View
              style={[styles.buttonRow, styles.captureButtonRow]}
              onLayout={(event) => setCaptureButtonRowWidth(event.nativeEvent.layout.width)}
            >
              {captureButtonRowWidth > 0 && (
                <>
                  <Pressable onPress={handleTakePhoto}>
                    {({ pressed }) => (
                      <Image
                        source={TAKE_PHOTO_BUTTON_IMAGE}
                        style={[
                          { width: takePhotoButtonWidth, height: takePhotoButtonHeight },
                          pressed && styles.pressed,
                        ]}
                        contentFit="contain"
                      />
                    )}
                  </Pressable>
                  <Pressable onPress={handlePickFromLibrary}>
                    {({ pressed }) => (
                      <Image
                        source={PICK_FROM_GALLERY_BUTTON_IMAGE}
                        style={[
                          { width: pickFromGalleryButtonWidth, height: pickFromGalleryButtonHeight },
                          pressed && styles.pressed,
                        ]}
                        contentFit="contain"
                      />
                    )}
                  </Pressable>
                </>
              )}
            </View>

            {recentMenus.length > 0 && !showMenuPicker && (
              <Pressable onPress={() => setShowMenuPicker(true)} style={styles.menuPickerToggleButtonPressable}>
                {({ pressed }) => (
                  <Image
                    source={PICK_FROM_MENU_BUTTON_IMAGE}
                    style={[
                      {
                        width: takePhotoButtonHeight * PICK_FROM_MENU_BUTTON_ASPECT_RATIO,
                        height: takePhotoButtonHeight,
                      },
                      pressed && styles.pressed,
                    ]}
                    contentFit="contain"
                  />
                )}
              </Pressable>
            )}

            {showMenuPicker && recentMenus.length > 0 && (
              <View style={styles.menuPickerSection} pointerEvents="box-none">
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.menuChipRow}
                >
                  {recentMenus.map((menu) => {
                    const selected = selectedMenu?.id === menu.id;
                    const primaryTitle = pickPrimaryLinkedRecipeTitle(buildLinkedRecipesFromMenu(menu));
                    const extraCount = (menu.dishes?.length ?? 1) - 1;
                    return (
                      <Pressable key={menu.id} onPress={() => toggleMenuSelection(menu)}>
                        {({ pressed }) => (
                          <View
                            style={[styles.menuChip, selected && { backgroundColor: theme.accent }, pressed && styles.pressed]}
                          >
                            <ThemedText type="small" themeColor={selected ? 'background' : 'text'}>
                              {primaryTitle}
                              {extraCount > 0 ? `　他${extraCount}品` : ''}
                            </ThemedText>
                          </View>
                        )}
                      </Pressable>
                    );
                  })}
                </ScrollView>

                {selectedMenu && selectedMenu.dishes && selectedMenu.dishes.length > 1 && (
                  <View style={styles.checklist}>
                    {selectedMenu.dishes.map((dish, index) => {
                      const checked = selectedDishIndices.has(index);
                      return (
                        <Pressable key={`${dish.course}-${index}`} onPress={() => toggleSelectedDish(index)}>
                          {({ pressed }) => (
                            <View style={[styles.checklistRow, pressed && styles.pressed]}>
                              <View
                                style={[
                                  styles.checkbox,
                                  { borderColor: checked ? theme.accent : theme.textSecondary },
                                  checked && { backgroundColor: theme.accent },
                                ]}
                              >
                                {checked && (
                                  <ThemedText type="smallBold" themeColor="background" style={styles.checkboxMark}>
                                    ✓
                                  </ThemedText>
                                )}
                              </View>
                              <ThemedText type="small">
                                {dish.course}：{dish.title}
                              </ThemedText>
                            </View>
                          )}
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </View>
            )}
          </ScrollView>
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
  // Unlike `content` (flex:1, shared with the 'analyzing' phase's full-bleed preview), this is a
  // ScrollView contentContainerStyle — flexGrow, not flex, so it hugs its own content instead of
  // stretching to fill the screen. That, plus introArea no longer being flex:1 below, is what keeps
  // the mascot/bubble/buttons pinned in place when the 献立から選ぶ picker opens and closes instead
  // of everything above it sliding to redistribute the leftover space.
  captureScrollContent: {
    flexGrow: 1,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  preview: {
    flex: 1,
    borderRadius: Spacing.three,
  },
  introArea: {
    marginTop: Spacing.three,
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
    justifyContent: 'space-between',
    // 'flex-end' (not 'center'): both button images have their card flush against the bottom edge
    // of their own PNG canvas (no bottom padding), so bottom-aligning the two boxes lines up the
    // actual card edges exactly — centering the boxes instead would offset them, since only the
    // gallery image carries extra transparent padding, and it's all on top (the tape decoration's
    // overhang), not evenly split top/bottom.
    alignItems: 'flex-end',
    gap: Spacing.two,
  },
  captureButtonRow: {
    // No negative marginTop here anymore — that was compensating for introArea's old flex:1
    // centering (which left extra empty space below the mascot). Now that introArea just takes its
    // natural size, the plain `gap` on captureScrollContent already sits close underneath it.
  },
  menuPickerToggleButtonPressable: {
    width: '100%',
    alignItems: 'center',
    marginTop: 0,
  },
  menuPickerSection: {
    marginTop: 0,
    gap: Spacing.two,
  },
  menuChipRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingHorizontal: Spacing.one,
  },
  menuChip: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.four,
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  checklist: {
    gap: Spacing.two,
    paddingHorizontal: Spacing.one,
  },
  checklistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
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
  pressed: {
    opacity: 0.7,
  },
});
