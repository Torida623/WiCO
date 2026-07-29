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

// Source art is 853x1844 at roughly 3x scale; insets below are in dp.
export const BREAD_FRAME_INSETS: NineSliceInsets = {
  left: 34,
  top: 134,
  right: 34,
  bottom: 50,
};
