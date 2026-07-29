import { Image, ImageSource } from 'expo-image';
import { ReactNode } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

export type NineSliceImages = {
  topLeft: ImageSource;
  top: ImageSource;
  topRight: ImageSource;
  left: ImageSource;
  center: ImageSource;
  right: ImageSource;
  bottomLeft: ImageSource;
  bottom: ImageSource;
  bottomRight: ImageSource;
};

export type NineSliceInsets = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

export type NineSliceBoxProps = {
  images: NineSliceImages;
  insets: NineSliceInsets;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

export function NineSliceBox({ images, insets, style, contentStyle, children }: NineSliceBoxProps) {
  return (
    <View style={[styles.container, style]}>
      <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
        <View style={{ flexDirection: 'row', height: insets.top }}>
          <Image source={images.topLeft} style={{ width: insets.left, height: insets.top }} contentFit="fill" />
          <Image source={images.top} style={{ flex: 1, height: insets.top }} contentFit="fill" />
          <Image source={images.topRight} style={{ width: insets.right, height: insets.top }} contentFit="fill" />
        </View>
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <Image source={images.left} style={{ width: insets.left, height: '100%' }} contentFit="fill" />
          <Image source={images.center} style={{ flex: 1, height: '100%' }} contentFit="fill" />
          <Image source={images.right} style={{ width: insets.right, height: '100%' }} contentFit="fill" />
        </View>
        <View style={{ flexDirection: 'row', height: insets.bottom }}>
          <Image source={images.bottomLeft} style={{ width: insets.left, height: insets.bottom }} contentFit="fill" />
          <Image source={images.bottom} style={{ flex: 1, height: insets.bottom }} contentFit="fill" />
          <Image
            source={images.bottomRight}
            style={{ width: insets.right, height: insets.bottom }}
            contentFit="fill"
          />
        </View>
      </View>
      <View
        style={[
          {
            paddingLeft: insets.left,
            paddingRight: insets.right,
            paddingTop: insets.top,
            paddingBottom: insets.bottom,
          },
          contentStyle,
        ]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
});
