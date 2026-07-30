import { NineSliceImages, NineSliceInsets } from '@/components/ui/nine-slice-box';

export const BREAD_FRAME_IMAGES: NineSliceImages = {
  topLeft: require('@/assets/images/ui/bread-frame/top-left.png'),
  top: require('@/assets/images/ui/bread-frame/top.png'),
  topRight: require('@/assets/images/ui/bread-frame/top-right.png'),
  left: require('@/assets/images/ui/bread-frame/left.png'),
  center: require('@/assets/images/ui/bread-frame/center.png'),
  right: require('@/assets/images/ui/bread-frame/right.png'),
  bottomLeft: require('@/assets/images/ui/bread-frame/bottom-left.png'),
  bottom: require('@/assets/images/ui/bread-frame/bottom.png'),
  bottomRight: require('@/assets/images/ui/bread-frame/bottom-right.png'),
};

// Source art is a square-cut (kaku-gata) loaf, 853x1844 at roughly 3x scale;
// insets below are in dp. The top slice bakes in extra cream margin on
// purpose (not just the bare crust) so short bubbles get breathing room
// without ever squishing the crust texture; the bottom is cropped thin.
export const BREAD_FRAME_INSETS: NineSliceInsets = {
  left: 12,
  top: 54,
  right: 12,
  bottom: 8,
};
