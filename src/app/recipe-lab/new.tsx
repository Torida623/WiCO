import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TagChips } from '@/components/chat/tag-chips';
import { QuickInsertProvider, QuickInsertTextInput } from '@/components/quick-insert-bar';
import { ScreenHeader } from '@/components/screen-header';
import { ServingsPicker, ServingsValue, servingsLabel } from '@/components/servings-picker';
import { SideMenu } from '@/components/side-menu';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  COURSE_OPTIONS,
  Course,
  FORMAT_TAG_OPTIONS,
  GENRE_TAG_OPTIONS,
  TASTE_TAG_OPTIONS,
  TEMPERATURE_TAG_OPTIONS,
} from '@/constants/meal-flow';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { fetchWithTimeout, getApiUrl } from '@/lib/api';
import { saveUserRecipe } from '@/lib/recipes';

const FORMAT_FETCH_TIMEOUT_MS = 30_000;

const LAB_BACKGROUND = require('@/assets/images/recipe-lab/lab-bg.jpg');
// Frame with an opaque cream margin and a transparent window, overlaid on top of a selected photo.
const PHOTO_FRAME = require('@/assets/images/recipe-lab/photo-frame.png');
// Same frame with the window also filled in cream, used as the placeholder background before a photo is picked.
const PHOTO_FRAME_EMPTY = require('@/assets/images/recipe-lab/photo-frame-empty.jpg');
const PHOTO_FRAME_ASPECT_RATIO = 1536 / 1024;
// Fraction of the frame canvas taken up by the border decorations on each side, measured directly from the
// source art (largest inscribed rectangle that stays clear of the border), then eased in ~5% so the photo
// runs a little past that safe rectangle — the frame's opaque cream margin still masks the excess.
const WINDOW_INSET_TOP = 0.0917;
const WINDOW_INSET_BOTTOM = 0.1209;
const WINDOW_INSET_LEFT = 0.056;
const WINDOW_INSET_RIGHT = 0.0397;

// Category color-coding for the search tags — light fill when unselected, solid fill when selected.
const GENRE_TAG_TINT = { light: '#F8E2DE', solid: '#C1584A' };
const FORMAT_TAG_TINT = { light: '#F6EDD1', solid: '#B08328' };
const TASTE_TAG_TINT = { light: '#E5EFDD', solid: '#5E8A42' };
const TEMPERATURE_TAG_TINT = { light: '#E1ECF5', solid: '#3F6E97' };

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: 'images',
  quality: 0.7,
  preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
};

type SeasoningMode = 'combined' | 'sequential';
type IngredientItem = { name: string; amount: string };
/** `text` backs combined-mode free entry; `items` backs sequential-mode one-by-one entry. Both persist across mode toggles so switching back doesn't lose input. */
type SeasoningGroup = { mode: SeasoningMode; text: string; items: IngredientItem[] };

function seasoningLabel(index: number): string {
  return String.fromCharCode(65 + index);
}

function formatIngredientsText(items: IngredientItem[]): string {
  return items.map((i) => `・${i.name} ${i.amount}`.trim()).join('\n');
}

function formatSequentialItemsText(items: IngredientItem[]): string {
  return items
    .filter((item) => item.name.trim())
    .map((item, idx) => `${idx + 1}. ${item.name.trim()}${item.amount.trim() ? `　${item.amount.trim()}` : ''}`)
    .join('\n');
}

function formatStepsText(steps: string[]): string {
  return steps.map((s, idx) => `${idx + 1}. ${s}`).join('\n');
}

function buildStepsText(steps: string[]): string {
  return formatStepsText(steps.map((s) => s.trim()).filter(Boolean));
}

function seasoningGroupText(group: SeasoningGroup): string {
  return group.mode === 'sequential' ? formatSequentialItemsText(group.items) : group.text.trim();
}

function buildIngredientsText(
  servings: ServingsValue,
  basicText: string,
  garnishText: string,
  seasoningGroups: SeasoningGroup[],
): string {
  const blocks: string[] = [servingsLabel(servings)];
  if (basicText.trim()) blocks.push(basicText.trim());
  if (garnishText.trim()) blocks.push(`〈添え物・飾り〉\n${garnishText.trim()}`);
  seasoningGroups.forEach((group, index) => {
    const bodyText = seasoningGroupText(group);
    if (!bodyText) return;
    const modeLabel = group.mode === 'combined' ? '合わせ調味料' : '順番に加える';
    blocks.push(`〈調味料${seasoningLabel(index)}・${modeLabel}〉\n${bodyText}`);
  });
  return blocks.join('\n\n');
}

export default function NewRecipeScreen() {
  const theme = useTheme();
  const [cameraPermission, requestCameraPermission] = ImagePicker.useCameraPermissions();
  const [libraryPermission, requestLibraryPermission] = ImagePicker.useMediaLibraryPermissions();

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [boxWidth, setBoxWidth] = useState(0);
  const boxHeight = boxWidth / PHOTO_FRAME_ASPECT_RATIO;
  const windowTop = boxHeight * WINDOW_INSET_TOP;
  const windowLeft = boxWidth * WINDOW_INSET_LEFT;
  const windowWidth = boxWidth * (1 - WINDOW_INSET_LEFT - WINDOW_INSET_RIGHT);
  const windowHeight = boxHeight * (1 - WINDOW_INSET_TOP - WINDOW_INSET_BOTTOM);
  const [title, setTitle] = useState('');
  const [servings, setServings] = useState<ServingsValue>('2');
  const [basicText, setBasicText] = useState('');
  const [garnishText, setGarnishText] = useState('');
  const [seasoningGroups, setSeasoningGroups] = useState<SeasoningGroup[]>([
    { mode: 'combined', text: '', items: [{ name: '', amount: '' }] },
  ]);
  const [steps, setSteps] = useState<string[]>(['']);
  const [course, setCourse] = useState<Course | undefined>(undefined);
  const [genreTag, setGenreTag] = useState<string | null>(null);
  const [formatTag, setFormatTag] = useState<string | null>(null);
  const [tasteTag, setTasteTag] = useState<string | null>(null);
  const [temperatureTag, setTemperatureTag] = useState<string | null>(null);
  const [publish, setPublish] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isFormatting, setIsFormatting] = useState(false);

  async function handleTakePhoto() {
    if (!cameraPermission?.granted) {
      const result = await requestCameraPermission();
      if (!result.granted) {
        Alert.alert('カメラを使えないよ', 'カメラの権限を許可してから試してね。');
        return;
      }
    }
    const result = await ImagePicker.launchCameraAsync(PICKER_OPTIONS);
    if (!result.canceled) setPhotoUri(result.assets[0].uri);
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
    if (!result.canceled) setPhotoUri(result.assets[0].uri);
  }

  function handlePhotoOptions() {
    Alert.alert(photoUri ? '写真を変更する' : '写真を選ぶ', undefined, [
      { text: '撮影する', onPress: handleTakePhoto },
      { text: 'ギャラリーから選ぶ', onPress: handlePickFromLibrary },
      { text: 'キャンセル', style: 'cancel' },
    ]);
  }

  function handleShowTagInfo() {
    Alert.alert('', 'タグを設定すると、タグ検索や献立の提案に使われます。\n同じ色のタグは1つまで選べます。');
  }

  function handleShowFormatInfo() {
    Alert.alert(
      '',
      'レシピ名と材料をもとに、ペロココが作り方の下書きをするよ。\n途中まで書いた作り方があれば、それを参考にするよ。',
    );
  }

  function addSeasoningGroup() {
    setSeasoningGroups((current) => [
      ...current,
      { mode: 'combined', text: '', items: [{ name: '', amount: '' }] },
    ]);
  }

  function removeSeasoningGroup(index: number) {
    setSeasoningGroups((current) => current.filter((_, i) => i !== index));
  }

  function updateSeasoningGroupMode(index: number, mode: SeasoningMode) {
    setSeasoningGroups((current) => current.map((group, i) => (i === index ? { ...group, mode } : group)));
  }

  function updateSeasoningGroupText(index: number, text: string) {
    setSeasoningGroups((current) => current.map((group, i) => (i === index ? { ...group, text } : group)));
  }

  function addSeasoningItem(groupIndex: number) {
    setSeasoningGroups((current) =>
      current.map((group, i) =>
        i === groupIndex ? { ...group, items: [...group.items, { name: '', amount: '' }] } : group,
      ),
    );
  }

  function removeSeasoningItem(groupIndex: number, itemIndex: number) {
    setSeasoningGroups((current) =>
      current.map((group, i) =>
        i === groupIndex ? { ...group, items: group.items.filter((_, j) => j !== itemIndex) } : group,
      ),
    );
  }

  function updateSeasoningItem(groupIndex: number, itemIndex: number, field: keyof IngredientItem, value: string) {
    setSeasoningGroups((current) =>
      current.map((group, i) =>
        i === groupIndex
          ? { ...group, items: group.items.map((item, j) => (j === itemIndex ? { ...item, [field]: value } : item)) }
          : group,
      ),
    );
  }

  function addStep() {
    setSteps((current) => [...current, '']);
  }

  function removeStep(index: number) {
    setSteps((current) => current.filter((_, i) => i !== index));
  }

  function updateStep(index: number, text: string) {
    setSteps((current) => current.map((step, i) => (i === index ? text : step)));
  }

  async function handleFormatWithAi() {
    if (!title.trim()) {
      Alert.alert('レシピ名を入力してね');
      return;
    }
    const hasAnyIngredients =
      basicText.trim() || garnishText.trim() || seasoningGroups.some((group) => seasoningGroupText(group));
    if (!hasAnyIngredients && !steps.some((s) => s.trim())) {
      Alert.alert('材料か作り方を少しでも書いてから試してね');
      return;
    }
    setIsFormatting(true);
    try {
      const seasoningGroupsForApi = seasoningGroups.map((group) => ({
        mode: group.mode,
        text: seasoningGroupText(group),
      }));
      const res = await fetchWithTimeout(
        getApiUrl('/api/recipe-format'),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            basicText,
            garnishText,
            seasoningGroups: seasoningGroupsForApi,
            stepsText: steps.filter((s) => s.trim()).join('\n'),
          }),
        },
        FORMAT_FETCH_TIMEOUT_MS,
      );
      const data = await res.json();
      if (!res.ok) throw new Error(typeof data.message === 'string' ? data.message : 'AIとの通信に失敗しました。');
      const basic: IngredientItem[] = data.basic ?? [];
      const garnish: IngredientItem[] = data.garnish ?? [];
      const formattedGroups: { items: IngredientItem[] }[] = data.seasoningGroups ?? [];
      const formattedSteps: string[] = data.steps ?? [];
      setBasicText(formatIngredientsText(basic));
      setGarnishText(garnish.length ? formatIngredientsText(garnish) : '');
      setSeasoningGroups((current) =>
        current.map((group, index) => {
          const formatted = formattedGroups[index];
          if (!formatted || !formatted.items.length) return group;
          return group.mode === 'sequential'
            ? { ...group, items: formatted.items }
            : { ...group, text: formatIngredientsText(formatted.items) };
        }),
      );
      if (formattedSteps.length) setSteps(formattedSteps);
    } catch (error) {
      console.error(error);
      Alert.alert('整形に失敗したよ', 'もう一度試してみてね。');
    } finally {
      setIsFormatting(false);
    }
  }

  async function handleSave() {
    if (!title.trim()) {
      Alert.alert('レシピ名を入力してね');
      return;
    }
    if (!course) {
      Alert.alert('料理の種類を選んでね');
      return;
    }
    setIsSaving(true);
    try {
      await saveUserRecipe({
        title,
        photoUri: photoUri ?? undefined,
        ingredientsText: buildIngredientsText(servings, basicText, garnishText, seasoningGroups),
        stepsText: buildStepsText(steps),
        publish,
        course,
        genreTag,
        formatTag,
        tasteTag,
        temperatureTag,
      });
      router.back();
    } catch (error) {
      console.error(error);
      Alert.alert('保存に失敗したよ', 'もう一度試してみてね。');
      setIsSaving(false);
    }
  }

  return (
    <View style={styles.container}>
      <Image source={LAB_BACKGROUND} style={styles.absoluteFill} contentFit="cover" />
      <View style={[styles.absoluteFill, { backgroundColor: theme.background, opacity: 0.3 }]} />
      <SideMenu />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ScreenHeader onBack={() => router.back()} />

        <KeyboardAvoidingView style={styles.flex} keyboardVerticalOffset={Spacing.six}>
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets>
            <Pressable onPress={handlePhotoOptions} style={styles.photoWrap}>
              <View
                style={[styles.photoBox, { width: '100%', height: boxHeight || undefined }]}
                onLayout={(e) => setBoxWidth(e.nativeEvent.layout.width)}>
                {boxWidth > 0 && (
                  <>
                    {photoUri ? (
                      <>
                        <Image
                          source={{ uri: photoUri }}
                          style={{
                            position: 'absolute',
                            top: windowTop,
                            left: windowLeft,
                            width: windowWidth,
                            height: windowHeight,
                          }}
                          contentFit="cover"
                        />
                        <Image
                          source={PHOTO_FRAME}
                          style={{ position: 'absolute', top: 0, left: 0, width: boxWidth, height: boxHeight }}
                          contentFit="fill"
                          pointerEvents="none"
                        />
                        <View style={styles.changePhotoBadge}>
                          <ThemedText type="small" themeColor="background">
                            写真を変更する
                          </ThemedText>
                        </View>
                      </>
                    ) : (
                      <>
                        <Image
                          source={PHOTO_FRAME_EMPTY}
                          style={{ width: boxWidth, height: boxHeight }}
                          contentFit="fill"
                        />
                        <View style={styles.photoPlaceholderTextWrap} pointerEvents="none">
                          <ThemedText type="small" themeColor="textSecondary">
                            タップして写真を選ぶ
                          </ThemedText>
                        </View>
                      </>
                    )}
                  </>
                )}
              </View>
            </Pressable>

            <View style={[styles.formCard, { backgroundColor: theme.background }]}>
              <View style={styles.section}>
                <ThemedText type="smallBold" style={styles.heading}>レシピ名</ThemedText>
                <TextInput
                  value={title}
                  onChangeText={setTitle}
                  placeholder="例）とろとろ卵のオムライス"
                  placeholderTextColor={theme.textSecondary}
                  style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text }]}
                />
              </View>

              <View style={styles.section}>
                <ThemedText type="smallBold" style={styles.heading}>料理の種類（必須）</ThemedText>
                <View style={styles.courseRow}>
                  {COURSE_OPTIONS.flatMap((option, index) => {
                    const selected = course === option.value;
                    const chip = (
                      <Pressable key={option.value} onPress={() => setCourse(selected ? undefined : option.value)}>
                        {({ pressed }) => (
                          <ThemedView
                            type={selected ? 'accent' : 'backgroundElement'}
                            style={[styles.courseChip, pressed && styles.pressed]}>
                            <ThemedText type="small" themeColor={selected ? 'background' : 'text'}>
                              {option.label}
                            </ThemedText>
                          </ThemedView>
                        )}
                      </Pressable>
                    );
                    return index === 1 ? [<View key="row-break" style={styles.rowBreak} />, chip] : [chip];
                  })}
                </View>
              </View>

              <View style={styles.section}>
                <View style={styles.headingRow}>
                  <ThemedText type="smallBold" style={styles.heading}>
                    料理の特徴（検索用タグ）
                  </ThemedText>
                  <Pressable onPress={handleShowTagInfo} hitSlop={8}>
                    {({ pressed }) => (
                      <View
                        style={[styles.infoButton, { borderColor: theme.textSecondary }, pressed && styles.pressed]}>
                        <ThemedText themeColor="textSecondary" style={styles.infoButtonText}>
                          ?
                        </ThemedText>
                      </View>
                    )}
                  </Pressable>
                </View>
                <TagChips
                  options={GENRE_TAG_OPTIONS}
                  selected={genreTag}
                  onSelect={setGenreTag}
                  tint={GENRE_TAG_TINT}
                />
                <TagChips
                  options={FORMAT_TAG_OPTIONS}
                  selected={formatTag}
                  onSelect={setFormatTag}
                  tint={FORMAT_TAG_TINT}
                />
                <TagChips
                  options={TASTE_TAG_OPTIONS.slice(0, 2)}
                  selected={tasteTag}
                  onSelect={setTasteTag}
                  tint={TASTE_TAG_TINT}
                />
                <TagChips
                  options={TASTE_TAG_OPTIONS.slice(2)}
                  selected={tasteTag}
                  onSelect={setTasteTag}
                  tint={TASTE_TAG_TINT}
                />
                <TagChips
                  options={TEMPERATURE_TAG_OPTIONS}
                  selected={temperatureTag}
                  onSelect={setTemperatureTag}
                  tint={TEMPERATURE_TAG_TINT}
                />
              </View>

            </View>

            <QuickInsertProvider>
            <View style={[styles.formCard, { backgroundColor: theme.background }]}>
              <View style={styles.section}>
                <View style={styles.ingredientsHeadingRow}>
                  <ThemedText type="smallBold" style={styles.heading}>基本の材料</ThemedText>
                  <ServingsPicker value={servings} onChange={setServings} />
                </View>
                <QuickInsertTextInput
                  kind="basic"
                  value={basicText}
                  onChangeText={setBasicText}
                  placeholder={'1行に1つずつ書いてね\n例）卵　2個'}
                  placeholderTextColor={theme.textSecondary}
                  style={[styles.textArea, { backgroundColor: theme.backgroundElement, color: theme.text }]}
                  multiline
                />
              </View>

              <View style={styles.section}>
                <ThemedText type="smallBold" style={styles.heading}>付け合わせ（任意）</ThemedText>
                <QuickInsertTextInput
                  kind="garnish"
                  value={garnishText}
                  onChangeText={setGarnishText}
                  placeholder={'1行に1つずつ書いてね\n例）パセリ　少々'}
                  placeholderTextColor={theme.textSecondary}
                  style={[
                    styles.textArea,
                    styles.textAreaShort,
                    { backgroundColor: theme.backgroundElement, color: theme.text },
                  ]}
                  multiline
                />
              </View>

              <View style={styles.section}>
                <ThemedText type="smallBold" style={styles.heading}>調味料</ThemedText>
                {seasoningGroups.map((group, index) => (
                  <View key={index} style={styles.seasoningGroup}>
                    <View style={styles.seasoningGroupHeader}>
                      <ThemedText type="smallBold" style={styles.heading}>{`調味料${seasoningLabel(index)}`}</ThemedText>
                      {seasoningGroups.length > 1 && (
                        <Pressable onPress={() => removeSeasoningGroup(index)} hitSlop={8}>
                          {({ pressed }) => (
                            <ThemedText type="small" themeColor="textSecondary" style={pressed && styles.pressed}>
                              削除
                            </ThemedText>
                          )}
                        </Pressable>
                      )}
                    </View>
                    <View style={styles.seasoningModeRow}>
                      {(['combined', 'sequential'] as const).map((mode) => {
                        const selected = group.mode === mode;
                        return (
                          <Pressable key={mode} onPress={() => updateSeasoningGroupMode(index, mode)}>
                            {({ pressed }) => (
                              <ThemedView
                                type={selected ? 'accent' : 'backgroundElement'}
                                style={[styles.courseChip, pressed && styles.pressed]}>
                                <ThemedText type="small" themeColor={selected ? 'background' : 'text'}>
                                  {mode === 'combined' ? '合わせ調味料' : '順番に加える'}
                                </ThemedText>
                              </ThemedView>
                            )}
                          </Pressable>
                        );
                      })}
                    </View>
                    {group.mode === 'sequential' ? (
                      <View style={styles.seasoningItemsWrap}>
                        {group.items.map((item, itemIndex) => (
                          <View key={itemIndex} style={styles.seasoningItemRow}>
                            <ThemedText
                              type="small"
                              themeColor="textSecondary"
                              numberOfLines={1}
                              style={styles.seasoningItemNumber}>
                              {`${itemIndex + 1}.`}
                            </ThemedText>
                            <QuickInsertTextInput
                              kind="seasoning"
                              value={item.name}
                              onChangeText={(text) => updateSeasoningItem(index, itemIndex, 'name', text)}
                              placeholder="調味料名"
                              placeholderTextColor={theme.textSecondary}
                              style={[
                                styles.input,
                                styles.seasoningItemName,
                                { backgroundColor: theme.backgroundElement, color: theme.text },
                              ]}
                            />
                            <QuickInsertTextInput
                              kind="seasoning"
                              value={item.amount}
                              onChangeText={(text) => updateSeasoningItem(index, itemIndex, 'amount', text)}
                              placeholder="分量"
                              placeholderTextColor={theme.textSecondary}
                              style={[
                                styles.input,
                                styles.seasoningItemAmount,
                                { backgroundColor: theme.backgroundElement, color: theme.text },
                              ]}
                            />
                            {group.items.length > 1 && (
                              <Pressable onPress={() => removeSeasoningItem(index, itemIndex)} hitSlop={8}>
                                {({ pressed }) => (
                                  <ThemedText
                                    type="small"
                                    themeColor="textSecondary"
                                    style={pressed && styles.pressed}>
                                    ×
                                  </ThemedText>
                                )}
                              </Pressable>
                            )}
                          </View>
                        ))}
                        <Pressable onPress={() => addSeasoningItem(index)} hitSlop={8}>
                          {({ pressed }) => (
                            <ThemedText
                              type="small"
                              themeColor="textSecondary"
                              style={[styles.seasoningAddIcon, pressed && styles.pressed]}>
                              ＋追加
                            </ThemedText>
                          )}
                        </Pressable>
                      </View>
                    ) : (
                      <QuickInsertTextInput
                        kind="seasoning"
                        value={group.text}
                        onChangeText={(text) => updateSeasoningGroupText(index, text)}
                        placeholder={'1行に1つずつ書いてね\n例）醤油　大さじ1'}
                        placeholderTextColor={theme.textSecondary}
                        style={[styles.textArea, { backgroundColor: theme.backgroundElement, color: theme.text }]}
                        multiline
                      />
                    )}
                  </View>
                ))}
                <Pressable onPress={addSeasoningGroup}>
                  {({ pressed }) => (
                    <ThemedView type="backgroundElement" style={[styles.addGroupButton, pressed && styles.pressed]}>
                      <ThemedText type="smallBold">＋調味料を追加</ThemedText>
                    </ThemedView>
                  )}
                </Pressable>
              </View>
            </View>
            </QuickInsertProvider>

            <View style={[styles.formCard, { backgroundColor: theme.background }]}>
              <View style={styles.section}>
                <ThemedText type="smallBold" style={styles.heading}>作り方</ThemedText>

                <View style={styles.formatButtonRow}>
                  <Pressable onPress={handleFormatWithAi} disabled={isFormatting}>
                    {({ pressed }) => (
                      <ThemedView
                        type="aiAccent"
                        style={[styles.formatButton, (pressed || isFormatting) && styles.pressed]}>
                        <ThemedText type="smallBold" themeColor="background">
                          {isFormatting ? '下書き中…' : 'ペロココと下書きする'}
                        </ThemedText>
                      </ThemedView>
                    )}
                  </Pressable>
                  <Pressable onPress={handleShowFormatInfo} hitSlop={8}>
                    {({ pressed }) => (
                      <View
                        style={[styles.infoButton, { borderColor: theme.textSecondary }, pressed && styles.pressed]}>
                        <ThemedText themeColor="textSecondary" style={styles.infoButtonText}>
                          ?
                        </ThemedText>
                      </View>
                    )}
                  </Pressable>
                </View>

                <View style={styles.seasoningItemsWrap}>
                  {steps.map((step, index) => (
                    <View key={index} style={styles.stepRow}>
                      <ThemedText
                        type="small"
                        themeColor="textSecondary"
                        numberOfLines={1}
                        style={styles.seasoningItemNumber}>
                        {`${index + 1}.`}
                      </ThemedText>
                      <TextInput
                        value={step}
                        onChangeText={(text) => updateStep(index, text)}
                        placeholder="手順を書いてね"
                        placeholderTextColor={theme.textSecondary}
                        style={[
                          styles.textArea,
                          styles.textAreaShort,
                          styles.stepInput,
                          { backgroundColor: theme.backgroundElement, color: theme.text },
                        ]}
                        multiline
                      />
                      {steps.length > 1 && (
                        <Pressable onPress={() => removeStep(index)} hitSlop={8}>
                          {({ pressed }) => (
                            <ThemedText type="small" themeColor="textSecondary" style={pressed && styles.pressed}>
                              ×
                            </ThemedText>
                          )}
                        </Pressable>
                      )}
                    </View>
                  ))}
                  <Pressable onPress={addStep} hitSlop={8}>
                    {({ pressed }) => (
                      <ThemedText
                        type="small"
                        themeColor="textSecondary"
                        style={[styles.seasoningAddIcon, pressed && styles.pressed]}>
                        ＋追加
                      </ThemedText>
                    )}
                  </Pressable>
                </View>
              </View>

              <View style={styles.publishRow}>
                <View style={styles.publishTextColumn}>
                  <ThemedText type="smallBold" style={styles.heading}>みんなのレシピに公開する</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    ONにすると、WiCOを使ってるみんなが見られるようになるよ
                  </ThemedText>
                </View>
                <Switch
                  value={publish}
                  onValueChange={setPublish}
                  trackColor={{ true: theme.accent }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <Pressable onPress={handleSave} disabled={isSaving}>
                {({ pressed }) => (
                  <ThemedView type="accent" style={[styles.saveButton, (pressed || isSaving) && styles.pressed]}>
                    <ThemedText type="smallBold" themeColor="background">
                      {isSaving ? '保存中…' : 'レシピ研究所に保存する'}
                    </ThemedText>
                  </ThemedView>
                )}
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
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
    padding: Spacing.three,
    gap: Spacing.three,
  },
  photoWrap: {
    marginHorizontal: -Spacing.three,
  },
  photoBox: {
    borderRadius: Spacing.four,
    overflow: 'hidden',
  },
  photoPlaceholderTextWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  changePhotoBadge: {
    position: 'absolute',
    right: '8%',
    bottom: '11%',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.two,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  formCard: {
    borderRadius: Spacing.four,
    padding: Spacing.three,
    gap: Spacing.three,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  section: {
    gap: Spacing.two,
  },
  heading: {
    fontSize: 15,
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  ingredientsHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  infoButton: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoButtonText: {
    fontSize: 13,
    lineHeight: 15,
    fontWeight: '700',
  },
  courseRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  rowBreak: {
    flexBasis: '100%',
    height: 0,
  },
  courseChip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.four,
  },
  seasoningGroup: {
    gap: Spacing.two,
    marginBottom: Spacing.two,
  },
  seasoningGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  seasoningModeRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  addGroupButton: {
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
    alignItems: 'center',
  },
  seasoningItemsWrap: {
    gap: Spacing.two,
  },
  seasoningItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  seasoningItemNumber: {
    minWidth: 22,
    flexShrink: 0,
  },
  seasoningItemName: {
    flex: 2,
  },
  seasoningItemAmount: {
    flex: 1,
  },
  seasoningAddIcon: {
    marginLeft: 16 + Spacing.one,
    paddingVertical: Spacing.half,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.one,
  },
  stepInput: {
    flex: 1,
  },
  formatButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
  },
  formatButton: {
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
    alignItems: 'center',
  },
  publishRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.one,
  },
  publishTextColumn: {
    flex: 1,
    gap: Spacing.half,
  },
  input: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
  },
  textArea: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  textAreaShort: {
    minHeight: 56,
  },
  saveButton: {
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    alignItems: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
