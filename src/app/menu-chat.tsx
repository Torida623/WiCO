import { useFocusEffect } from '@react-navigation/native';
import { Image, ImageSource } from 'expo-image';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  DimensionValue,
  Keyboard,
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

import { AllergenChecklist } from '@/components/chat/allergen-checklist';
import { ChatBubble } from '@/components/chat/chat-bubble';
import { ChoiceButtons } from '@/components/chat/choice-buttons';
import { FridgeScanPanel } from '@/components/chat/fridge-scan-panel';
import { MascotAvatar, MascotPose } from '@/components/chat/mascot-avatar';
import { MoodTray } from '@/components/chat/mood-tray';
import { RecipeBook } from '@/components/chat/recipe-book';
import { SideMenu } from '@/components/side-menu';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  Answers,
  COOKING_TIME_OPTIONS,
  Course,
  ENTRY_POINT_OPTIONS,
  EntryPoint,
  FORMAT_TAG_OPTIONS,
  GENRE_TAG_OPTIONS,
  PinnedDish,
  SHOPPING_OPTIONS,
  StepId,
  TASTE_TAG_OPTIONS,
  TEMPERATURE_TAG_OPTIONS,
  getNextStep,
  seasoningLabel,
} from '@/constants/meal-flow';
import { ALLERGENS } from '@/constants/allergens';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { isDaytime } from '@/constants/time-of-day';
import { useTheme } from '@/hooks/use-theme';
import { fetchWithTimeout, getApiUrl } from '@/lib/api';
import { DecidedDish, saveDecidedMenu } from '@/lib/decided-menus';
import { grantFirstMenuDecidedGift } from '@/lib/first-cooking-gifts';
import { listAllergyFavorites, listDislikedIngredients, setAllergyFavorite } from '@/lib/food-preferences';
import { getKitchenMemory } from '@/lib/kitchen-memory';
import { summarizeRecentMealsForPrompt } from '@/lib/meal-records';
import { buildRecipeTagChips } from '@/lib/recipe-tags';
import { listRecipes, SavedRecipe } from '@/lib/recipes';

/** Labels sourced from the official ALLERGENS list, used to split the allergy-step's checked chips back
 * into true allergens (safety-critical) vs. mere dislikes when submitting — see handleAllergySubmit(). */
const ALLERGEN_LABEL_SET = new Set(ALLERGENS.map((allergen) => allergen.label));

const ROOM_BACKGROUND = require('@/assets/images/perokoko-room-bg.jpg');
const ROOM_BACKGROUND_NO_BOOK = require('@/assets/images/perokoko-room-bg-nobook.jpg');
const ROOM_BACKGROUND_NIGHT = require('@/assets/images/perokoko-room-bg-night.jpg');
const ROOM_BACKGROUND_NIGHT_NO_BOOK = require('@/assets/images/perokoko-room-bg-night-nobook.jpg');
const FRIDGE_SCAN_BACKGROUND = require('@/assets/images/ui/fridge-scan-bg.jpg');

const OK_BUTTON_IMAGE = require('@/assets/images/ui/ok-button.png');
const BACK_BUTTON_IMAGE = require('@/assets/images/ui/back-button.png');
const MENU_DECIDED_PLATE_IMAGE = require('@/assets/images/ui/menu-decided-plate.png');
const BACK_BUTTON_HEIGHT = 72;
const BACK_BUTTON_ASPECT_RATIO = 1166 / 751;
const OK_BUTTON_ASPECT_RATIO = 1359 / 946;

const PEOPLE_INPUT_FRAME_IMAGE = require('@/assets/images/ui/people-input-frame.png');
const PEOPLE_INPUT_FRAME_ASPECT_RATIO = 1846 / 286;
// The art already draws the "人数を教えてね！" placeholder text, so this patch only needs to appear
// once the field is focused or has real text, to keep that art from showing through the cursor/typed
// input — otherwise the frame is untouched original art.
const PEOPLE_INPUT_TEXT_PATCH_FILL_COLOR = 'rgb(254, 250, 240)';

const MOOD_BUTTON_IMAGE = require('@/assets/images/ui/menu-mood-button.png');
const MOOD_BUTTON_ASPECT_RATIO = 1449 / 349;
// Same idea as PEOPLE_INPUT above: the art already draws the "今日の気分" placeholder, so the patch
// only needs to appear once a mood is actually picked.
const MOOD_BUTTON_FILL_COLOR = 'rgb(255, 249, 231)';
const MOOD_BUTTON_TEXT_PATCH = { top: '15%', left: '44.9%', width: '38%', height: '70%' } as const;

const RECIPE_BUTTON_IMAGE = require('@/assets/images/ui/menu-recipe-button.png');
const RECIPE_BUTTON_ASPECT_RATIO = 1467 / 343;

// Static-label trigger (opens the allergy picker) — the baked-in "アレルギー食材を追加" text never
// needs to change, so this is just an image button, no text patch.
const ALLERGY_ADD_BUTTON_IMAGE = require('@/assets/images/ui/allergy-add-button.png');
const ALLERGY_ADD_BUTTON_ASPECT_RATIO = 1407 / 250;

const DISLIKED_INPUT_BUTTON_IMAGE = require('@/assets/images/ui/disliked-input-button.png');
const DISLIKED_INPUT_BUTTON_ASPECT_RATIO = 1953 / 246;
const DISLIKED_INPUT_TEXT_PATCH_FILL_COLOR = 'rgb(254, 252, 248)';
const DISLIKED_INPUT_TEXT_BOX = { top: '16.3%', left: '10.3%', width: '77.8%', height: '69.1%' } as const;

// Static-label trigger (switches to FridgeScanPanel) — no text patch needed, same as ALLERGY_ADD above.
const FRIDGE_VIEW_BUTTON_IMAGE = require('@/assets/images/ui/fridge-view-button.png');
const FRIDGE_VIEW_BUTTON_ASPECT_RATIO = 1320 / 394;

const INGREDIENTS_INPUT_BUTTON_IMAGE = require('@/assets/images/ui/ingredients-input-button.png');
const INGREDIENTS_INPUT_BUTTON_ASPECT_RATIO = 1400 / 230;
const INGREDIENTS_INPUT_TEXT_PATCH_FILL_COLOR = 'rgb(253, 251, 243)';
const INGREDIENTS_INPUT_TEXT_BOX = { top: '10.9%', left: '4.3%', width: '56.4%', height: '78.3%' } as const;

const BREAKFAST_INGREDIENTS_INPUT_BUTTON_IMAGE = require('@/assets/images/ui/breakfast-ingredients-input-button.png');
const BREAKFAST_INGREDIENTS_INPUT_BUTTON_ASPECT_RATIO = 1179 / 221;
const BREAKFAST_INGREDIENTS_INPUT_TEXT_PATCH_FILL_COLOR = 'rgb(254, 252, 240)';
const BREAKFAST_INGREDIENTS_INPUT_TEXT_BOX = { top: '9%', left: '3.4%', width: '72.9%', height: '81.4%' } as const;
const PEOPLE_INPUT_TEXT_BOX = { top: '14%', left: '8%', width: '84%', height: '73%' } as const;

const MENU_FETCH_TIMEOUT_MS = 30_000;

type MenuFetchResult = { message: string; dishes?: DecidedDish[] };

async function fetchMenuMessage(
  mode: 'proposal' | 'final',
  answers: Answers,
  proposalText?: string,
): Promise<MenuFetchResult> {
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
  return data as MenuFetchResult;
}

function extractBookContent(text: string): string {
  const splitIndex = text.indexOf('【材料】');
  return splitIndex >= 0 ? text.slice(splitIndex) : text;
}

const COURSE_ORDER: Course[] = ['主菜', '主食', '副菜', '汁物'];

function sortDishesByCourse(dishes: DecidedDish[]): DecidedDish[] {
  return [...dishes].sort((a, b) => COURSE_ORDER.indexOf(a.course) - COURSE_ORDER.indexOf(b.course));
}

/** The AI (or a re-parsed pinned recipe) sometimes echoes the ingredient name back into `amount`
 * (e.g. name "クリームコーン缶" + amount "クリームコーン缶 1/2缶"), which would otherwise render as
 * "クリームコーン缶 クリームコーン缶 1/2缶". Strip that duplicate before display. */
function formatIngredientLine(name: string, amount: string): string {
  const trimmedName = name.trim();
  const trimmedAmount = amount.trim();
  const dedupedAmount =
    trimmedAmount.startsWith(trimmedName) && trimmedAmount.length > trimmedName.length
      ? trimmedAmount.slice(trimmedName.length).trim()
      : trimmedAmount;
  return `・${trimmedName} ${dedupedAmount}`;
}

function buildDishIngredientsText(dish: DecidedDish): string {
  const blocks: string[] = [];
  const basicIngredients = dish.basicIngredients ?? [];
  const seasoningGroups = dish.seasoningGroups ?? [];
  if (basicIngredients.length) {
    blocks.push(basicIngredients.map((i) => formatIngredientLine(i.name, i.amount)).join('\n'));
  }
  seasoningGroups.forEach((group, index) => {
    if (!group.items.length) return;
    blocks.push(
      `〈調味料${seasoningLabel(index)}・合わせ調味料〉\n${group.items.map((i) => formatIngredientLine(i.name, i.amount)).join('\n')}`,
    );
  });
  return blocks.join('\n\n');
}

/** Mirrors decided-menus/[id].tsx's card layout (献立ノート): all dish names, then all dishes'
 * ingredients, then all dishes' steps — rather than repeating 【材料】/【作り方】 per dish. */
function buildStructuredBookContent(dishes: DecidedDish[], people?: string): string {
  const servingsLabel = people ? `(${people}人分)` : '(指定された人数分)';
  const ordered = sortDishesByCourse(dishes);
  const lines = ['【献立】'];
  ordered.forEach((dish) => lines.push(`○ ${dish.course}：${dish.title}`));

  lines.push('', `【材料】${servingsLabel}`);
  ordered.forEach((dish, index) => {
    if (index > 0) lines.push('');
    lines.push(`◆${dish.course}：${dish.title}`, buildDishIngredientsText(dish));
  });

  lines.push('', '【作り方】');
  ordered.forEach((dish, index) => {
    if (index > 0) lines.push('');
    lines.push(`◆${dish.course}：${dish.title}`);
    dish.steps.forEach((s, idx) => lines.push(`${idx + 1}. ${s}`));
  });

  return lines.join('\n');
}

/** Best-effort split of a bookContent string (【材料】/【作り方】format) into structured ingredients/steps, used when pinning a saved recipe into the menu chat. */
function parseBookContent(bookContent: string): { ingredients: { name: string; amount: string }[]; steps: string[] } {
  const stepsIndex = bookContent.indexOf('【作り方】');
  const ingredientsBlock = stepsIndex >= 0 ? bookContent.slice(0, stepsIndex) : bookContent;
  const stepsBlock = stepsIndex >= 0 ? bookContent.slice(stepsIndex) : '';

  const ingredients = ingredientsBlock
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('・'))
    .map((line) => {
      const text = line.slice(1).trim();
      const match = text.match(/^(.*?)[\s　]+([\d０-９].*)$/);
      return match ? { name: match[1].trim(), amount: match[2].trim() } : { name: text, amount: '' };
    });

  const steps = stepsBlock
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && line !== '【作り方】')
    .map((line) => line.replace(/^\d+[.．]\s*/, ''));

  return { ingredients, steps };
}

type Message =
  | {
      id: string;
      kind: 'text';
      sender: 'ai' | 'user';
      text: string;
      mascotPose?: MascotPose;
    }
  | { id: string; kind: 'book'; sender: 'ai'; bookContent: string; dishes: DecidedDish[] }
  | { id: string; kind: 'plate' }
  | { id: string; kind: 'fridgeScan' };

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
    case 'allergy':
      if (answers.cookingTime) {
        const timeLabel = answers.cookingTime === 'relaxed' ? '時間をかけて' : 'ぱぱっと';
        return `${timeLabel}作るんだね！\n食べられない物があったら教えてね！`;
      }
      return `${answers.people}人で食べるんだ！OKだよ！\n食べられない物があったら教えてね！`;
    case 'mood':
      return 'どんなものが食べたいかな？';
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
  const [stepHistory, setStepHistory] = useState<{ step: StepId; answers: Answers }[]>([]);
  const [isTyping, setIsTyping] = useState(false);

  const [textValue, setTextValue] = useState('');
  const [freeMoodValue, setFreeMoodValue] = useState('');
  const [genreTag, setGenreTag] = useState<string | null>(null);
  const [formatTag, setFormatTag] = useState<string | null>(null);
  const [tasteTag, setTasteTag] = useState<string | null>(null);
  const [temperatureTag, setTemperatureTag] = useState<string | null>(null);
  const [allergyValue, setAllergyValue] = useState('');
  const [profileAllergyItems, setProfileAllergyItems] = useState<string[]>([]);
  const [checkedProfileItems, setCheckedProfileItems] = useState<Record<string, boolean>>({});
  const [showRevisionInput, setShowRevisionInput] = useState(false);
  const [showMoodTray, setShowMoodTray] = useState(false);
  const [showAllergyPicker, setShowAllergyPicker] = useState(false);
  const [showingRecipeDetail, setShowingRecipeDetail] = useState(false);
  const [pinnedDish, setPinnedDish] = useState<PinnedDish | null>(null);
  const [showRecipePicker, setShowRecipePicker] = useState(false);
  const [savedRecipesForPicker, setSavedRecipesForPicker] = useState<SavedRecipe[]>([]);
  const [fridgeScanFromIngredients, setFridgeScanFromIngredients] = useState(false);
  const [isAllergyInputFocused, setIsAllergyInputFocused] = useState(false);
  // Kept mounted (fading out on top of the book) after `currentMessage` has already moved on to
  // 'book', so the plate's fade and the background's book-prop crossfade run at the same time
  // instead of one waiting for the other to finish first.
  const [showPlateOverlay, setShowPlateOverlay] = useState(false);
  const lastProposalRef = useRef('');
  const finalDetailsRef = useRef<{
    proposal: string;
    content: string;
    dishes: DecidedDish[];
  } | null>(null);
  const messageIdRef = useRef(1);
  const mascotOpacity = useSharedValue(1);
  const plateOpacity = useSharedValue(1);
  const daytime = useRef(isDaytime()).current;

  useEffect(() => {
    let cancelled = false;
    Promise.all([listDislikedIngredients(), listAllergyFavorites()]).then(([disliked, allergyIds]) => {
      if (cancelled) return;
      const allergyLabels = ALLERGENS.filter((allergen) => allergyIds.includes(allergen.id)).map(
        (allergen) => allergen.label,
      );
      const items = [...disliked, ...allergyLabels];
      setProfileAllergyItems(items);
      setCheckedProfileItems(Object.fromEntries(items.map((item) => [item, true])));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function toggleProfileAllergyItem(item: string) {
    setCheckedProfileItems((current) => ({ ...current, [item]: !current[item] }));
  }

  function handlePickAllergen(id: string) {
    const allergen = ALLERGENS.find((candidate) => candidate.id === id)!;
    const label = allergen.label;
    if (!profileAllergyItems.includes(label)) {
      setProfileAllergyItems((current) => [...current, label]);
      setCheckedProfileItems((current) => ({ ...current, [label]: true }));
      setAllergyFavorite(id, true).catch((error) => console.error('アレルギー登録の保存に失敗:', error));
      return;
    }
    setCheckedProfileItems((current) => ({ ...current, [label]: !current[label] }));
  }

  const checkedAllergenIds = ALLERGENS.filter((allergen) => checkedProfileItems[allergen.label]).map(
    (allergen) => allergen.id,
  );

  const roomBackground =
    currentMessage.kind === 'fridgeScan'
      ? FRIDGE_SCAN_BACKGROUND
      : daytime
        ? currentMessage.kind === 'book'
          ? ROOM_BACKGROUND_NO_BOOK
          : ROOM_BACKGROUND
        : currentMessage.kind === 'book'
          ? ROOM_BACKGROUND_NIGHT_NO_BOOK
          : ROOM_BACKGROUND_NIGHT;

  useEffect(() => {
    const hideMascot =
      currentMessage.kind === 'book' || currentMessage.kind === 'plate' || currentMessage.kind === 'fridgeScan';
    mascotOpacity.value = withTiming(hideMascot ? 0 : 1, { duration: 450 });
  }, [currentMessage.kind, mascotOpacity]);

  const mascotStyle = useAnimatedStyle(() => ({ opacity: mascotOpacity.value }));
  const plateStyle = useAnimatedStyle(() => ({ opacity: plateOpacity.value }));

  function nextMessageId() {
    messageIdRef.current += 1;
    return String(messageIdRef.current);
  }

  function showMessage(sender: 'ai' | 'user', text: string, pose: MascotPose = 'neutral') {
    setCurrentMessage({ id: nextMessageId(), kind: 'text', sender, text });
    if (sender === 'ai') setMascotPose(pose);
  }

  function showBookMessage(bookContent: string, dishes: DecidedDish[]) {
    setCurrentMessage({ id: nextMessageId(), kind: 'book', sender: 'ai', bookContent, dishes });
  }

  function showPlateMessage() {
    plateOpacity.value = 1;
    setCurrentMessage({ id: nextMessageId(), kind: 'plate' });
  }

  function showFridgeScanMessage() {
    setCurrentMessage({ id: nextMessageId(), kind: 'fridgeScan' });
  }

  // 「冷蔵庫を見る」button on the manual ingredients step: unlike the entryPoint==='fridge' path
  // (which reaches fridgeScan via advance()/handleBack() and so has real stepHistory to fall back
  // on), this jumps into fridgeScan mid-step without pushing history — so its own back button needs
  // to return to the ingredients text screen directly instead of going through handleBack().
  function handleOpenFridgeScanFromIngredients() {
    setFridgeScanFromIngredients(true);
    showFridgeScanMessage();
  }

  function handleFridgeScanBack() {
    if (fridgeScanFromIngredients) {
      setFridgeScanFromIngredients(false);
      showMessage('ai', getStepMessage('ingredients', answers));
      return;
    }
    handleBack();
  }

  async function getFinalDetails(
    currentAnswers: Answers,
  ): Promise<{ content: string; dishes: DecidedDish[] }> {
    if (finalDetailsRef.current && finalDetailsRef.current.proposal === lastProposalRef.current) {
      return finalDetailsRef.current;
    }
    const data = await fetchMenuMessage('final', currentAnswers, lastProposalRef.current);
    finalDetailsRef.current = {
      proposal: lastProposalRef.current,
      content: data.message,
      dishes: data.dishes ?? [],
    };
    return finalDetailsRef.current;
  }

  async function handlePreviewRecipe() {
    setIsTyping(true);
    try {
      const { content, dishes } = await getFinalDetails(answers);
      const previewText = dishes.length ? buildStructuredBookContent(dishes, answers.people) : extractBookContent(content);
      showMessage('ai', previewText);
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
    const previousAnswers = answers;
    const next = getNextStep(step, newAnswers);
    setStepHistory((history) => [...history, { step: previousStep, answers: previousAnswers }]);
    setAnswers(newAnswers);
    setStep(next);
    setIsTyping(true);

    try {
      if (next === 'proposal') {
        const isRevision = Boolean(newAnswers.revisionRequest?.trim());
        const proposalAnswers = isRevision
          ? newAnswers
          : {
              ...newAnswers,
              mealHistory: await summarizeRecentMealsForPrompt(),
              kitchenMemory: await getKitchenMemory(),
            };
        const data = await fetchMenuMessage(
          'proposal',
          proposalAnswers,
          isRevision ? lastProposalRef.current : undefined,
        );
        lastProposalRef.current = data.message;
        showMessage('ai', data.message);
        setShowRevisionInput(false);
        setShowingRecipeDetail(false);
        return;
      }

      if (next === 'final') {
        setMascotPose('thinking');
        const { content, dishes } = await getFinalDetails(newAnswers);
        const bookContent = dishes.length ? buildStructuredBookContent(dishes, newAnswers.people) : extractBookContent(content);
        if (newAnswers.entryPoint) {
          saveDecidedMenu({
            entryPoint: newAnswers.entryPoint,
            proposalText: lastProposalRef.current,
            recipeText: content,
            dishes,
            people: newAnswers.people,
          })
            .then(() => grantFirstMenuDecidedGift())
            .catch((error) => console.error('決定済み献立の保存に失敗:', error));
        }
        setMascotPose('idea');
        await new Promise((resolve) => setTimeout(resolve, 1500));
        showPlateMessage();
        const PLATE_FADE_DURATION_MS = 400;
        setTimeout(() => {
          // Start the plate's fade-out, the background's book-prop crossfade (triggered by
          // showBookMessage flipping currentMessage.kind), and the book content reveal all at once,
          // keeping the plate mounted as a fading overlay until its animation finishes.
          setShowPlateOverlay(true);
          plateOpacity.value = withTiming(0, { duration: PLATE_FADE_DURATION_MS });
          showBookMessage(bookContent, dishes);
          setTimeout(() => setShowPlateOverlay(false), PLATE_FADE_DURATION_MS);
        }, 2000 - PLATE_FADE_DURATION_MS);
        return;
      }

      const delay = 600 + Math.random() * 500;
      await new Promise((resolve) => setTimeout(resolve, delay));

      if (next === 'ingredients' && newAnswers.entryPoint === 'fridge') {
        setFridgeScanFromIngredients(false);
        showFridgeScanMessage();
        return;
      }

      showMessage('ai', getStepMessage(next, newAnswers));
    } catch (error) {
      console.error(error);
      setMascotPose('neutral');
      setStep(previousStep);
      setStepHistory((history) => history.slice(0, -1));
      showMessage('ai', 'あれ、うまく繋がらなかったみたい…！もう一度試してみてくれる？');
    } finally {
      setIsTyping(false);
    }
  }

  function handleBack() {
    if (stepHistory.length === 0) return;
    const previous = stepHistory[stepHistory.length - 1];
    setStepHistory((history) => history.slice(0, -1));
    setAnswers(previous.answers);
    setStep(previous.step);
    setMascotPose('neutral');
    setTextValue('');
    setGenreTag(null);
    setFormatTag(null);
    setTasteTag(null);
    setTemperatureTag(null);
    setFreeMoodValue('');
    setAllergyValue('');
    setIsAllergyInputFocused(false);
    setShowMoodTray(false);
    setShowRevisionInput(false);
    setPinnedDish(null);
    setShowRecipePicker(false);

    if (previous.step === 'ingredients' && previous.answers.entryPoint === 'fridge') {
      setFridgeScanFromIngredients(false);
      showFridgeScanMessage();
      return;
    }

    showMessage('ai', getStepMessage(previous.step as Exclude<StepId, 'proposal' | 'final'>, previous.answers));
  }

  function handleChoice(key: keyof Answers, value: string, label: string) {
    advance({ ...answers, [key]: value } as Answers, label);
  }

  function handlePeopleSubmit() {
    const value = textValue.trim();
    if (!value) return;
    let nextAnswers = { ...answers, people: value };
    if (answers.entryPoint === 'aiRecommend') {
      // The allergy step is skipped for this entry point (see getNextStep), so carry the
      // already-registered profile allergens/disliked-foods over silently instead — same values
      // handleAllergySubmit would have derived from the (all pre-checked) chips on that screen.
      const checkedProfileList = profileAllergyItems.filter((item) => checkedProfileItems[item]);
      nextAnswers = {
        ...nextAnswers,
        allergens: checkedProfileList.filter((item) => ALLERGEN_LABEL_SET.has(item)).join('、'),
        dislikedFoods: checkedProfileList.filter((item) => !ALLERGEN_LABEL_SET.has(item)).join('、'),
      };
    }
    advance(nextAnswers, `${value}人分`);
    setTextValue('');
  }

  function handleIngredientsSubmit() {
    const value = textValue.trim();
    if (answers.entryPoint === 'breakfast' && !value) return;
    advance({ ...answers, ingredients: value }, value || '（特になし）');
    setTextValue('');
  }

  function handleFridgeIngredientsConfirm(ingredientsText: string) {
    advance({ ...answers, ingredients: ingredientsText }, ingredientsText);
  }

  function handleAllergySubmit() {
    const checkedProfileList = profileAllergyItems.filter((item) => checkedProfileItems[item]);
    const freeText = allergyValue.trim();
    const allergens = checkedProfileList.filter((item) => ALLERGEN_LABEL_SET.has(item)).join('、');
    const dislikedFoods = [...checkedProfileList.filter((item) => !ALLERGEN_LABEL_SET.has(item)), freeText]
      .filter(Boolean)
      .join('、');
    const display = [...checkedProfileList, freeText].filter(Boolean).join('、');
    advance({ ...answers, allergens, dislikedFoods }, display || '（特になし）');
    setAllergyValue('');
    setIsAllergyInputFocused(false);
  }

  function handleMoodSubmit() {
    const mood = [genreTag, formatTag, tasteTag, temperatureTag, freeMoodValue.trim()]
      .filter((part): part is string => Boolean(part))
      .join('・');
    const parts: string[] = [];
    if (mood) parts.push(`気分: ${mood}`);
    if (pinnedDish) parts.push(`使うレシピ: ${pinnedDish.course}・${pinnedDish.title}`);
    advance(
      { ...answers, mood, pinnedRecipe: pinnedDish ?? undefined },
      parts.length ? parts.join(' / ') : '（特になし）',
    );
    setGenreTag(null);
    setFormatTag(null);
    setTasteTag(null);
    setTemperatureTag(null);
    setFreeMoodValue('');
    setShowMoodTray(false);
    setPinnedDish(null);
    setShowRecipePicker(false);
  }

  function handleOpenRecipePicker() {
    listRecipes().then(setSavedRecipesForPicker);
    setShowRecipePicker(true);
  }

  function handlePickRecipe(recipe: SavedRecipe) {
    setPinnedDish({
      course: recipe.course ?? '主菜',
      title: recipe.title,
      ...parseBookContent(recipe.bookContent),
    });
    setShowRecipePicker(false);
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
    setStepHistory([]);
    setTextValue('');
    setGenreTag(null);
    setFormatTag(null);
    setTasteTag(null);
    setTemperatureTag(null);
    setFreeMoodValue('');
    setAllergyValue('');
    setIsAllergyInputFocused(false);
    setShowRevisionInput(false);
    setShowMoodTray(false);
    setShowingRecipeDetail(false);
    setPinnedDish(null);
    setShowRecipePicker(false);
    setShowPlateOverlay(false);
    lastProposalRef.current = '';
    finalDetailsRef.current = null;
  }

  // Leaving mid-flow (e.g. via the side menu) and coming back later should
  // start over rather than resume where the chat was left off.
  useFocusEffect(
    useCallback(() => {
      return () => {
        handleRestart();
      };
    }, []),
  );

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
            ) : currentMessage.kind === 'plate' ? null : currentMessage.kind === 'book' ? (
              <View style={styles.messageContent}>
                <RecipeBook content={currentMessage.bookContent} dishes={currentMessage.dishes} onRestart={handleRestart} />
              </View>
            ) : currentMessage.kind === 'fridgeScan' ? (
              <FridgeScanPanel onConfirm={handleFridgeIngredientsConfirm} onBack={handleFridgeScanBack} />
            ) : (
              <ScrollView contentContainerStyle={styles.messageScrollContent} showsVerticalScrollIndicator={false}>
                <ChatBubble sender={currentMessage.sender} text={currentMessage.text} style={styles.dialogueOffset} />
              </ScrollView>
            )}

            {(currentMessage.kind === 'plate' || showPlateOverlay) && (
              <Animated.View
                style={[styles.plateContent, styles.plateOverlay, plateStyle]}
                pointerEvents={currentMessage.kind === 'plate' ? undefined : 'none'}>
                <Image source={MENU_DECIDED_PLATE_IMAGE} style={styles.plateImage} contentFit="contain" />
              </Animated.View>
            )}
          </View>

          {currentMessage.kind !== 'plate' && currentMessage.kind !== 'fridgeScan' && (
          <View
            style={[styles.inputArea, isTyping && styles.inputAreaDisabled]}
            pointerEvents={isTyping ? 'none' : 'auto'}>
            {step === 'entryPoint' && (
              <View style={styles.entryPointGrid}>
                {[
                  ['breakfast', 'lunch'],
                  ['dinner'],
                  ['aiRecommend', 'fridge'],
                ].map((row) => (
                  // Two-item rows use a fixed-width column per item (instead of one row centered as
                  // a whole) so breakfast/aiRecommend and lunch/fridge line up in straight columns —
                  // centering the row as a whole wouldn't, since the two rows' total widths differ.
                  <View key={row.join('-')} style={row.length > 1 && styles.entryPointColumnRow}>
                    {row.map((value) => (
                      <View key={value} style={row.length > 1 && styles.entryPointColumn}>
                        <ChoiceButtons
                          options={ENTRY_POINT_OPTIONS.filter((o) => o.value === value)}
                          onSelect={(v) => {
                            const label = ENTRY_POINT_OPTIONS.find((o) => o.value === v)!.label;
                            handleChoice('entryPoint', v, label);
                          }}
                        />
                      </View>
                    ))}
                  </View>
                ))}
              </View>
            )}

            {step === 'cookingTime' && (
              <>
                <ChoiceButtons
                  options={COOKING_TIME_OPTIONS}
                  onSelect={(value) => {
                    const label = COOKING_TIME_OPTIONS.find((o) => o.value === value)!.label;
                    handleChoice('cookingTime', value, label);
                  }}
                />
                <View style={styles.choiceBackRow}>
                  <BackButton onPress={handleBack} />
                </View>
              </>
            )}

            {step === 'shopping' && (
              <>
                <ChoiceButtons
                  options={SHOPPING_OPTIONS}
                  onSelect={(value) => {
                    const label = SHOPPING_OPTIONS.find((o) => o.value === value)!.label;
                    handleChoice('shopping', value, label);
                  }}
                />
                <View style={styles.choiceBackRow}>
                  <BackButton onPress={handleBack} />
                </View>
              </>
            )}

            {step === 'people' && (
              <View style={styles.peopleRow}>
                <TextRow
                  value={textValue}
                  onChangeText={setTextValue}
                  onSubmit={handlePeopleSubmit}
                  onBack={handleBack}
                  placeholder="人数を教えてね！"
                  keyboardType="number-pad"
                  centered
                  frameImage={PEOPLE_INPUT_FRAME_IMAGE}
                  frameAspectRatio={PEOPLE_INPUT_FRAME_ASPECT_RATIO}
                  framePatchBox={PEOPLE_INPUT_TEXT_BOX}
                  framePatchFillColor={PEOPLE_INPUT_TEXT_PATCH_FILL_COLOR}
                />
              </View>
            )}

            {step === 'ingredients' && (
              <View style={styles.ingredientsStep}>
                <Pressable onPress={handleOpenFridgeScanFromIngredients}>
                  {({ pressed }) => (
                    <Image
                      source={FRIDGE_VIEW_BUTTON_IMAGE}
                      style={[
                        styles.textInputWrapperStacked,
                        styles.fridgeViewButton,
                        { aspectRatio: FRIDGE_VIEW_BUTTON_ASPECT_RATIO },
                        pressed && styles.pressed,
                      ]}
                      contentFit="fill"
                    />
                  )}
                </Pressable>
                {answers.entryPoint === 'breakfast' ? (
                  <TextRow
                    value={textValue}
                    onChangeText={setTextValue}
                    onSubmit={handleIngredientsSubmit}
                    onBack={handleBack}
                    placeholder="例: 卵、食パン、ヨーグルト"
                    centered
                    frameImage={BREAKFAST_INGREDIENTS_INPUT_BUTTON_IMAGE}
                    frameAspectRatio={BREAKFAST_INGREDIENTS_INPUT_BUTTON_ASPECT_RATIO}
                    framePatchBox={BREAKFAST_INGREDIENTS_INPUT_TEXT_BOX}
                    framePatchFillColor={BREAKFAST_INGREDIENTS_INPUT_TEXT_PATCH_FILL_COLOR}
                    frameStyle={styles.ingredientsInputButton}
                  />
                ) : (
                  <TextRow
                    value={textValue}
                    onChangeText={setTextValue}
                    onSubmit={handleIngredientsSubmit}
                    onBack={handleBack}
                    placeholder="例: 鶏胸肉、キャベツ"
                    centered
                    frameImage={INGREDIENTS_INPUT_BUTTON_IMAGE}
                    frameAspectRatio={INGREDIENTS_INPUT_BUTTON_ASPECT_RATIO}
                    framePatchBox={INGREDIENTS_INPUT_TEXT_BOX}
                    framePatchFillColor={INGREDIENTS_INPUT_TEXT_PATCH_FILL_COLOR}
                    frameStyle={styles.ingredientsInputButton}
                  />
                )}
              </View>
            )}

            {step === 'allergy' && (
              <View style={styles.dualTextContainer}>
                {profileAllergyItems.length > 0 && (
                  <View style={styles.allergyChipRow}>
                    {profileAllergyItems.map((item) => {
                      const checked = checkedProfileItems[item];
                      return (
                        <Pressable key={item} onPress={() => toggleProfileAllergyItem(item)}>
                          {({ pressed }) => (
                            <ThemedView
                              type={checked ? 'accent' : 'backgroundElement'}
                              style={[styles.allergyChip, pressed && styles.pressed]}>
                              <ThemedText type="small" themeColor={checked ? 'background' : 'textSecondary'}>
                                {item}
                              </ThemedText>
                            </ThemedView>
                          )}
                        </Pressable>
                      );
                    })}
                  </View>
                )}
                <Pressable
                  onPress={() => {
                    Keyboard.dismiss();
                    setShowAllergyPicker(true);
                  }}>
                  {({ pressed }) => (
                    <Image
                      source={ALLERGY_ADD_BUTTON_IMAGE}
                      style={[
                        styles.textInputWrapperStacked,
                        styles.allergyAddButton,
                        { aspectRatio: ALLERGY_ADD_BUTTON_ASPECT_RATIO },
                        pressed && styles.pressed,
                      ]}
                      contentFit="fill"
                    />
                  )}
                </Pressable>
                <View style={[styles.textInputWrapperStacked, { aspectRatio: DISLIKED_INPUT_BUTTON_ASPECT_RATIO }]}>
                  <Image
                    source={DISLIKED_INPUT_BUTTON_IMAGE}
                    style={StyleSheet.absoluteFillObject}
                    contentFit="fill"
                  />
                  <View
                    style={[
                      styles.inputPatch,
                      DISLIKED_INPUT_TEXT_BOX,
                      {
                        backgroundColor:
                          allergyValue || isAllergyInputFocused ? DISLIKED_INPUT_TEXT_PATCH_FILL_COLOR : 'transparent',
                      },
                    ]}>
                    <TextInput
                      value={allergyValue}
                      onChangeText={setAllergyValue}
                      onFocus={() => {
                        setShowAllergyPicker(false);
                        setIsAllergyInputFocused(true);
                      }}
                      onBlur={() => setIsAllergyInputFocused(false)}
                      style={[styles.textInput, styles.textInputCentered, { color: theme.text }]}
                    />
                  </View>
                </View>
                <View style={styles.moodButtonRow}>
                  <BackButton onPress={handleBack} />
                  <SendButton onPress={handleAllergySubmit} />
                </View>
              </View>
            )}

            {step === 'mood' && (
              <View style={styles.dualTextContainer}>
                {!showMoodTray && (
                  <>
                    <Pressable onPress={() => setShowMoodTray((current) => !current)}>
                      {({ pressed }) => {
                        const moodLabel = [genreTag, formatTag, tasteTag, temperatureTag, freeMoodValue.trim()]
                          .filter(Boolean)
                          .join('・');
                        return (
                          <View
                            style={[
                              styles.textInputWrapperStacked,
                              styles.moodChoiceButton,
                              { aspectRatio: MOOD_BUTTON_ASPECT_RATIO },
                              pressed && styles.pressed,
                            ]}>
                            <Image source={MOOD_BUTTON_IMAGE} style={StyleSheet.absoluteFillObject} contentFit="fill" />
                            {moodLabel.length > 0 && (
                              <View
                                style={[
                                  styles.inputPatch,
                                  MOOD_BUTTON_TEXT_PATCH,
                                  { backgroundColor: MOOD_BUTTON_FILL_COLOR },
                                ]}>
                                <ThemedText
                                  style={[styles.textInput, styles.textInputCentered]}
                                  numberOfLines={1}
                                  ellipsizeMode="tail">
                                  {moodLabel}
                                </ThemedText>
                              </View>
                            )}
                          </View>
                        );
                      }}
                    </Pressable>
                    <Pressable onPress={handleOpenRecipePicker}>
                      {({ pressed }) =>
                        pinnedDish ? (
                          <ThemedView
                            type="backgroundElement"
                            style={[styles.textInputWrapper, pressed && styles.pressed]}>
                            <ThemedText type="small" numberOfLines={1} ellipsizeMode="tail">
                              {`使う：${pinnedDish.course}・${pinnedDish.title}`}
                            </ThemedText>
                          </ThemedView>
                        ) : (
                          <Image
                            source={RECIPE_BUTTON_IMAGE}
                            style={[
                              styles.textInputWrapperStacked,
                              styles.moodChoiceButton,
                              { aspectRatio: RECIPE_BUTTON_ASPECT_RATIO },
                              pressed && styles.pressed,
                            ]}
                            contentFit="fill"
                          />
                        )
                      }
                    </Pressable>
                    {pinnedDish && (
                      <Pressable onPress={() => setPinnedDish(null)} style={styles.choiceBackRow}>
                        {({ pressed }) => (
                          <ThemedText type="link" themeColor="accent" style={pressed && styles.pressed}>
                            使うのをやめる
                          </ThemedText>
                        )}
                      </Pressable>
                    )}
                  </>
                )}
                <View style={styles.moodButtonRow}>
                  {!showMoodTray && <BackButton onPress={handleBack} />}
                  <SendButton onPress={showMoodTray ? () => setShowMoodTray(false) : handleMoodSubmit} />
                </View>
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

      {step === 'mood' && showMoodTray && (
        <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setShowMoodTray(false)} />
      )}
      {step === 'mood' && (
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

      {step === 'mood' && showRecipePicker && (
        <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setShowRecipePicker(false)} />
      )}
      {step === 'mood' && showRecipePicker && (
        <View style={styles.allergyPickerOverlay} pointerEvents="box-none">
          <ThemedView type="background" style={styles.allergyPickerPanel}>
            <View style={styles.allergyPickerHeader}>
              <ThemedText type="smallBold">保存したレシピから選ぶ</ThemedText>
              <Pressable onPress={() => setShowRecipePicker(false)} hitSlop={8}>
                {({ pressed }) => (
                  <ThemedText type="link" themeColor="accent" style={pressed && styles.pressed}>
                    閉じる
                  </ThemedText>
                )}
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.allergyPickerContent}>
              {savedRecipesForPicker.length === 0 ? (
                <ThemedText type="small" themeColor="textSecondary">
                  まだ保存したレシピがないよ。
                </ThemedText>
              ) : (
                savedRecipesForPicker.map((recipe) => (
                  <Pressable key={recipe.id} onPress={() => handlePickRecipe(recipe)}>
                    {({ pressed }) => (
                      <ThemedView
                        type="backgroundElement"
                        style={[styles.recipePickerRow, pressed && styles.pressed]}>
                        <ThemedText type="smallBold">{recipe.title}</ThemedText>
                        <View style={styles.recipePickerTagWrap}>
                          {buildRecipeTagChips(recipe).map((chip) => (
                            <View
                              key={chip.key}
                              style={[
                                styles.recipePickerTagChip,
                                { backgroundColor: chip.background, borderColor: chip.text },
                              ]}>
                              <ThemedText type="small" style={{ color: chip.text }}>
                                {chip.label}
                              </ThemedText>
                            </View>
                          ))}
                        </View>
                      </ThemedView>
                    )}
                  </Pressable>
                ))
              )}
            </ScrollView>
          </ThemedView>
        </View>
      )}

      {step === 'allergy' && showAllergyPicker && (
        <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setShowAllergyPicker(false)} />
      )}
      {step === 'allergy' && showAllergyPicker && (
        <View style={styles.allergyPickerOverlay} pointerEvents="box-none">
          <ThemedView type="background" style={styles.allergyPickerPanel}>
            <View style={[styles.allergyPickerHeader, styles.allergyPickerHeaderEnd]}>
              <Pressable onPress={() => setShowAllergyPicker(false)} hitSlop={8}>
                {({ pressed }) => (
                  <ThemedText type="link" themeColor="accent" style={pressed && styles.pressed}>
                    閉じる
                  </ThemedText>
                )}
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.allergyPickerContent}>
              <AllergenChecklist checkedIds={checkedAllergenIds} onToggle={handlePickAllergen} />
            </ScrollView>
          </ThemedView>
        </View>
      )}

    </View>
  );
}

function TextRow({
  value,
  onChangeText,
  onSubmit,
  onBack,
  placeholder,
  keyboardType,
  centered,
  frameImage,
  frameAspectRatio,
  framePatchBox,
  framePatchFillColor,
  frameStyle,
}: {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
  onBack?: () => void;
  placeholder: string;
  keyboardType?: 'default' | 'number-pad';
  centered?: boolean;
  frameImage?: ImageSource;
  frameAspectRatio?: number;
  framePatchBox?: { top: DimensionValue; left: DimensionValue; width: DimensionValue; height: DimensionValue };
  framePatchFillColor?: string;
  frameStyle?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.textRowStacked}>
      {frameImage && framePatchBox && framePatchFillColor ? (
        <View style={[styles.textInputWrapperStacked, { aspectRatio: frameAspectRatio }, frameStyle]}>
          <Image source={frameImage} style={StyleSheet.absoluteFillObject} contentFit="fill" />
          <View
            style={[
              styles.inputPatch,
              framePatchBox,
              { backgroundColor: value || isFocused ? framePatchFillColor : 'transparent' },
            ]}>
            <TextInput
              value={value}
              onChangeText={onChangeText}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              keyboardType={keyboardType}
              style={[styles.textInput, { color: theme.text }, centered && styles.textInputCentered]}
              onSubmitEditing={onSubmit}
            />
          </View>
        </View>
      ) : (
        <ThemedView type="backgroundElement" style={[styles.textInputWrapper, styles.textInputWrapperStacked]}>
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
      )}
      <View style={styles.controlsRow}>
        {onBack && <BackButton onPress={onBack} />}
        <SendButton onPress={onSubmit} />
      </View>
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

function BackButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress}>
      {({ pressed }) => (
        <Image source={BACK_BUTTON_IMAGE} style={[styles.backButton, pressed && styles.pressed]} contentFit="contain" />
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
  plateOverlay: {
    ...StyleSheet.absoluteFillObject,
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
  entryPointGrid: {
    gap: 0,
  },
  entryPointColumnRow: {
    flexDirection: 'row',
  },
  entryPointColumn: {
    flex: 1,
    alignItems: 'center',
  },
  textRowStacked: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: Spacing.two,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  dualTextContainer: {
    gap: Spacing.two,
  },
  textInputWrapper: {
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  allergyChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  allergyChip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one + Spacing.half,
    borderRadius: Spacing.four,
  },
  allergyPickerOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    padding: Spacing.three,
  },
  allergyPickerPanel: {
    maxHeight: '70%',
    borderRadius: Spacing.four,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  allergyPickerHeaderEnd: {
    justifyContent: 'flex-end',
  },
  allergyPickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  allergyPickerContent: {
    gap: Spacing.four,
    paddingBottom: Spacing.three,
  },
  recipePickerRow: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.half,
    marginBottom: Spacing.two,
  },
  recipePickerTagWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  recipePickerTagChip: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Spacing.four,
    borderWidth: 1,
  },
  textInputWrapperStacked: {
    alignSelf: 'stretch',
  },
  moodChoiceButton: {
    width: '62%',
    alignSelf: 'center',
  },
  allergyAddButton: {
    width: '72%',
    alignSelf: 'center',
  },
  fridgeViewButton: {
    width: '58%',
    alignSelf: 'center',
  },
  ingredientsInputButton: {
    width: '108%',
    alignSelf: 'center',
  },
  inputPatch: {
    position: 'absolute',
    borderRadius: Spacing.two,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  textInput: {
    fontSize: 16,
  },
  textInputCentered: {
    textAlign: 'center',
  },
  sendButton: {
    height: BACK_BUTTON_HEIGHT,
    aspectRatio: OK_BUTTON_ASPECT_RATIO,
  },
  backButton: {
    height: BACK_BUTTON_HEIGHT,
    aspectRatio: BACK_BUTTON_ASPECT_RATIO,
  },
  choiceBackRow: {
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  ingredientsStep: {
    gap: Spacing.half,
  },
  moodButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
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
