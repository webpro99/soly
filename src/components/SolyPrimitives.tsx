import React, { PropsWithChildren, useEffect, useRef } from 'react';
import {
  Animated,
  Modal,
  Platform,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import type { Scene } from '../theme';
import { spacing, type } from '../theme';

type SceneProps = {
  scene: Scene;
};

export function SolyEyebrow({ children, scene }: PropsWithChildren<SceneProps>) {
  return <Text style={[styles.eyebrow, { color: scene.accentPrimary }]}>{children}</Text>;
}

export function SectionTitle({ title, subtitle, scene }: { title: string; subtitle?: string; scene: Scene }) {
  return (
    <View style={styles.sectionTitle}>
      <Text style={[styles.sectionHeading, { color: scene.textPrimary }]}>{title}</Text>
      {subtitle ? <Text style={[styles.sectionSubtitle, { color: scene.textMuted }]}>{subtitle}</Text> : null}
    </View>
  );
}

export function SurfaceCard({
  children,
  scene,
  style,
}: PropsWithChildren<SceneProps & { style?: StyleProp<ViewStyle> }>) {
  return (
    <View style={[styles.surfaceCard, { backgroundColor: scene.surface, borderColor: scene.border }, style]}>
      {children}
    </View>
  );
}

export function SolyBtnPrimary({
  label,
  scene,
  onPress,
}: {
  label: string;
  scene: Scene;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.82}
      onPress={onPress}
      style={[styles.primaryButton, { backgroundColor: scene.accentPrimary }]}
    >
      <Text style={[styles.primaryButtonText, { color: scene.bgDeep }]}>{label}</Text>
    </TouchableOpacity>
  );
}

export function SolyBtnDecline({
  label,
  scene,
  onPress,
}: {
  label: string;
  scene: Scene;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity activeOpacity={0.72} onPress={onPress} style={styles.declineButton}>
      <Text style={[styles.declineButtonText, { color: scene.textMuted }]}>{label}</Text>
    </TouchableOpacity>
  );
}

export function SolyDetailCard({
  label,
  value,
  scene,
}: {
  label: string;
  value: string;
  scene: Scene;
}) {
  return (
    <View style={[styles.detailRow, { borderBottomColor: scene.border }]}>
      <Text style={[styles.detailLabel, { color: scene.textMuted }]}>{label}</Text>
      <View style={[styles.detailDots, { borderBottomColor: scene.border }]} />
      <Text style={[styles.detailValue, { color: scene.textPrimary }]}>{value}</Text>
    </View>
  );
}

export function SolyReceiptTotal({
  label,
  value,
  scene,
}: {
  label: string;
  value: string;
  scene: Scene;
}) {
  return (
    <View style={[styles.receiptTotal, { borderColor: scene.accentPrimary }]}>
      <Text style={[styles.receiptLabel, { color: scene.textMuted }]}>{label}</Text>
      <Text style={[styles.receiptValue, { color: scene.accentPrimary }]}>{value}</Text>
    </View>
  );
}

export function ChatBubble({
  variant,
  children,
  scene,
}: PropsWithChildren<{ variant: 'me' | 'them' | 'soly'; scene: Scene }>) {
  const isMe = variant === 'me';
  const isSoly = variant === 'soly';

  return (
    <View
      style={[
        styles.bubble,
        {
          alignSelf: isMe ? 'flex-end' : 'flex-start',
          backgroundColor: isSoly ? 'rgba(207,160,85,0.13)' : isMe ? scene.accentPrimary : scene.surface,
          borderColor: isSoly ? scene.accentPrimary : scene.border,
        },
      ]}
    >
      <Text style={[styles.bubbleText, { color: isMe ? scene.bgDeep : scene.textPrimary }]}>{children}</Text>
    </View>
  );
}

export function MapPin({ scene, label, pulse = false }: { scene: Scene; label?: string; pulse?: boolean }) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (!pulse) return;
    const loop = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scale, { toValue: 1.9, duration: 1200, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1, duration: 0, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(opacity, { toValue: 0, duration: 1200, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.8, duration: 0, useNativeDriver: true }),
        ]),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity, pulse, scale]);

  return (
    <View style={styles.pinWrap}>
      {pulse ? (
        <Animated.View
          style={[
            styles.pinPulse,
            { borderColor: scene.accentPrimary, opacity, transform: [{ scale }] },
          ]}
        />
      ) : null}
      <View style={[styles.pin, { backgroundColor: scene.accentPrimary }]}>
        <Text style={[styles.pinText, { color: scene.bgDeep }]}>{label ?? ''}</Text>
      </View>
    </View>
  );
}

export function ToastNotification({
  visible,
  text,
  scene,
}: {
  visible: boolean;
  text: string;
  scene: Scene;
}) {
  const slide = useRef(new Animated.Value(-40)).current;

  useEffect(() => {
    Animated.spring(slide, {
      toValue: visible ? 0 : -40,
      damping: 18,
      stiffness: 160,
      useNativeDriver: true,
    }).start();
  }, [slide, visible]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.toast,
        {
          backgroundColor: scene.accentPrimary,
          transform: [{ translateY: slide }],
        },
      ]}
    >
      <Text style={[styles.toastText, { color: scene.bgDeep }]}>{text}</Text>
    </Animated.View>
  );
}

export function BottomSheet({
  visible,
  scene,
  title,
  onClose,
  children,
}: PropsWithChildren<{
  visible: boolean;
  scene: Scene;
  title: string;
  onClose: () => void;
}>) {
  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.sheetRoot}>
        <Pressable style={styles.sheetBackdrop} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: scene.bg, borderColor: scene.border }]}>
          <View style={[styles.handle, { backgroundColor: scene.border }]} />
          <Text style={[styles.sheetTitle, { color: scene.textPrimary }]}>{title}</Text>
          {children}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  eyebrow: {
    fontFamily: type.bodyBold,
    fontSize: 11,
    letterSpacing: 3.2,
    textTransform: 'uppercase',
  },
  sectionTitle: {
    gap: 4,
    marginBottom: spacing.md,
  },
  sectionHeading: {
    fontFamily: type.display,
    fontSize: 26,
    lineHeight: 31,
  },
  sectionSubtitle: {
    fontFamily: type.body,
    fontSize: 14,
    lineHeight: 20,
  },
  surfaceCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: spacing.md,
  },
  primaryButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingHorizontal: spacing.md,
  },
  primaryButtonText: {
    fontFamily: type.body,
    fontSize: 13,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  declineButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineButtonText: {
    fontFamily: type.display,
    fontSize: 16,
    fontStyle: 'italic',
  },
  detailRow: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
  },
  detailLabel: {
    fontFamily: type.bodyMedium,
    fontSize: 12,
    textTransform: 'uppercase',
  },
  detailDots: {
    flex: 1,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderStyle: 'dotted',
    marginBottom: 7,
  },
  detailValue: {
    maxWidth: '46%',
    fontFamily: type.body,
    fontSize: 14,
    textAlign: 'right',
  },
  receiptTotal: {
    borderRadius: 18,
    borderWidth: 1,
    padding: spacing.md,
    gap: 4,
  },
  receiptLabel: {
    fontFamily: type.bodyBold,
    fontSize: 12,
    textTransform: 'uppercase',
  },
  receiptValue: {
    fontFamily: type.serif,
    fontSize: 32,
  },
  bubble: {
    maxWidth: '88%',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  bubbleText: {
    fontFamily: type.body,
    fontSize: 14,
    lineHeight: 20,
  },
  pinWrap: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinPulse: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
  },
  pin: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinText: {
    fontFamily: type.body,
    fontSize: 9,
    fontWeight: '800',
  },
  toast: {
    position: 'absolute',
    zIndex: 20,
    top: 56,
    left: spacing.md,
    right: spacing.md,
    minHeight: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  toastText: {
    fontFamily: type.body,
    fontSize: 13,
    textAlign: 'center',
  },
  sheetRoot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: Platform.OS === 'web' ? 10 : 0,
    paddingBottom: Platform.OS === 'web' ? 10 : 0,
  },
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.48)',
  },
  sheet: {
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 410 : undefined,
    maxHeight: '86%',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderBottomLeftRadius: Platform.OS === 'web' ? 18 : 0,
    borderBottomRightRadius: Platform.OS === 'web' ? 18 : 0,
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.md,
    overflow: 'hidden',
  },
  handle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 2,
  },
  sheetTitle: {
    fontFamily: type.serif,
    fontSize: 26,
  },
});
