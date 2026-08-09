import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/screen-header';
import { SideMenu } from '@/components/side-menu';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { COURSE_OPTIONS, Course } from '@/constants/meal-flow';
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

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: 'images',
  quality: 0.7,
  preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
};

type SeasoningMode = 'combined' | 'sequential';
type SeasoningGroup = { mode: SeasoningMode; text: string };
type IngredientItem = { name: string; amount: string };

function seasoningLabel(index: number): string {
  return String.fromCharCode(65 + index);
}

function formatIngredientsText(items: IngredientItem[]): string {
  return items.map((i) => `・${i.name} ${i.amount}`.trim()).join('\n');
}

function formatStepsText(steps: string[]): string {
  return steps.map((s, idx) => `${idx + 1}. ${s}`).join('\n');
}

function buildIngredientsText(basicText: string, garnishText: string, seasoningGroups: SeasoningGroup[]): string {
  const blocks: string[] = [];
  if (basicText.trim()) blocks.push(basicText.trim());
  if (garnishText.trim()) blocks.push(`〈添え物・飾り〉\n${garnishText.trim()}`);
  seasoningGroups.forEach((group, index) => {
    if (!group.text.trim()) return;
    const modeLabel = group.mode === 'combined' ? '合わせ調味料' : '順番に加える';
    blocks.push(`〈調味料${seasoningLabel(index)}・${modeLabel}〉\n${group.text.trim()}`);
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
  const [basicText, setBasicText] = useState('');
  const [garnishText, setGarnishText] = useState('');
  const [seasoningGroups, setSeasoningGroups] = useState<SeasoningGroup[]>([{ mode: 'combined', text: '' }]);
  const [stepsText, setStepsText] = useState('');
  const [course, setCourse] = useState<Course | undefined>(undefined);
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

  function addSeasoningGroup() {
    setSeasoningGroups((current) => [...current, { mode: 'combined', text: '' }]);
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

  async function handleFormatWithAi() {
    if (!title.trim()) {
      Alert.alert('レシピ名を入力してね');
      return;
    }
    const hasAnyIngredients =
      basicText.trim() || garnishText.trim() || seasoningGroups.some((group) => group.text.trim());
    if (!hasAnyIngredients && !stepsText.trim()) {
      Alert.alert('材料か作り方を少しでも書いてから試してね');
      return;
    }
    setIsFormatting(true);
    try {
      const res = await fetchWithTimeout(
        getApiUrl('/api/recipe-format'),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, basicText, garnishText, seasoningGroups, stepsText }),
        },
        FORMAT_FETCH_TIMEOUT_MS,
      );
      const data = await res.json();
      if (!res.ok) throw new Error(typeof data.message === 'string' ? data.message : 'AIとの通信に失敗しました。');
      const basic: IngredientItem[] = data.basic ?? [];
      const garnish: IngredientItem[] = data.garnish ?? [];
      const formattedGroups: { items: IngredientItem[] }[] = data.seasoningGroups ?? [];
      const steps: string[] = data.steps ?? [];
      setBasicText(formatIngredientsText(basic));
      setGarnishText(garnish.length ? formatIngredientsText(garnish) : '');
      setSeasoningGroups((current) =>
        current.map((group, index) => ({
          mode: group.mode,
          text: formattedGroups[index] ? formatIngredientsText(formattedGroups[index].items) : group.text,
        })),
      );
      setStepsText(formatStepsText(steps));
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
    setIsSaving(true);
    try {
      await saveUserRecipe({
        title,
        photoUri: photoUri ?? undefined,
        ingredientsText: buildIngredientsText(basicText, garnishText, seasoningGroups),
        stepsText,
        publish,
        course,
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
        <ScreenHeader title="レシピを投稿する" onBack={() => router.back()} />

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Spacing.six}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <Pressable onPress={handlePhotoOptions} style={styles.photoWrap}>
              <View
                style={{ width: '100%', height: boxHeight || undefined }}
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

            <View style={styles.section}>
              <ThemedText type="smallBold">レシピ名</ThemedText>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="例）とろとろ卵のオムライス"
                placeholderTextColor={theme.textSecondary}
                style={[styles.input, { backgroundColor: `${theme.backgroundElement}B3`, color: theme.text }]}
              />
            </View>

            <View style={styles.section}>
              <ThemedText type="smallBold">料理の種類（任意）</ThemedText>
              <View style={styles.courseRow}>
                {COURSE_OPTIONS.map((option) => {
                  const selected = course === option.value;
                  return (
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
                })}
              </View>
            </View>

            <View style={styles.section}>
              <ThemedText type="smallBold">基本の材料</ThemedText>
              <TextInput
                value={basicText}
                onChangeText={setBasicText}
                placeholder={'1行に1つずつ書いてね\n例）卵　2個'}
                placeholderTextColor={theme.textSecondary}
                style={[styles.textArea, { backgroundColor: `${theme.backgroundElement}B3`, color: theme.text }]}
                multiline
              />
            </View>

            <View style={styles.section}>
              <ThemedText type="smallBold">添え物や飾りの食材（任意）</ThemedText>
              <TextInput
                value={garnishText}
                onChangeText={setGarnishText}
                placeholder={'1行に1つずつ書いてね\n例）パセリ　少々'}
                placeholderTextColor={theme.textSecondary}
                style={[styles.textArea, { backgroundColor: `${theme.backgroundElement}B3`, color: theme.text }]}
                multiline
              />
            </View>

            <View style={styles.section}>
              <ThemedText type="smallBold">調味料</ThemedText>
              {seasoningGroups.map((group, index) => (
                <View key={index} style={styles.seasoningGroup}>
                  <View style={styles.seasoningGroupHeader}>
                    <ThemedText type="smallBold">{`調味料${seasoningLabel(index)}`}</ThemedText>
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
                  <TextInput
                    value={group.text}
                    onChangeText={(text) => updateSeasoningGroupText(index, text)}
                    placeholder={'1行に1つずつ書いてね\n例）醤油　大さじ1'}
                    placeholderTextColor={theme.textSecondary}
                    style={[styles.textArea, { backgroundColor: `${theme.backgroundElement}B3`, color: theme.text }]}
                    multiline
                  />
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

            <View style={styles.section}>
              <ThemedText type="smallBold">作り方</ThemedText>
              <TextInput
                value={stepsText}
                onChangeText={setStepsText}
                placeholder="手順を書いてね"
                placeholderTextColor={theme.textSecondary}
                style={[styles.textArea, { backgroundColor: `${theme.backgroundElement}B3`, color: theme.text }]}
                multiline
              />
            </View>

            <Pressable onPress={handleFormatWithAi} disabled={isFormatting}>
              {({ pressed }) => (
                <ThemedView
                  type="backgroundElement"
                  style={[styles.formatButton, (pressed || isFormatting) && styles.pressed]}>
                  <ThemedText type="smallBold">{isFormatting ? '整えてるよ…' : 'AIにきれいに書いてもらう'}</ThemedText>
                </ThemedView>
              )}
            </Pressable>

            <View style={styles.publishRow}>
              <View style={styles.publishTextColumn}>
                <ThemedText type="smallBold">みんなのレシピに公開する</ThemedText>
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
  section: {
    gap: Spacing.two,
  },
  courseRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
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
  formatButton: {
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
  saveButton: {
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    alignItems: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
