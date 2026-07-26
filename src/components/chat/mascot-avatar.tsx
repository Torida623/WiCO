import { Image } from 'expo-image';
import { ImageStyle, StyleProp } from 'react-native';

export type MascotPose = 'neutral' | 'idea' | 'eating';

const MASCOT_SOURCES: Record<MascotPose, number> = {
  neutral: require('@/assets/images/mascot/wikokko-neutral.png'),
  idea: require('@/assets/images/mascot/wikokko-idea.png'),
  eating: require('@/assets/images/mascot/wikokko-eating.png'),
};

export type MascotAvatarProps = {
  pose?: MascotPose;
  size?: number;
  style?: StyleProp<ImageStyle>;
};

export function MascotAvatar({ pose = 'neutral', size = 36, style }: MascotAvatarProps) {
  return (
    <Image
      source={MASCOT_SOURCES[pose]}
      style={[{ width: size, height: size }, style]}
      contentFit="contain"
      transition={350}
    />
  );
}
