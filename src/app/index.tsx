import Constants from 'expo-constants';
import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChatBubble } from '@/components/chat/chat-bubble';
import { ChoiceButtons } from '@/components/chat/choice-buttons';
import { MascotAvatar, MascotPose } from '@/components/chat/mascot-avatar';
import { RecipeBook } from '@/components/chat/recipe-book';
import { TagChips } from '@/components/chat/tag-chips';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  Answers,
  COOKING_TIME_OPTIONS,
  ENTRY_POINT_OPTIONS,
  EntryPoint,
  GENRE_TAG_OPTIONS,
  SHOPPING_OPTIONS,
  StepId,
  TASTE_TAG_OPTIONS,
  getNextStep,
} from '@/constants/meal-flow';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { isDaytime } from '@/constants/time-of-day';
import { useTheme } from '@/hooks/use-theme';

const ROOM_BACKGROUND = require('@/assets/images/perokoko-room-bg.jpg');
const ROOM_BACKGROUND_NO_BOOK = require('@/assets/images/perokoko-room-bg-nobook.jpg');
const ROOM_BACKGROUND_NIGHT = require('@/assets/images/perokoko-room-bg-night.jpg');
const ROOM_BACKGROUND_NIGHT_NO_BOOK = require('@/assets/images/perokoko-room-bg-night-nobook.jpg');

function getApiUrl(path: string): string {
  const hostUri = Constants.expoConfig?.hostUri;
  return hostUri ? `http://${hostUri}${path}` : path;
}

async function fetchMenuMessage(mode: 'proposal' | 'final', answers: Answers, proposalText?: string) {
  const res = await fetch(getApiUrl('/api/menu'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode, answers, proposalText }),
  });
  const data = await res.json();
  return data.message as string;
}

type Message =
  | {
      id: string;
      kind: 'text';
      sender: 'ai' | 'user';
      text: string;
      mascotPose?: MascotPose;
    }
  | { id: string; kind: 'book'; sender: 'ai'; bookContent: string };

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
  const [moodValue, setMoodValue] = useState('');
  const [genreTag, setGenreTag] = useState<string | null>(null);
  const [tasteTag, setTasteTag] = useState<string | null>(null);
  const [allergyValue, setAllergyValue] = useState('');
  const [showRevisionInput, setShowRevisionInput] = useState(false);
  const lastProposalRef = useRef('');
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
    mascotOpacity.value = withTiming(currentMessage.kind === 'book' ? 0 : 1, { duration: 450 });
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

  async function advance(newAnswers: Answers, userDisplayText: string) {
    showMessage('user', userDisplayText);
    const next = getNextStep(step, newAnswers);
    setAnswers(newAnswers);
    setStep(next);
    setIsTyping(true);

    if (next === 'proposal') {
      const isRevision = Boolean(newAnswers.revisionRequest?.trim());
      const text = await fetchMenuMessage(
        'proposal',
        newAnswers,
        isRevision ? lastProposalRef.current : undefined,
      );
      lastProposalRef.current = text;
      showMessage('ai', text, 'idea');
      setIsTyping(false);
      setShowRevisionInput(false);
      return;
    }

    if (next === 'final') {
      const text = await fetchMenuMessage('final', newAnswers, lastProposalRef.current);
      const splitIndex = text.indexOf('【材料】');
      const announcement = splitIndex >= 0 ? text.slice(0, splitIndex).trim() : text;
      const bookContent = splitIndex >= 0 ? text.slice(splitIndex) : '';
      showMessage('ai', announcement, 'idea');
      setIsTyping(false);
      if (bookContent) {
        setTimeout(() => showBookMessage(bookContent), 1400);
      }
      return;
    }

    const delay = 600 + Math.random() * 500;
    setTimeout(() => {
      showMessage('ai', getStepMessage(next, newAnswers));
      setIsTyping(false);
    }, delay);
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
    advance({ ...answers, ingredients: value }, value || '（特になし）');
    setTextValue('');
  }

  function handleMoodAllergySubmit() {
    const moodParts = [genreTag, tasteTag, moodValue.trim()].filter((part): part is string => Boolean(part));
    const mood = moodParts.join('・');
    const allergy = allergyValue.trim();
    const parts: string[] = [];
    if (mood) parts.push(`気分: ${mood}`);
    if (allergy) parts.push(`アレルギー・苦手: ${allergy}`);
    advance({ ...answers, mood, allergy }, parts.length ? parts.join(' / ') : '（特になし）');
    setMoodValue('');
    setGenreTag(null);
    setTasteTag(null);
    setAllergyValue('');
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
    setMoodValue('');
    setGenreTag(null);
    setTasteTag(null);
    setAllergyValue('');
    setShowRevisionInput(false);
    lastProposalRef.current = '';
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

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Spacing.six}>
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
          <View style={styles.messageArea}>
            {isTyping ? (
              <ScrollView contentContainerStyle={styles.messageScrollContent} showsVerticalScrollIndicator={false}>
                <ChatBubble sender="ai" text="…" variant="blob" />
              </ScrollView>
            ) : currentMessage.kind === 'book' ? (
              <View style={styles.messageContent}>
                <RecipeBook content={currentMessage.bookContent} onRestart={handleRestart} />
              </View>
            ) : (
              <ScrollView contentContainerStyle={styles.messageScrollContent} showsVerticalScrollIndicator={false}>
                <ChatBubble sender={currentMessage.sender} text={currentMessage.text} />
              </ScrollView>
            )}
          </View>

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
              <TextRow
                value={textValue}
                onChangeText={setTextValue}
                onSubmit={handlePeopleSubmit}
                placeholder="人数を教えてね！"
                keyboardType="number-pad"
              />
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
                <TagChips options={GENRE_TAG_OPTIONS} selected={genreTag} onSelect={setGenreTag} />
                <TagChips options={TASTE_TAG_OPTIONS} selected={tasteTag} onSelect={setTasteTag} />
                <ThemedView type="backgroundElement" style={styles.textInputWrapper}>
                  <TextInput
                    value={moodValue}
                    onChangeText={setMoodValue}
                    placeholder="和洋中・あっさり・麺料理など"
                    placeholderTextColor={theme.textSecondary}
                    style={[styles.textInput, { color: theme.text }]}
                  />
                </ThemedView>
                <ThemedView type="backgroundElement" style={styles.textInputWrapper}>
                  <TextInput
                    value={allergyValue}
                    onChangeText={setAllergyValue}
                    placeholder="アレルギー・苦手な食材があれば！"
                    placeholderTextColor={theme.textSecondary}
                    style={[styles.textInput, { color: theme.text }]}
                  />
                </ThemedView>
                <SendButton onPress={handleMoodAllergySubmit} />
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
              ))}
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}

function TextRow({
  value,
  onChangeText,
  onSubmit,
  placeholder,
  keyboardType,
}: {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
  placeholder: string;
  keyboardType?: 'default' | 'number-pad';
}) {
  const theme = useTheme();
  return (
    <View style={styles.textRow}>
      <ThemedView type="backgroundElement" style={[styles.textInputWrapper, styles.flex]}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.textSecondary}
          keyboardType={keyboardType}
          style={[styles.textInput, { color: theme.text }]}
          onSubmitEditing={onSubmit}
        />
      </ThemedView>
      <SendButton onPress={onSubmit} />
    </View>
  );
}

function SendButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress}>
      {({ pressed }) => (
        <ThemedView type="accent" style={[styles.sendButton, pressed && styles.pressed]}>
          <ThemedText type="smallBold" themeColor="background">
            OK
          </ThemedText>
        </ThemedView>
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
    justifyContent: 'flex-start',
    paddingTop: '18%',
    padding: Spacing.three,
  },
  messageScrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-start',
    paddingTop: '18%',
    padding: Spacing.three,
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
  textRow: {
    flexDirection: 'row',
    gap: Spacing.two,
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
  textInput: {
    fontSize: 16,
  },
  sendButton: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
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
