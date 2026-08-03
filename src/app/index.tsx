import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  TextInput,
  View,
  ViewStyle,
} from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChatBubble } from '@/components/chat/chat-bubble';
import { ChoiceButtons } from '@/components/chat/choice-buttons';
import { MascotAvatar, MascotPose } from '@/components/chat/mascot-avatar';
import { MoodTray } from '@/components/chat/mood-tray';
import { RecipeBook } from '@/components/chat/recipe-book';
import { SideMenu } from '@/components/side-menu';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  Answers,
  COOKING_TIME_OPTIONS,
  ENTRY_POINT_OPTIONS,
  EntryPoint,
  FORMAT_TAG_OPTIONS,
  GENRE_TAG_OPTIONS,
  SHOPPING_OPTIONS,
  StepId,
  TASTE_TAG_OPTIONS,
  TEMPERATURE_TAG_OPTIONS,
  getNextStep,
} from '@/constants/meal-flow';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { isDaytime } from '@/constants/time-of-day';
import { useTheme } from '@/hooks/use-theme';
import { fetchWithTimeout, getApiUrl } from '@/lib/api';

const ROOM_BACKGROUND = require('@/assets/images/perokoko-room-bg.jpg');
const ROOM_BACKGROUND_NO_BOOK = require('@/assets/images/perokoko-room-bg-nobook.jpg');
const ROOM_BACKGROUND_NIGHT = require('@/assets/images/perokoko-room-bg-night.jpg');
const ROOM_BACKGROUND_NIGHT_NO_BOOK = require('@/assets/images/perokoko-room-bg-night-nobook.jpg');

const OK_BUTTON_IMAGE = require('@/assets/images/ui/ok-button.png');
const MENU_DECIDED_PLATE_IMAGE = require('@/assets/images/ui/menu-decided-plate.png');
const OK_BUTTON_SIZE = 72;

const MENU_FETCH_TIMEOUT_MS = 30_000;

async function fetchMenuMessage(mode: 'proposal' | 'final', answers: Answers, proposalText?: string) {
  const res = await fetchWithTimeout(
    getApiUrl('/api/menu'),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode, answers, proposalText }),
    },
    MENU_FETCH_TIMEOUT_MS,
  );
  const data = await res.json();
  if (!res.ok) {
    throw new Error(typeof data.message === 'string' ? data.message : 'AIとの通信に失敗しました。');
  }
  return data.message as string;
}

function extractBookContent(text: string): string {
  const splitIndex = text.indexOf('【材料】');
  return splitIndex >= 0 ? text.slice(splitIndex) : text;
}

type Message =
  | {
      id: string;
      kind: 'text';
      sender: 'ai' | 'user';
      text: string;
      mascotPose?: MascotPose;
    }
  | { id: string; kind: 'book'; sender: 'ai'; bookContent: string }
  | { id: string; kind: 'plate' };

const MEAL_REACTION: Record<EntryPoint, string> = {
  breakfast: 'もちろん！朝ごはんだね！',
  lunch: 'もちろん！お昼ごはんだね！',
  dinner: 'もちろん！晩ごはんだね！',
  aiRecommend: 'まかせて！素敵な献立を一緒に考えよう！',
  fridge: 'いいね！冷蔵庫にある食材から考えよう！',
};

function getStepMessage(step: Exclude<StepId, 'proposal' | 'final'>, answers: Answers): string {
  switch (step) {
    case 'entryPoint':
      return 'やあ！\n今日はどんなごはんにする？';
    case 'people':
      return `${MEAL_REACTION[answers.entryPoint!]}\n今日は何人で食べるの？`;
    case 'cookingTime':
      return `${answers.people}人分だね！どれくらい時間をかけられそう？`;
    case 'moodAndAllergy':
      if (answers.cookingTime) {
        const timeLabel = answers.cookingTime === 'relaxed' ? '時間をかけて' : 'ぱぱっと';
        return `${timeLabel}作るんだね！どんなものが食べたいかな？アレルギーや苦手な食材があったら教えてね！`;
      }
      return `${answers.people}人で食べるんだ！OKだよ！\n何か食べたいものはある？\nアレルギーや苦手な食材があったら、それも教えてね！`;
    case 'ingredients':
      if (answers.entryPoint === 'breakfast') return '朝ごはんに使ってもいい食材を教えてほしいな！';
      return 'OK！家にある食材や早めに使いたいものがあれば教えてほしいな！';
    case 'shopping':
      return 'OK！今日は買い物に行けそう？';
  }
}

const INITIAL_MESSAGE: Message = {
  id: '1',
  kind: 'text',
  sender: 'ai',
  text: getStepMessage('entryPoint', {}),
};

export default function MealChatScreen() {
  const theme = useTheme();

  const [currentMessage, setCurrentMessage] = useState<Message>(INITIAL_MESSAGE);
  const [mascotPose, setMascotPose] = useState<MascotPose>('neutral');
  const [step, setStep] = useState<StepId>('entryPoint');
  const [answers, setAnswers] = useState<Answers>({});
  const [isTyping, setIsTyping] = useState(false);

  const [textValue, setTextValue] = useState('');
  const [freeMoodValue, setFreeMoodValue] = useState('');
  const [genreTag, setGenreTag] = useState<string | null>(null);
  const [formatTag, setFormatTag] = useState<string | null>(null);
  const [tasteTag, setTasteTag] = useState<string | null>(null);
  const [temperatureTag, setTemperatureTag] = useState<string | null>(null);
  const [allergyValue, setAllergyValue] = useState('');
  const [showRevisionInput, setShowRevisionInput] = useState(false);
  const [showMoodTray, setShowMoodTray] = useState(false);
  const [showingRecipeDetail, setShowingRecipeDetail] = useState(false);
  const lastProposalRef = useRef('');
  const finalDetailsRef = useRef<{ proposal: string; content: string } | null>(null);
  const messageIdRef = useRef(1);
  const mascotOpacity = useSharedValue(1);
  const daytime = useRef(isDaytime()).current;

  const roomBackground = daytime
    ? currentMessage.kind === 'book'
      ? ROOM_BACKGROUND_NO_BOOK
      : ROOM_BACKGROUND
    : currentMessage.kind === 'book'
      ? ROOM_BACKGROUND_NIGHT_NO_BOOK
      : ROOM_BACKGROUND_NIGHT;

  useEffect(() => {
    const hideMascot = currentMessage.kind === 'book' || currentMessage.kind === 'plate';
    mascotOpacity.value = withTiming(hideMascot ? 0 : 1, { duration: 450 });
  }, [currentMessage.kind, mascotOpacity]);

  const mascotStyle = useAnimatedStyle(() => ({ opacity: mascotOpacity.value }));

  function nextMessageId() {
    messageIdRef.current += 1;
    return String(messageIdRef.current);
  }

  function showMessage(sender: 'ai' | 'user', text: string, pose: MascotPose = 'neutral') {
    setCurrentMessage({ id: nextMessageId(), kind: 'text', sender, text });
    if (sender === 'ai') setMascotPose(pose);
  }

  function showBookMessage(bookContent: string) {
    setCurrentMessage({ id: nextMessageId(), kind: 'book', sender: 'ai', bookContent });
  }

  function showPlateMessage() {
    setCurrentMessage({ id: nextMessageId(), kind: 'plate' });
  }

  async function getFinalDetails(currentAnswers: Answers): Promise<string> {
    if (finalDetailsRef.current && finalDetailsRef.current.proposal === lastProposalRef.current) {
      return finalDetailsRef.current.content;
    }
    const text = await fetchMenuMessage('final', currentAnswers, lastProposalRef.current);
    finalDetailsRef.current = { proposal: lastProposalRef.current, content: text };
    return text;
  }

  async function handlePreviewRecipe() {
    setIsTyping(true);
    try {
      const text = await getFinalDetails(answers);
      showMessage('ai', extractBookContent(text));
      setShowingRecipeDetail(true);
    } catch (error) {
      console.error(error);
    } finally {
      setIsTyping(false);
    }
  }

  function handleBackToProposal() {
    showMessage('ai', lastProposalRef.current);
    setShowingRecipeDetail(false);
  }

  async function advance(newAnswers: Answers, userDisplayText: string) {
    showMessage('user', userDisplayText);
    const previousStep = step;
    const next = getNextStep(step, newAnswers);
    setAnswers(newAnswers);
    setStep(next);
    setIsTyping(true);

    try {
      if (next === 'proposal') {
        const isRevision = Boolean(newAnswers.revisionRequest?.trim());
        const text = await fetchMenuMessage(
          'proposal',
          newAnswers,
          isRevision ? lastProposalRef.current : undefined,
        );
        lastProposalRef.current = text;
        showMessage('ai', text);
        setShowRevisionInput(false);
        setShowingRecipeDetail(false);
        return;
      }

      if (next === 'final') {
        setMascotPose('thinking');
        const text = await getFinalDetails(newAnswers);
        const bookContent = extractBookContent(text);
        setMascotPose('idea');
        await new Promise((resolve) => setTimeout(resolve, 1500));
        showPlateMessage();
        setTimeout(() => showBookMessage(bookContent), 1400);
        return;
      }

      const delay = 600 + Math.random() * 500;
      await new Promise((resolve) => setTimeout(resolve, delay));
      showMessage('ai', getStepMessage(next, newAnswers));
    } catch (error) {
      console.error(error);
      setMascotPose('neutral');
      setStep(previousStep);
      showMessage('ai', 'あれ、うまく繋がらなかったみたい…！もう一度試してみてくれる？');
    } finally {
      setIsTyping(false);
    }
  }

  function handleChoice(key: keyof Answers, value: string, label: string) {
    advance({ ...answers, [key]: value } as Answers, label);
  }

  function handlePeopleSubmit() {
    const value = textValue.trim();
    if (!value) return;
    advance({ ...answers, people: value }, `${value}人分`);
    setTextValue('');
  }

  function handleIngredientsSubmit() {
    const value = textValue.trim();
    if (answers.entryPoint === 'breakfast' && !value) return;
    advance({ ...answers, ingredients: value }, value || '（特になし）');
    setTextValue('');
  }

  function handleMoodAllergySubmit() {
    const mood = [genreTag, formatTag, tasteTag, temperatureTag, freeMoodValue.trim()]
      .filter((part): part is string => Boolean(part))
      .join('・');
    const allergy = allergyValue.trim();
    const parts: string[] = [];
    if (mood) parts.push(`気分: ${mood}`);
    if (allergy) parts.push(`アレルギー・苦手: ${allergy}`);
    advance({ ...answers, mood, allergy }, parts.length ? parts.join(' / ') : '（特になし）');
    setGenreTag(null);
    setFormatTag(null);
    setTasteTag(null);
    setTemperatureTag(null);
    setFreeMoodValue('');
    setAllergyValue('');
    setShowMoodTray(false);
  }

  function handleRevisionSubmit() {
    const value = textValue.trim();
    if (!value) return;
    advance({ ...answers, revisionRequest: value }, value);
    setTextValue('');
  }

  function handleConfirmMenu() {
    advance({ ...answers, revisionRequest: '' }, 'この献立に決定します');
    setTextValue('');
  }

  function handleRestart() {
    setCurrentMessage(INITIAL_MESSAGE);
    setMascotPose('neutral');
    setStep('entryPoint');
    setAnswers({});
    setTextValue('');
    setGenreTag(null);
    setFormatTag(null);
    setTasteTag(null);
    setTemperatureTag(null);
    setFreeMoodValue('');
    setAllergyValue('');
    setShowRevisionInput(false);
    setShowMoodTray(false);
    setShowingRecipeDetail(false);
    lastProposalRef.current = '';
    finalDetailsRef.current = null;
  }

  return (
    <View style={styles.flex}>
      <Image
        source={roomBackground}
        style={StyleSheet.absoluteFillObject}
        contentFit="cover"
        transition={450}
      />
      <Animated.View style={[styles.mascotWrapper, mascotStyle]} pointerEvents="none">
        <MascotAvatar pose={mascotPose} style={styles.roomMascot} />
      </Animated.View>

      <SideMenu />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Spacing.six}>
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
          <View style={styles.messageArea}>
            {isTyping && step === 'final' ? null : isTyping ? (
              <ScrollView contentContainerStyle={styles.messageScrollContent} showsVerticalScrollIndicator={false}>
                <ChatBubble sender="ai" text="…" variant="blob" />
              </ScrollView>
            ) : currentMessage.kind === 'plate' ? (
              <View style={styles.plateContent}>
                <Image source={MENU_DECIDED_PLATE_IMAGE} style={styles.plateImage} contentFit="contain" />
              </View>
            ) : currentMessage.kind === 'book' ? (
              <View style={styles.messageContent}>
                <RecipeBook content={currentMessage.bookContent} onRestart={handleRestart} />
              </View>
            ) : (
              <ScrollView contentContainerStyle={styles.messageScrollContent} showsVerticalScrollIndicator={false}>
                <ChatBubble sender={currentMessage.sender} text={currentMessage.text} style={styles.dialogueOffset} />
              </ScrollView>
            )}
          </View>

          {currentMessage.kind !== 'plate' && (
          <View
            style={[styles.inputArea, isTyping && styles.inputAreaDisabled]}
            pointerEvents={isTyping ? 'none' : 'auto'}>
            {step === 'entryPoint' && (
              <ChoiceButtons
                options={ENTRY_POINT_OPTIONS}
                onSelect={(value) => {
                  const label = ENTRY_POINT_OPTIONS.find((o) => o.value === value)!.label;
                  handleChoice('entryPoint', value, label);
                }}
              />
            )}

            {step === 'cookingTime' && (
              <ChoiceButtons
                options={COOKING_TIME_OPTIONS}
                onSelect={(value) => {
                  const label = COOKING_TIME_OPTIONS.find((o) => o.value === value)!.label;
                  handleChoice('cookingTime', value, label);
                }}
              />
            )}

            {step === 'shopping' && (
              <ChoiceButtons
                options={SHOPPING_OPTIONS}
                onSelect={(value) => {
                  const label = SHOPPING_OPTIONS.find((o) => o.value === value)!.label;
                  handleChoice('shopping', value, label);
                }}
              />
            )}

            {step === 'people' && (
              <View style={styles.peopleRow}>
                <TextRow
                  value={textValue}
                  onChangeText={setTextValue}
                  onSubmit={handlePeopleSubmit}
                  placeholder="人数を教えてね！"
                  keyboardType="number-pad"
                  centered
                  stacked
                />
              </View>
            )}

            {step === 'ingredients' && (
              <TextRow
                value={textValue}
                onChangeText={setTextValue}
                onSubmit={handleIngredientsSubmit}
                placeholder="例: 鶏胸肉、キャベツ（任意）"
              />
            )}

            {step === 'moodAndAllergy' && (
              <View style={styles.dualTextContainer}>
                {!showMoodTray && (
                  <>
                    <Pressable onPress={() => setShowMoodTray((current) => !current)}>
                      {({ pressed }) => (
                        <ThemedView
                          type="backgroundElement"
                          style={[styles.textInputWrapper, pressed && styles.pressed]}>
                          <ThemedText
                            style={[styles.textInput, styles.textInputCentered]}
                            themeColor={
                              genreTag || formatTag || tasteTag || temperatureTag || freeMoodValue
                                ? 'text'
                                : 'textSecondary'
                            }>
                            {[genreTag, formatTag, tasteTag, temperatureTag, freeMoodValue.trim()]
                              .filter(Boolean)
                              .join('・') || '今日の気分'}
                          </ThemedText>
                        </ThemedView>
                      )}
                    </Pressable>
                    <ThemedView type="backgroundElement" style={styles.textInputWrapper}>
                      <TextInput
                        value={allergyValue}
                        onChangeText={setAllergyValue}
                        placeholder="アレルギー・苦手な食材"
                        placeholderTextColor={theme.textSecondary}
                        style={[styles.textInput, styles.textInputCentered, { color: theme.text }]}
                      />
                    </ThemedView>
                  </>
                )}
                <SendButton
                  onPress={showMoodTray ? () => setShowMoodTray(false) : handleMoodAllergySubmit}
                  style={styles.moodSendButton}
                />
              </View>
            )}

            {step === 'proposal' &&
              (showRevisionInput ? (
                <TextRow
                  value={textValue}
                  onChangeText={setTextValue}
                  onSubmit={handleRevisionSubmit}
                  placeholder="変更したい点を教えてね"
                />
              ) : (
                <View style={styles.proposalButtonsColumn}>
                  <Pressable onPress={showingRecipeDetail ? handleBackToProposal : handlePreviewRecipe}>
                    {({ pressed }) => (
                      <ThemedView
                        type="backgroundElement"
                        style={[styles.proposalButton, pressed && styles.pressed]}>
                        <ThemedText type="smallBold" themeColor="text">
                          {showingRecipeDetail ? '戻る' : '詳しい材料とレシピを見てみる'}
                        </ThemedText>
                      </ThemedView>
                    )}
                  </Pressable>
                  <View style={styles.proposalButtonRow}>
                    <Pressable style={styles.flex} onPress={() => setShowRevisionInput(true)}>
                      {({ pressed }) => (
                        <ThemedView
                          type="backgroundElement"
                          style={[styles.proposalButton, pressed && styles.pressed]}>
                          <ThemedText type="smallBold" themeColor="text">
                            変更したい
                          </ThemedText>
                        </ThemedView>
                      )}
                    </Pressable>
                    <Pressable style={styles.flex} onPress={handleConfirmMenu}>
                      {({ pressed }) => (
                        <ThemedView type="accent" style={[styles.proposalButton, pressed && styles.pressed]}>
                          <ThemedText type="smallBold" themeColor="background">
                            この献立にする
                          </ThemedText>
                        </ThemedView>
                      )}
                    </Pressable>
                  </View>
                </View>
              ))}
          </View>
          )}
        </SafeAreaView>
      </KeyboardAvoidingView>

      {step === 'moodAndAllergy' && showMoodTray && (
        <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setShowMoodTray(false)} />
      )}
      {step === 'moodAndAllergy' && (
        <MoodTray
          visible={showMoodTray}
          genreOptions={GENRE_TAG_OPTIONS}
          formatOptions={FORMAT_TAG_OPTIONS}
          tasteOptions={TASTE_TAG_OPTIONS}
          temperatureOptions={TEMPERATURE_TAG_OPTIONS}
          selectedGenre={genreTag}
          selectedFormat={formatTag}
          selectedTaste={tasteTag}
          selectedTemperature={temperatureTag}
          onSelectGenre={setGenreTag}
          onSelectFormat={setFormatTag}
          onSelectTaste={setTasteTag}
          onSelectTemperature={setTemperatureTag}
          freeText={freeMoodValue}
          onChangeFreeText={setFreeMoodValue}
        />
      )}

    </View>
  );
}

function TextRow({
  value,
  onChangeText,
  onSubmit,
  placeholder,
  keyboardType,
  centered,
  stacked,
}: {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
  placeholder: string;
  keyboardType?: 'default' | 'number-pad';
  centered?: boolean;
  stacked?: boolean;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.textRow, stacked && styles.textRowStacked]}>
      <ThemedView
        type="backgroundElement"
        style={[styles.textInputWrapper, stacked ? styles.textInputWrapperStacked : styles.flex]}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.textSecondary}
          keyboardType={keyboardType}
          style={[styles.textInput, { color: theme.text }, centered && styles.textInputCentered]}
          onSubmitEditing={onSubmit}
        />
      </ThemedView>
      <SendButton onPress={onSubmit} />
    </View>
  );
}

function SendButton({ onPress, style }: { onPress: () => void; style?: StyleProp<ViewStyle> }) {
  return (
    <Pressable onPress={onPress} style={style}>
      {({ pressed }) => (
        <Image
          source={OK_BUTTON_IMAGE}
          style={[styles.sendButton, pressed && styles.pressed]}
          contentFit="contain"
        />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  messageArea: {
    flex: 1,
  },
  messageContent: {
    flex: 1,
    padding: Spacing.three,
  },
  messageScrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-start',
    paddingTop: '18%',
    padding: Spacing.three,
  },
  dialogueOffset: {
    marginTop: Spacing.four,
  },
  plateContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.two,
  },
  plateImage: {
    width: '100%',
    height: '100%',
  },
  mascotWrapper: {
    ...StyleSheet.absoluteFillObject,
  },
  roomMascot: {
    position: 'absolute',
    top: '43%',
    left: '21%',
    width: '58%',
    height: undefined,
    aspectRatio: 1,
  },
  inputArea: {
    padding: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.two,
  },
  inputAreaDisabled: {
    opacity: 0.4,
  },
  peopleRow: {
    marginTop: -Spacing.four,
  },
  textRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    alignItems: 'center',
  },
  textRowStacked: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  dualTextContainer: {
    gap: Spacing.two,
  },
  textInputWrapper: {
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  textInputWrapperStacked: {
    alignSelf: 'stretch',
  },
  textInput: {
    fontSize: 16,
  },
  textInputCentered: {
    textAlign: 'center',
  },
  sendButton: {
    width: OK_BUTTON_SIZE,
    height: OK_BUTTON_SIZE,
  },
  moodSendButton: {
    alignSelf: 'center',
  },
  proposalButtonsColumn: {
    gap: Spacing.two,
  },
  proposalButtonRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  proposalButton: {
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.four,
  },
  pressed: {
    opacity: 0.7,
  },
});
